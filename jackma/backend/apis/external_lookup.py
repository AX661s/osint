"""
External Lookup API integration
替换 Investigate API：调用外部查询服务并规范化返回结构。
"""
import httpx
import logging
from typing import Dict, Any, List
from datetime import datetime
from .config import DEFAULT_TIMEOUT

logger = logging.getLogger(__name__)

BASE_URL = "http://47.253.238.111:8090"


def convert_consolidated_to_processed(consolidated_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    将 consolidated 格式转换为前端 InvestigateResume 期望的 processed 格式
    
    Args:
        consolidated_data: API返回的 consolidated 格式数据
        
    Returns:
        processed 格式的数据
    """
    try:
        consolidated = consolidated_data.get('consolidated', {})
        primary_info = consolidated_data.get('primary', {})
        
        # 提取姓名
        names = consolidated.get('names', {})
        full_names = names.get('full_names', [])
        primary_name = full_names[0] if full_names else primary_info.get('caller_id_name', '')
        
        # 提取联系方式
        contact = consolidated.get('contact', {})
        phones_list = contact.get('phones', [])
        emails_list = contact.get('emails', [])
        
        # 转换电话格式
        phones = []
        for phone in phones_list[:20]:  # 最多20个
            phones.append({
                'number': phone,
                'display': phone,
                'type': 'mobile',
                'carrier': primary_info.get('carrier', ''),
                'location': f"{primary_info.get('city', '')}, {primary_info.get('state', '')}".strip(', '),
                'confidence': 0.8
            })
        
        # 转换邮箱格式
        emails = []
        for email in emails_list[:25]:  # 最多25个
            emails.append({
                'address': email,
                'normalized': email.lower(),
                'type': 'personal',
                'confidence': 0.8
            })
        
        # 提取地址
        address_data = consolidated.get('address', {})
        addresses = []
        seen_addresses = set()
        for addr in address_data.get('addresses', [])[:15]:  # 最多15个
            addr_str = addr.get('address', '')
            city = addr.get('city', '')
            state = addr.get('state', '')
            postcode = addr.get('postcode', '')
            
            # 去重
            key = f"{addr_str}|{city}|{postcode}".lower()
            if key in seen_addresses or not (addr_str or city):
                continue
            seen_addresses.add(key)
            
            addresses.append({
                'address': addr_str,
                'street': addr_str,
                'city': city,
                'state': state,
                'postal_code': postcode,
                'postalCode': postcode,
                'confidence': 0.7
            })
        
        # 提取就业信息
        employment_data = consolidated.get('employment', {})
        employment = []
        for record in employment_data.get('records', [])[:15]:  # 最多15个
            company = record.get('company', '')
            title = record.get('title', '')
            if company or title:
                employment.append({
                    'company': company or 'Unknown',
                    'title': title or 'Unknown',
                    'startDate': record.get('start_date', ''),
                    'start_date': record.get('start_date', ''),
                    'location': record.get('region', ''),
                    'confidence': 0.7
                })
        
        # 提取教育信息
        education = []  # 当前API没有教育数据
        
        # 提取人口统计信息
        demographics = consolidated.get('demographics', {})
        genders = demographics.get('genders', [])
        birth_dates = demographics.get('birth_dates', [])
        birth_years = demographics.get('birth_years', [])
        
        gender = ''
        if genders and genders[0] not in ['NULL', 'null', None, 'U']:
            gender_code = str(genders[0]).upper()
            if gender_code == 'M':
                gender = 'MALE'
            elif gender_code == 'F':
                gender = 'FEMALE'
        
        # 计算年龄
        age = 0
        birthdate = ''
        if birth_dates and birth_dates[0] not in ['null', 'NULL', None, 'L']:
            birthdate = str(birth_dates[0])
            try:
                # 尝试解析日期格式 MM/DD/YYYY
                if '/' in birthdate:
                    parts = birthdate.split('/')
                    if len(parts) == 3:
                        birth_year = int(parts[2])
                        current_year = datetime.now().year
                        age = current_year - birth_year
            except:
                pass
        
        if age == 0 and birth_years and birth_years[0]:
            try:
                birth_year = int(birth_years[0])
                current_year = datetime.now().year
                age = current_year - birth_year
            except:
                pass
        
        # 提取亲属
        relatives_list = consolidated.get('relatives', [])
        relatives = []
        seen_relatives = set()
        for rel_str in relatives_list[:20]:  # 最多20个
            # 解析格式: "NAME SSN"
            parts = str(rel_str).rsplit(' ', 1)
            name = parts[0].strip() if parts else rel_str
            
            if name.lower() in seen_relatives or not name:
                continue
            seen_relatives.add(name.lower())
            
            relatives.append({
                'name': name,
                'relationship': 'unknown',
                'confidence': 0.6
            })
        
        # 提取选民记录
        voter_data = consolidated.get('voter', {})
        voter_records = voter_data.get('records', [])
        
        # 提取财务信息
        financial = consolidated.get('financial', {})
        property_data = consolidated.get('property', {})
        
        # 提取地理位置
        location_data = consolidated.get('location', {})
        coordinates = location_data.get('coordinates', [])
        
        geolocation = {}
        if coordinates and len(coordinates) > 0:
            coord = coordinates[0]
            geolocation = {
                'latitude': coord.get('lat'),
                'longitude': coord.get('lon'),
                'metro_area': f"{primary_info.get('city', '')}, {primary_info.get('state', '')}".strip(', '),
                'region': primary_info.get('state', ''),
                'timezone': primary_info.get('time_zone', '')
            }
        else:
            geolocation = {
                'metro_area': f"{primary_info.get('city', '')}, {primary_info.get('state', '')}".strip(', '),
                'region': primary_info.get('state', ''),
                'timezone': primary_info.get('time_zone', '')
            }
        
        # 构建 processed 数据结构
        processed = {
            'meta': {
                'investigation_id': '',
                'phone_number': consolidated_data.get('query_phone', ''),
                'status': 'completed',
                'duration': 0,
                'dataSourcesCount': len(consolidated_data.get('sources', {}).keys()) if 'sources' in consolidated_data else 0,
                'data_sources_count': len(consolidated_data.get('sources', {}).keys()) if 'sources' in consolidated_data else 0,
                'start_time': '',
                'end_time': ''
            },
            'identity': {
                'primary_name': primary_name,
                'name_variants': full_names[1:] if len(full_names) > 1 else [],
                'name_count': len(full_names),
                'gender': gender,
                'age': age,
                'birthdate': birthdate,
                'languages': []
            },
            'contacts': {
                'phones': {
                    'all': phones,
                    'total': len(phones),
                    'primary': phones[0] if phones else None
                },
                'emails': {
                    'all': emails,
                    'total': len(emails),
                    'primary': emails[0] if emails else None
                }
            },
            'professional': {
                'employment': employment,
                'education': education,
                'total_companies': len(set(e['company'] for e in employment if e.get('company'))),
                'total_positions': len(employment)
            },
            'social': {
                'platforms': [],
                'total_platforms': 0,
                'total_accounts': 0
            },
            'geographic': {
                'addresses': addresses,
                'total_addresses': len(addresses),
                'current_address': addresses[0] if addresses else None,
                'geolocation': geolocation
            },
            'network': {
                'relatives': relatives,
                'total_relatives': len(relatives),
                'associates': [],
                'household_members': []
            },
            'financial': {
                'properties': [],
                'total_properties': 0,
                'bank_affiliations': financial.get('bank_names', []),
                'income_bracket': ', '.join(financial.get('income_codes', []))
            },
            'security': {
                'leaked_credentials': {
                    'total': 0,
                    'sources': []
                }
            },
            'quality': {
                'overall_confidence': 0.75,
                'lastUpdated': datetime.now().strftime('%Y-%m-%d')
            }
        }
        
        logger.info(f"✅ [External Lookup] 数据转换完成: {primary_name}, {len(phones)}个电话, {len(emails)}个邮箱, {len(addresses)}个地址")
        
        return processed
        
    except Exception as e:
        logger.error(f"❌ [External Lookup] 数据转换失败: {str(e)}")
        return None


async def query_external_lookup(phone: str, mode: str = "medium", timeout: int = DEFAULT_TIMEOUT) -> Dict[str, Any]:
    """
    调用外部 Lookup 服务获取号码相关信息

    Args:
        phone: 电话号码（支持带符号，内部会规范化为数字）
        mode: 查询模式（默认 medium）
        timeout: 超时时间（秒）

    Returns:
        Dict: { success, data, source, error }
    """
    try:
        digits = ''.join(ch for ch in (phone or '') if ch.isdigit())
        if not digits:
            return {"success": False, "error": "invalid phone", "source": "external_lookup"}

        url = f"{BASE_URL}/lookup/{digits}"
        params = {"mode": mode}

        logger.info(f"🔍 [External Lookup] GET {url} mode={mode}")
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.get(url, params=params)
            if resp.status_code == 200:
                payload = resp.json() if "application/json" in resp.headers.get("Content-Type", "") else {"raw": resp.text}
                
                # 转换数据格式为前端期望的 processed 格式
                processed_data = convert_consolidated_to_processed(payload)
                
                if processed_data:
                    # 同时提供两种格式：
                    # 1. processed 格式（用于 InvestigateResume）
                    # 2. 原始 payload 格式（用于 ExternalLookupResume，包含 consolidated 等字段）
                    
                    # 确保 consolidated 字段存在
                    consolidated = payload.get('consolidated', {})
                    
                    normalized = {
                        "module": "external_lookup",
                        "platform_name": "External Lookup",
                        "data": {
                            "processed": processed_data,  # InvestigateResume 使用
                            "consolidated": consolidated,  # ExternalLookupResume 需要这个！
                            **payload  # 保留所有原始字段（primary, sources, filters等）
                        },
                    }
                    logger.info(f"✅ [External Lookup] 查询成功并转换数据格式，consolidated字段: {bool(consolidated)}")
                    return {"success": True, "data": normalized, "source": "external_lookup"}
                else:
                    # 转换失败，返回原始数据
                    logger.warning(f"⚠️ [External Lookup] 数据转换失败，返回原始数据")
                    normalized = {
                        "module": "external_lookup",
                        "platform_name": "External Lookup",
                        "data": payload,
                    }
                    return {"success": True, "data": normalized, "source": "external_lookup"}

            return {"success": False, "error": f"Status {resp.status_code}", "source": "external_lookup"}
    except Exception as e:
        logger.error(f"❌ [External Lookup] 异常: {e}")
        return {"success": False, "error": str(e), "source": "external_lookup"}


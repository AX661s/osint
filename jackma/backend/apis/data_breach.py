

"""
Data Breach API (Proxy endpoint - check_leaked)
数据泄露检测 - 检查电话号码/邮箱是否在已知数据泄露中
"""
import httpx
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

# 代理API端点
PROXY_API_URL = "http://47.253.47.192:8888"


async def query_data_breach(query: str, timeout: int = 120) -> Dict[str, Any]:
    """
    Data Breach API: Check for data leaks using proxy endpoint
    检查电话号码或邮箱是否在已知数据泄露中
    
    Args:
        query: 电话号码或邮箱地址
        timeout: 超时时间（秒，默认120秒）
        
    Returns:
        Dict包含:
        - success: bool - 查询是否成功
        - data: list - 泄露记录列表（每个数据库一个卡片）
        - source: str - 数据来源标识
        - total_entries: int - 总泄露记录数
        - databases: list - 涉及的数据库列表
        - error: str - 错误信息（如果失败）
    """
    try:
        # 规范化查询字符串 - 保持 +1 4126704024 格式（中间有空格）
        clean_query = query.strip()
        phone_digits = clean_query.replace('+', '').replace(' ', '').replace('-', '')
        
        # 如果是11位数字且以1开头（美国号码），格式化为 +1 XXXXXXXXXX
        if len(phone_digits) == 11 and phone_digits.startswith('1'):
            formatted_phone = f"+1 {phone_digits[1:]}"  # +1 空格 10位数字
        elif len(phone_digits) == 10:
            formatted_phone = f"+1 {phone_digits}"  # +1 空格 10位数字
        else:
            formatted_phone = phone_digits  # 其他格式保持原样
        
        # 使用代理API端点 - URL编码空格为%20
        url = f"{PROXY_API_URL}/check-leaked/{formatted_phone.replace(' ', '%20')}?entry_type=phone"
        
        logger.info(f"🔍 [DataBreach] Checking leaks for {formatted_phone} via proxy")
        
        # 使用httpx访问代理端点
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(url, follow_redirects=True)
        
        
        if response.status_code == 200:
            data = response.json()
            result = data.get('result', {})
            entries = result.get('entries', [])
            
            
            if not entries:
                logger.info(f"✅ [DataBreach] No leaks found for {formatted_phone}")
                return {
                    "success": True,
                    "data": [],
                    "source": "data_breach",
                    "total_entries": 0,
                    "databases": [],
                    "message": "未发现数据泄露记录"
                }
            
            # 按数据库分组 - 每个数据库一个卡片
            databases_map = {}
            
            for item in entries:
                entry = item.get('entry', {})
                db_name = entry.get('database_name') or entry.get('obtained_from', 'Unknown')
                
                if db_name not in databases_map:
                    databases_map[db_name] = {
                        'entries': [],
                        'breach_date': None,
                        'data_classes': [],
                        'sources': [],
                        'domain': None,
                        'category': None,
                        'total_entries_in_breach': None
                    }
                
                # 添加条目
                databases_map[db_name]['entries'].append(entry)
                
                # 提取源信息
                if entry.get('source'):
                    source_info = entry['source']
                    if not databases_map[db_name]['breach_date']:
                        databases_map[db_name]['breach_date'] = source_info.get('BreachDate')
                    if not databases_map[db_name]['data_classes']:
                        databases_map[db_name]['data_classes'] = source_info.get('DataClasses', [])
                    if not databases_map[db_name]['sources']:
                        databases_map[db_name]['sources'] = source_info.get('Sources', [])
                    if not databases_map[db_name]['domain']:
                        databases_map[db_name]['domain'] = source_info.get('Domain')
                    
                    extra = source_info.get('extra', {})
                    if extra:
                        if not databases_map[db_name]['category']:
                            databases_map[db_name]['category'] = extra.get('Category')
                        if not databases_map[db_name]['total_entries_in_breach']:
                            databases_map[db_name]['total_entries_in_breach'] = extra.get('Entries')
            
            # 为每个数据库创建一个独立的卡片
            breach_platforms = []
            for db_name, db_data in databases_map.items():
                # 合并该数据库的所有条目数据
                merged_entry = {
                    'email': None,
                    'name': None,
                    'phone': None,
                    'address': [],
                    'username': None,
                    'ip_address': [],
                    'license_plates': [],
                    'dob': None,
                    'passwords': []
                }
                
                for entry in db_data['entries']:
                    if entry.get('email') and not merged_entry['email']:
                        merged_entry['email'] = entry['email']
                    if entry.get('name') and not merged_entry['name']:
                        merged_entry['name'] = entry['name']
                    if entry.get('phone') and not merged_entry['phone']:
                        merged_entry['phone'] = entry['phone']
                    if entry.get('address'):
                        addr = entry['address']
                        if addr not in merged_entry['address']:
                            merged_entry['address'].append(addr)
                    if entry.get('username') and not merged_entry['username']:
                        merged_entry['username'] = entry['username']
                    if entry.get('ip_address'):
                        ip = entry['ip_address']
                        if ip not in merged_entry['ip_address']:
                            merged_entry['ip_address'].append(ip)
                    if entry.get('license_plate'):
                        plates = entry['license_plate'].split('\n')
                        for plate in plates:
                            plate = plate.strip()
                            if plate and plate not in merged_entry['license_plates']:
                                merged_entry['license_plates'].append(plate)
                    if entry.get('dob') and not merged_entry['dob']:
                        merged_entry['dob'] = entry['dob']
                    if entry.get('hashed_password'):
                        pwd = entry['hashed_password']
                        if pwd not in merged_entry['passwords']:
                            merged_entry['passwords'].append(pwd)
                
                # 创建独立的数据库卡片
                platform = {
                    'module': db_name,
                    'platform_name': db_name,
                    'source': 'data_breach',
                    'status': 'found',
                    'platform_type': 'data_breach',
                    'database_name': db_name,
                    'breach_date': db_data['breach_date'],
                    'data_classes': db_data['data_classes'],
                    'sources': db_data['sources'],
                    'domain': db_data['domain'],
                    'category': db_data['category'],
                    'total_entries_in_breach': db_data['total_entries_in_breach'],
                    'entry_count': len(db_data['entries']),
                    'data': merged_entry
                }
                
                breach_platforms.append(platform)
            
            logger.info(f"✅ [DataBreach] Found {len(breach_platforms)} databases with leaks")
            
            return {
                "success": True,
                "data": breach_platforms,
                "source": "data_breach",
                "total_entries": len(entries),
                "databases": list(databases_map.keys()),
                "results": result.get('results', 0),
                "pages": result.get('pages', 1)
            }
        
        elif response.status_code == 404:
            logger.info(f"✅ [DataBreach] No leaks found (404) for {clean_query}")
            return {
                "success": True,
                "data": [],
                "source": "data_breach",
                "total_entries": 0,
                "databases": [],
                "message": "未发现数据泄露记录"
            }
        else:
            error_msg = f"HTTP {response.status_code}"
            logger.warning(f"⚠️ [DataBreach] {error_msg}")
            return {
                "success": False,
                "error": error_msg,
                "source": "data_breach",
                "status_code": response.status_code
            }
    
    except httpx.ReadTimeout:
        logger.error(f"❌ [DataBreach] Timeout")
        return {
            "success": False,
            "error": "Request timeout",
            "source": "data_breach"
        }
    except Exception as e:
        logger.error(f"❌ [DataBreach] Exception: {e}")
        return {
            "success": False,
            "error": str(e),
            "source": "data_breach"
        }

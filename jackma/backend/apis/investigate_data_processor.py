"""
Investigate API 后端数据处理器
在服务器端处理海量数据，减轻前端负担
"""
import logging
from typing import Dict, Any, List, Set
from collections import defaultdict

logger = logging.getLogger(__name__)


class InvestigateDataProcessor:
    """
    Investigate API 数据处理器
    负责数据清洗、去重、合并和优化
    """
    
    def __init__(self, raw_data: Dict[str, Any]):
        self.raw_data = raw_data
        self.processed_data = None
    
    def process(self) -> Dict[str, Any]:
        """
        执行完整的数据处理流程
        """
        if not self.raw_data or 'data' not in self.raw_data:
            logger.error("❌ [DataProcessor] Invalid raw data")
            return None
        
        data = self.raw_data['data']
        
        # 防御性类型检查：某些响应会以字符串占位，需转为空结构
        person_profile = data.get('person_profile', {})
        if not isinstance(person_profile, dict):
            logger.warning(f"⚠️ [DataProcessor] person_profile 非 dict 类型: {type(person_profile).__name__}，将使用空对象")
            person_profile = {}
        
        # 如果person_profile为空，尝试从processed字段获取
        if not person_profile or len(person_profile) == 0:
            processed = data.get('processed', {})
            if isinstance(processed, dict) and processed.get('identity'):
                logger.info(f"ℹ️ [DataProcessor] 使用processed数据构建person_profile")
                # 从processed重建person_profile
                person_profile = {
                    'primary_name': processed.get('identity', {}).get('primary_name', ''),
                    'name_variants': processed.get('identity', {}).get('name_variants', []),
                    'gender': processed.get('identity', {}).get('gender', ''),
                    'age': processed.get('identity', {}).get('age', 0),
                    'birthdate': processed.get('identity', {}).get('birthdate', ''),
                    'phones': processed.get('contacts', {}).get('phones', {}).get('all', []),
                    'emails': processed.get('contacts', {}).get('emails', {}).get('all', []),
                    'addresses': processed.get('geographic', {}).get('addresses', []),
                    'employment': processed.get('professional', {}).get('employment', []),
                    'education': processed.get('professional', {}).get('education', []),
                    'relatives': processed.get('network', {}).get('relatives', []),
                    'property_records': processed.get('financial', {}).get('properties', []),
                    'geolocation': processed.get('geographic', {}).get('geolocation', {}),
                    'account_registrations': [],
                    'sources': [],
                    'confidence_score': processed.get('quality', {}).get('overall_confidence', 0)
                }
        
        logger.info(f"🔄 [DataProcessor] 开始处理数据...")
        
        self.processed_data = {
            # 元数据
            'meta': self._extract_metadata(data),
            
            # 核心身份（去重姓名）
            'identity': self._process_identity(person_profile),
            
            # 联系方式（深度去重）
            'contacts': self._process_contacts(person_profile),
            
            # 职业信息（合并同公司）
            'professional': self._process_professional(person_profile),
            
            # 社交媒体（智能分组）
            'social': self._process_social(person_profile),
            
            # 地理信息（合并地址）
            'geographic': self._process_geographic(person_profile),
            
            # 关系网络（去重）
            'network': self._process_network(person_profile),
            
            # 财务信息（去重房产）
            'financial': self._process_financial(person_profile),
            
            # 安全信息（分组泄露）
            'security': self._process_security(person_profile),
            
            # 数据质量
            'quality': self._calculate_quality(person_profile)
        }
        
        # 计算处理统计
        stats = self._calculate_stats()
        logger.info(f"✅ [DataProcessor] 处理完成: {stats}")
        
        return self.processed_data
    
    def _extract_metadata(self, data: Dict) -> Dict:
        """提取元数据"""
        return {
            'investigation_id': data.get('investigation_id', ''),
            'phone_number': data.get('phone_number', ''),
            'status': data.get('status', 'unknown'),
            'duration': data.get('duration_seconds', 0),
            'data_sources_count': data.get('data_sources_count', 0),
            'start_time': data.get('start_time', ''),
            'end_time': data.get('end_time', '')
        }
    
    def _process_identity(self, profile: Dict) -> Dict:
        """处理身份信息 - 去重姓名变体"""
        name_variants = profile.get('name_variants', [])
        unique_names = list(set(name_variants))  # 去重
        
        return {
            'primary_name': profile.get('primary_name', ''),
            'name_variants': unique_names,
            'name_count': len(unique_names),
            'gender': profile.get('gender', ''),
            'age': profile.get('age', 0),
            'birthdate': profile.get('birthdate', ''),
            'title_prefix': profile.get('title_prefix', ''),
            'middle_name': profile.get('middle_name', ''),
            'ethnicity': profile.get('ethnicity', ''),
            'religion': profile.get('religion', ''),
            'languages': list(set(profile.get('languages', []))),  # 去重语言
            'confidence_score': profile.get('confidence_score', 0)
        }
    
    def _process_contacts(self, profile: Dict) -> Dict:
        """处理联系方式 - 深度去重和合并"""
        phones = profile.get('phones', [])
        emails = profile.get('emails', [])
        
        # 电话去重和合并
        phone_map = {}
        for phone in phones:
            key = phone.get('number_e164')
            if not key:
                continue
            
            if key not in phone_map:
                phone_map[key] = {
                    'number': key,
                    'display': phone.get('display', key),
                    'type': phone.get('type', 'unknown'),
                    'carrier': phone.get('carrier', 'Unknown'),
                    'location': phone.get('location', ''),
                    'confidence': phone.get('confidence', 0),
                    'sources': set(phone.get('source', [])),
                    'last_seen': phone.get('last_seen')
                }
            else:
                # 合并来源
                existing = phone_map[key]
                existing['sources'].update(phone.get('source', []))
                # 更新置信度（取最高值）
                existing['confidence'] = max(existing['confidence'], phone.get('confidence', 0))
        
        # 转换为列表并排序
        processed_phones = [
            {**p, 'sources': list(p['sources']), 'sources_count': len(p['sources'])}
            for p in phone_map.values()
        ]
        processed_phones.sort(key=lambda x: x['confidence'], reverse=True)
        
        # 邮箱去重和合并
        email_map = {}
        for email in emails:
            key = (email.get('normalized') or email.get('address', '')).lower()
            if not key:
                continue
            
            if key not in email_map:
                email_map[key] = {
                    'address': email.get('address'),
                    'normalized': email.get('normalized', email.get('address')),
                    'type': email.get('type', 'unknown'),
                    'domain': email.get('domain', ''),
                    'confidence': email.get('confidence', 0),
                    'sources': set(email.get('source', [])),
                    'last_seen': email.get('last_seen')
                }
            else:
                # 合并来源
                existing = email_map[key]
                existing['sources'].update(email.get('source', []))
                existing['confidence'] = max(existing['confidence'], email.get('confidence', 0))
        
        # 转换为列表并排序
        processed_emails = [
            {**e, 'sources': list(e['sources']), 'sources_count': len(e['sources'])}
            for e in email_map.values()
        ]
        processed_emails.sort(key=lambda x: x['confidence'], reverse=True)
        
        return {
            'phones': {
                'all': processed_phones[:20],  # 只保留前20个
                'high_confidence': [p for p in processed_phones if p['confidence'] >= 0.8][:10],
                'total': len(processed_phones),
                'primary': processed_phones[0] if processed_phones else None
            },
            'emails': {
                'all': processed_emails[:25],  # 只保留前25个
                'high_confidence': [e for e in processed_emails if e['confidence'] >= 0.8][:15],
                'total': len(processed_emails),
                'primary': processed_emails[0] if processed_emails else None
            }
        }
    
    def _process_professional(self, profile: Dict) -> Dict:
        """处理职业信息 - 按公司合并"""
        employment = profile.get('employment', [])
        education = profile.get('education', [])
        
        # 按公司分组
        company_map = defaultdict(list)
        for job in employment:
            company = job.get('company', 'Unknown')
            company_map[company].append(job)
        
        # 合并同公司职位
        consolidated = []
        for company, jobs in company_map.items():
            # 按开始日期排序
            jobs.sort(key=lambda j: j.get('start_date', '0000-00-00'), reverse=True)
            
            consolidated.append({
                'company': company,
                'positions': [
                    {
                        'title': j.get('title', 'Unknown'),
                        'start_date': j.get('start_date', ''),
                        'end_date': j.get('end_date', ''),
                        'location': j.get('location', ''),
                        'confidence': j.get('confidence', 0),
                        'source': j.get('source', '')
                    }
                    for j in jobs[:3]  # 每个公司最多3个职位
                ],
                'total_positions': len(jobs),
                'latest_position': jobs[0].get('title', '') if jobs else '',
                'confidence': max([j.get('confidence', 0) for j in jobs], default=0)
            })
        
        # 按置信度排序
        consolidated.sort(key=lambda x: x['confidence'], reverse=True)
        
        return {
            'employment': consolidated[:15],  # 最多15个公司
            'education': education[:10],
            'income_bracket': profile.get('income_bracket', ''),
            'total_companies': len(consolidated),
            'total_positions': len(employment)
        }
    
    def _process_social(self, profile: Dict) -> Dict:
        """处理社交媒体 - 智能分组"""
        registrations = profile.get('account_registrations', [])
        
        # 按平台分组
        platform_map = defaultdict(lambda: {
            'accounts': [],
            'emails': set(),
            'registration_dates': []
        })
        
        for account in registrations:
            platform = account.get('platform')
            if not platform:
                continue
            
            platform_data = platform_map[platform]
            platform_data['accounts'].append(account)
            if account.get('email'):
                platform_data['emails'].add(account['email'])
            if account.get('registration_date'):
                platform_data['registration_dates'].append(account['registration_date'])
        
        # 转换为列表
        platforms = []
        for platform_name, data in platform_map.items():
            platforms.append({
                'platform': platform_name,
                'account_count': len(data['accounts']),
                'unique_emails': list(data['emails']),
                'email_count': len(data['emails']),
                'earliest_registration': sorted(data['registration_dates'])[0] if data['registration_dates'] else '',
                'accounts': data['accounts'][:3]  # 每个平台最多3个账户详情
            })
        
        # 按账户数量排序
        platforms.sort(key=lambda x: x['account_count'], reverse=True)
        
        return {
            'platforms': platforms[:30],  # 最多30个平台
            'total_platforms': len(platforms),
            'total_accounts': len(registrations)
        }
    
    def _process_geographic(self, profile: Dict) -> Dict:
        """处理地理信息 - 合并地址"""
        addresses = profile.get('addresses', [])
        geolocation = profile.get('geolocation', {})
        
        # 地址去重
        address_map = {}
        for addr in addresses:
            # 创建唯一键
            key = '|'.join([
                (addr.get('street') or '').lower().strip(),
                (addr.get('city') or '').lower().strip(),
                (addr.get('postal_code') or '').lower().strip()
            ])
            
            if not key or key == '||':
                continue
            
            if key not in address_map:
                address_map[key] = {
                    'street': addr.get('street', ''),
                    'city': addr.get('city', ''),
                    'state': addr.get('state', ''),
                    'postal_code': addr.get('postal_code', ''),
                    'country': addr.get('country', 'US'),
                    'role': addr.get('role', 'unknown'),
                    'confidence': addr.get('confidence', 0),
                    'sources': set(addr.get('source', [])),
                    'geolocation': addr.get('geolocation')
                }
            else:
                # 合并来源
                existing = address_map[key]
                existing['sources'].update(addr.get('source', []))
                existing['confidence'] = max(existing['confidence'], addr.get('confidence', 0))
        
        # 转换为列表并排序
        processed_addresses = [
            {**a, 'sources': list(a['sources']), 'sources_count': len(a['sources'])}
            for a in address_map.values()
        ]
        processed_addresses.sort(key=lambda x: x['confidence'], reverse=True)
        
        return {
            'addresses': processed_addresses[:15],  # 最多15个地址
            'total_addresses': len(processed_addresses),
            'current_address': processed_addresses[0] if processed_addresses else None,
            'geolocation': {
                'latitude': geolocation.get('latitude'),
                'longitude': geolocation.get('longitude'),
                'metro_area': geolocation.get('metro_area', ''),
                'region': geolocation.get('region', ''),
                'timezone': geolocation.get('timezone', ''),
                'precision': geolocation.get('precision', ''),
                'sources_count': geolocation.get('sources_count', 0)
            }
        }
    
    def _process_network(self, profile: Dict) -> Dict:
        """处理关系网络 - 去重亲属"""
        relatives = profile.get('relatives', [])
        
        # 亲属去重（基于姓名）
        relatives_map = {}
        for rel in relatives:
            name = (rel.get('name') or '').strip()
            if not name:
                continue
            
            if name not in relatives_map:
                relatives_map[name] = {
                    'name': name,
                    'relationship': rel.get('relationship', 'unknown'),
                    'confidence': rel.get('confidence', 0),
                    'sources': set(rel.get('sources', []))
                }
            else:
                # 合并来源
                existing = relatives_map[name]
                existing['sources'].update(rel.get('sources', []))
                existing['confidence'] = max(existing['confidence'], rel.get('confidence', 0))
        
        # 转换为列表并排序
        processed_relatives = [
            {**r, 'sources': list(r['sources']), 'sources_count': len(r['sources'])}
            for r in relatives_map.values()
        ]
        processed_relatives.sort(key=lambda x: x['confidence'], reverse=True)
        
        return {
            'relatives': processed_relatives[:20],  # 最多20个亲属
            'total_relatives': len(processed_relatives),
            'associates': profile.get('associates', [])[:10],
            'household_members': profile.get('household_members', [])[:10]
        }
    
    def _process_financial(self, profile: Dict) -> Dict:
        """处理财务信息 - 去重房产"""
        properties = profile.get('property_records', [])
        
        # 房产去重
        property_map = {}
        for prop in properties:
            key = f"{prop.get('address', '')}_{prop.get('city', '')}_{prop.get('postal_code', '')}".lower()
            if not key or key == '__':
                continue
            
            if key not in property_map:
                property_map[key] = {
                    'address': prop.get('address', ''),
                    'city': prop.get('city', ''),
                    'state': prop.get('state', ''),
                    'postal_code': prop.get('postal_code', ''),
                    'purchase_year': prop.get('purchase_year'),
                    'built_year': prop.get('built_year'),
                    'estimated_value': prop.get('estimated_value', ''),
                    'bedrooms': prop.get('bedrooms', 0),
                    'bathrooms': prop.get('bathrooms', 0),
                    'square_feet': prop.get('square_feet', 0),
                    'property_type': prop.get('property_type', ''),
                    'sources': set(prop.get('sources', [])),
                    'confidence': prop.get('confidence', 0)
                }
            else:
                # 合并来源
                existing = property_map[key]
                existing['sources'].update(prop.get('sources', []))
                existing['confidence'] = max(existing['confidence'], prop.get('confidence', 0))
        
        # 转换为列表并排序
        processed_properties = [
            {**p, 'sources': list(p['sources']), 'sources_count': len(p['sources'])}
            for p in property_map.values()
        ]
        processed_properties.sort(key=lambda x: x.get('purchase_year') or 0, reverse=True)
        
        return {
            'properties': processed_properties[:15],  # 最多15个房产
            'total_properties': len(processed_properties),
            'bank_affiliations': profile.get('bank_affiliations', []),
            'credit_capacity': profile.get('credit_capacity', {}),
            'income_bracket': profile.get('income_bracket', '')
        }
    
    def _process_security(self, profile: Dict) -> Dict:
        """处理安全信息 - 分组泄露源"""
        leaked_credentials = profile.get('leaked_credentials', [])
        ip_history = profile.get('ip_history', [])
        
        # 按泄露源分组
        leak_source_map = defaultdict(lambda: {
            'count': 0,
            'emails': set(),
            'leak_dates': [],
            'has_plaintext': False
        })
        
        for cred in leaked_credentials:
            source = cred.get('leak_source', 'Unknown')
            source_data = leak_source_map[source]
            source_data['count'] += 1
            if cred.get('email'):
                source_data['emails'].add(cred['email'])
            if cred.get('leak_date'):
                source_data['leak_dates'].append(cred['leak_date'])
            if cred.get('plaintext_available'):
                source_data['has_plaintext'] = True
        
        # 转换为列表
        leak_sources = [
            {
                'source': source,
                'count': data['count'],
                'emails': list(data['emails']),
                'email_count': len(data['emails']),
                'latest_leak': sorted(data['leak_dates'], reverse=True)[0] if data['leak_dates'] else '',
                'has_plaintext': data['has_plaintext']
            }
            for source, data in leak_source_map.items()
        ]
        leak_sources.sort(key=lambda x: x['count'], reverse=True)
        
        # IP去重
        unique_ips = list(set([ip.get('ip') for ip in ip_history if ip.get('ip')]))
        
        return {
            'leaked_credentials': {
                'total': len(leaked_credentials),
                'sources': leak_sources[:20],  # 最多20个泄露源
                'total_sources': len(leak_sources),
                'has_plaintext': any(s['has_plaintext'] for s in leak_sources),
                'affected_emails': list(set([c.get('email') for c in leaked_credentials if c.get('email')]))
            },
            'ip_history': {
                'all': ip_history[:30],  # 最多30个IP记录
                'unique_ips': unique_ips[:20],
                'total': len(ip_history),
                'unique_count': len(unique_ips)
            },
            'ssn': profile.get('ssn'),
            'drivers_license': profile.get('drivers_license'),
            'passport_numbers': profile.get('passport_numbers', []),
            'national_id': profile.get('national_id', [])
        }
    
    def _calculate_quality(self, profile: Dict) -> Dict:
        """计算数据质量指标"""
        field_confidences = profile.get('field_confidences', {})
        sources = profile.get('sources', [])
        
        # 计算数据完整性
        completeness_fields = {
            'has_name': bool(profile.get('primary_name')),
            'has_age': bool(profile.get('age')),
            'has_gender': bool(profile.get('gender')),
            'has_phones': len(profile.get('phones', [])) > 0,
            'has_emails': len(profile.get('emails', [])) > 0,
            'has_addresses': len(profile.get('addresses', [])) > 0,
            'has_employment': len(profile.get('employment', [])) > 0,
            'has_education': len(profile.get('education', [])) > 0,
            'has_social': len(profile.get('account_registrations', [])) > 0,
            'has_relatives': len(profile.get('relatives', [])) > 0
        }
        
        filled_count = sum(completeness_fields.values())
        total_count = len(completeness_fields)
        completeness_percentage = round((filled_count / total_count) * 100) if total_count > 0 else 0
        
        return {
            'overall_confidence': profile.get('confidence_score', 0),
            'field_confidences': field_confidences,
            'completeness': {
                'percentage': completeness_percentage,
                'fields': completeness_fields,
                'filled_count': filled_count,
                'total_count': total_count
            },
            'sources_count': len(sources),
            'sources': sources[:50],  # 只保留前50个数据源名称
            'last_updated': profile.get('last_updated', '')
        }
    
    def _calculate_stats(self) -> str:
        """计算处理统计"""
        if not self.processed_data:
            return "No data processed"
        
        stats = []
        
        # 联系方式统计
        phones_total = self.processed_data['contacts']['phones']['total']
        phones_kept = len(self.processed_data['contacts']['phones']['all'])
        stats.append(f"电话 {phones_kept}/{phones_total}")
        
        emails_total = self.processed_data['contacts']['emails']['total']
        emails_kept = len(self.processed_data['contacts']['emails']['all'])
        stats.append(f"邮箱 {emails_kept}/{emails_total}")
        
        # 职业统计
        companies = len(self.processed_data['professional']['employment'])
        total_positions = self.processed_data['professional']['total_positions']
        stats.append(f"公司 {companies} (职位 {total_positions})")
        
        # 社交媒体统计
        platforms = len(self.processed_data['social']['platforms'])
        total_accounts = self.processed_data['social']['total_accounts']
        stats.append(f"平台 {platforms} (账户 {total_accounts})")
        
        # 地址统计
        addresses = len(self.processed_data['geographic']['addresses'])
        total_addresses = self.processed_data['geographic']['total_addresses']
        stats.append(f"地址 {addresses}/{total_addresses}")
        
        return ", ".join(stats)
    
    def get_processed(self) -> Dict[str, Any]:
        """获取处理后的数据"""
        if not self.processed_data:
            self.process()
        return self.processed_data
    
    def get_summary(self) -> Dict[str, Any]:
        """获取数据摘要（用于快速预览）"""
        if not self.processed_data:
            result = self.process()
            if not result:
                logger.error("❌ [DataProcessor] 无法生成摘要：数据处理失败")
                return None
        
        # 安全地访问嵌套字典
        try:
            return {
                'identity': {
                    'name': self.processed_data.get('identity', {}).get('primary_name', ''),
                    'age': self.processed_data.get('identity', {}).get('age', 0),
                    'gender': self.processed_data.get('identity', {}).get('gender', ''),
                    'location': self.processed_data.get('geographic', {}).get('geolocation', {}).get('metro_area', '')
                },
                'stats': {
                    'phones': self.processed_data.get('contacts', {}).get('phones', {}).get('total', 0),
                    'emails': self.processed_data.get('contacts', {}).get('emails', {}).get('total', 0),
                    'companies': self.processed_data.get('professional', {}).get('total_companies', 0),
                    'platforms': self.processed_data.get('social', {}).get('total_platforms', 0),
                    'addresses': self.processed_data.get('geographic', {}).get('total_addresses', 0),
                    'relatives': self.processed_data.get('network', {}).get('total_relatives', 0),
                    'properties': self.processed_data.get('financial', {}).get('total_properties', 0),
                    'leaks': self.processed_data.get('security', {}).get('leaked_credentials', {}).get('total', 0),
                    'data_sources': self.processed_data.get('meta', {}).get('data_sources_count', 0),
                    'confidence': round(self.processed_data.get('quality', {}).get('overall_confidence', 0) * 100)
                },
                'highlights': {
                    'primary_phone': self.processed_data.get('contacts', {}).get('phones', {}).get('primary'),
                    'primary_email': self.processed_data.get('contacts', {}).get('emails', {}).get('primary'),
                    'current_address': self.processed_data.get('geographic', {}).get('current_address'),
                    'latest_job': self.processed_data.get('professional', {}).get('employment', [None])[0] if self.processed_data.get('professional', {}).get('employment') else None
                },
                'risks': {
                    'has_leaks': self.processed_data.get('security', {}).get('leaked_credentials', {}).get('total', 0) > 0,
                    'leak_count': self.processed_data.get('security', {}).get('leaked_credentials', {}).get('total', 0),
                    'has_plaintext': self.processed_data.get('security', {}).get('leaked_credentials', {}).get('has_plaintext', False)
                }
            }
        except Exception as e:
            logger.error(f"❌ [DataProcessor] 摘要生成异常: {str(e)}")
            return None


def process_investigate_response(raw_response: Dict[str, Any]) -> Dict[str, Any]:
    """
    快速处理函数 - 处理 Investigate API 响应
    
    Args:
        raw_response: Investigate API 的原始响应
        
    Returns:
        处理后的结构化数据
    """
    try:
        processor = InvestigateDataProcessor(raw_response)
        processed = processor.process()
        
        if not processed:
            logger.error("❌ [DataProcessor] 数据处理失败")
            return None
        
        logger.info(f"✅ [DataProcessor] 数据处理成功")
        return processed
        
    except Exception as e:
        logger.error(f"❌ [DataProcessor] 处理异常: {str(e)}")
        return None


def get_investigate_summary(raw_response: Dict[str, Any]) -> Dict[str, Any]:
    """
    获取数据摘要 - 用于快速预览
    
    Args:
        raw_response: Investigate API 的原始响应
        
    Returns:
        数据摘要
    """
    try:
        processor = InvestigateDataProcessor(raw_response)
        return processor.get_summary()
    except Exception as e:
        logger.error(f"❌ [DataProcessor] 摘要生成失败: {str(e)}")
        return None

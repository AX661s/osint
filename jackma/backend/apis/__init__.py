"""
独立的API模块
每个API服务都有自己的文件
"""
from .osint_industries import query_osint_industries
from .hibp import query_hibp
from .social_media_scanner import query_social_media_scanner
from .caller_id import query_caller_id
from .truecaller import query_truecaller
from .ipqualityscore import query_ipqualityscore
from .whatsapp import query_whatsapp
from .osint_deep import query_osint_deep_phone
from .callapp import query_callapp
from .microsoft_phone import query_microsoft_phone
from .phone_lookup import query_phone_lookup
from .data_breach import query_data_breach
from .aggregator import query_phone_comprehensive, query_email_comprehensive
from .external_lookup import query_external_lookup
from .models import PhoneQueryResult, EmailQueryResult
from .telegram_username import query_telegram_by_username

__all__ = [
    # 邮箱API
    'query_osint_industries',
    'query_hibp',
    
    # 电话API
    'query_social_media_scanner',
    'query_caller_id',
    'query_truecaller',
    'query_ipqualityscore',
    'query_whatsapp',
    'query_osint_deep_phone',
    'query_callapp',
    'query_microsoft_phone',
    'query_phone_lookup',
    'query_data_breach',
    
    # 聚合查询
    'query_phone_comprehensive',
    'query_email_comprehensive',
    'query_external_lookup',
    'query_telegram_by_username',
    
    # 数据模型
    'PhoneQueryResult',
    'EmailQueryResult',
]

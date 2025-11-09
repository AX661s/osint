"""
Investigate API Integration
API地址: http://47.253.238.111:3007/investigate/{phone}

这是一个强大的OSINT API，提供：
- 电话号码验证
- 姓名验证  
- 地址验证
- 邮箱验证
- 社交媒体账户
- 职业信息
- 房产记录
- 亲属关系
- 泄露凭证
- IP历史
- 99个数据源整合
"""
import httpx
import logging
from typing import Dict, Any, Optional
from .investigate_data_processor import process_investigate_response, get_investigate_summary

logger = logging.getLogger(__name__)

# API配置
INVESTIGATE_API_BASE_URL = "http://47.253.238.111:3007"
INVESTIGATE_API_TIMEOUT = 120  # 120秒超时


async def query_investigate_api(phone: str, timeout: int = INVESTIGATE_API_TIMEOUT) -> Dict[str, Any]:
    """
    调用 Investigate API 查询电话号码的详细信息
    
    Args:
        phone: 电话号码（支持 +14126704024 或 14126704024 格式）
        timeout: 超时时间（秒），默认120秒
        
    Returns:
        Dict包含:
        - success: bool - 是否成功
        - source: str - 数据源名称
        - data: dict - 完整的API响应数据
        - error: str - 错误信息（如果失败）
    """
    try:
        # 清理电话号码
        phone_clean = phone.strip()
        
        # 构建API URL
        url = f"{INVESTIGATE_API_BASE_URL}/investigate/{phone_clean}"
        
        logger.info(f"🔍 [Investigate API] 查询电话: {phone_clean}")
        logger.info(f"📡 [Investigate API] URL: {url}")
        
        # 发送请求
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(url)
            
            if response.status_code == 200:
                data = response.json()
                
                # 提取关键信息
                investigation_id = data.get("investigation_id", "")
                status = data.get("status", "unknown")
                duration = data.get("duration_seconds", 0)
                
                # 提取pipeline结果
                pipeline_result = data.get("pipeline_result", {})
                pipeline_success = pipeline_result.get("success", False)
                pipeline_results = pipeline_result.get("results", {}) if isinstance(pipeline_result, dict) else {}
                
                # 提取并规范化 person_profile（兼容嵌套结构）
                person_profile = data.get("person_profile") or pipeline_results.get("person_profile") or {}
                
                # 提取并规范化 summary（兼容嵌套结构）
                summary = data.get("summary") or pipeline_results.get("summary") or {}
                data_sources_count = (
                    summary.get("data_sources_found")
                    if isinstance(summary, dict) else 0
                )
                
                # 规范化原始数据，确保下游处理器能识别核心字段
                normalized_data = dict(data)
                normalized_data["person_profile"] = person_profile
                normalized_data["summary"] = summary
                
                # Fallback：若顶层数据源统计为0，尝试使用 api_sources 或 phone_lookup 估算
                if not isinstance(data_sources_count, int) or data_sources_count == 0:
                    api_sources = []
                    try:
                        api_sources = pipeline_results.get("phone_lookup_data", {}).get("api_sources", [])
                    except Exception:
                        api_sources = []
                    if isinstance(api_sources, list) and len(api_sources) > 0:
                        data_sources_count = len(api_sources)
                    elif pipeline_results.get("phone_lookup_data"):
                        data_sources_count = 1
                    else:
                        data_sources_count = 0
                    # 写回 normalized_data.summary
                    if isinstance(summary, dict):
                        summary["data_sources_found"] = data_sources_count
                    normalized_data["summary"] = summary
                    normalized_data["data_sources_count"] = data_sources_count
                else:
                    normalized_data["data_sources_count"] = data_sources_count
                
                # Fallback：构造人物档案（当 person_profile 为空时，使用 phone_lookup_data 填充）
                def is_empty_profile(profile: Dict[str, Any]) -> bool:
                    try:
                        return not profile or (
                            not profile.get("phones") and not profile.get("emails") and not profile.get("addresses")
                        )
                    except Exception:
                        return True
                if is_empty_profile(person_profile):
                    phone_lookup = pipeline_results.get("phone_lookup_data", {}) if isinstance(pipeline_results, dict) else {}
                    raw_pl = phone_lookup.get("raw_data", {}) if isinstance(phone_lookup, dict) else {}
                    primary_name = phone_lookup.get("name") or raw_pl.get("name") or ""
                    city = phone_lookup.get("city") or raw_pl.get("location", "")
                    state = phone_lookup.get("state") or ""
                    metro_area = ", ".join([v for v in [city, state] if v]) or (raw_pl.get("location") or "")
                    number_e164 = raw_pl.get("phone_number") or phone_lookup.get("phone") or ""
                    formatted_phone = phone_lookup.get("formatted_phone") or raw_pl.get("formatted_number") or number_e164
                    carrier = phone_lookup.get("carrier") or raw_pl.get("carrier") or ""
                    number_type = phone_lookup.get("number_type") or raw_pl.get("number_type") or ""
                    confidence = phone_lookup.get("confidence_score") or raw_pl.get("confidence_score") or 0
                    # 构建最小可用的档案
                    fallback_profile = {
                        "primary_name": primary_name,
                        "name_variants": phone_lookup.get("all_detected_names", []) or [],
                        "gender": "",
                        "age": None,
                        "birthdate": "",
                        "geolocation": {"metro_area": metro_area},
                        "phones": [
                            {
                                "number_e164": number_e164,
                                "display": formatted_phone,
                                "carrier": carrier,
                                "location": metro_area,
                                "type": number_type,
                                "confidence": confidence,
                            }
                        ] if number_e164 else [],
                        "emails": [],
                        "addresses": [],
                        "employment": [],
                        "education": [],
                        "relatives": [],
                        "leaked_credentials": {"total": 0, "sources": []},
                        "sources": phone_lookup.get("api_sources", []) or []
                    }
                    normalized_data["person_profile"] = fallback_profile
                
                logger.info(f"✅ [Investigate API] 查询成功")
                logger.info(f"📊 [Investigate API] 调查ID: {investigation_id}")
                logger.info(f"⏱️  [Investigate API] 耗时: {duration:.2f}秒")
                logger.info(f"📚 [Investigate API] 数据源: {data_sources_count}个")
                logger.info(f"✔️  [Investigate API] Pipeline状态: {status}")
                
                # 在后端进行数据处理和优化
                logger.info(f"🔄 [Investigate API] 开始数据处理...")
                raw_response_data = {
                    "success": True,
                    "data": normalized_data
                }
                
                processed_data = process_investigate_response(raw_response_data)
                summary_data = get_investigate_summary(raw_response_data)
                
                if processed_data:
                    logger.info(f"✅ [Investigate API] 数据处理完成")
                else:
                    logger.warning(f"⚠️  [Investigate API] 数据处理失败，构建最小可用数据以返回")
                    # 构建最小可用的 processed 数据结构（与前端期望一致）
                    pp = normalized_data.get("person_profile", {}) if isinstance(normalized_data, dict) else {}
                    meta_fallback = {
                        "investigation_id": normalized_data.get("investigation_id", ""),
                        "phone_number": normalized_data.get("phone_number", ""),
                        "status": normalized_data.get("status", "unknown"),
                        "duration": normalized_data.get("duration_seconds", 0),
                        "data_sources_count": normalized_data.get("data_sources_count", data_sources_count),
                        "start_time": normalized_data.get("start_time", ""),
                        "end_time": normalized_data.get("end_time", "")
                    }
                    phones = pp.get("phones", []) if isinstance(pp.get("phones", []), list) else []
                    emails = pp.get("emails", []) if isinstance(pp.get("emails", []), list) else []
                    addresses = pp.get("addresses", []) if isinstance(pp.get("addresses", []), list) else []
                    employment = pp.get("employment", []) if isinstance(pp.get("employment", []), list) else []
                    education = pp.get("education", []) if isinstance(pp.get("education", []), list) else []
                    relatives = pp.get("relatives", []) if isinstance(pp.get("relatives", []), list) else []
                    properties = pp.get("property_records", []) if isinstance(pp.get("property_records", []), list) else []
                    geolocation = pp.get("geolocation", {}) if isinstance(pp.get("geolocation", {}), dict) else {}
                    leaked_credentials = pp.get("leaked_credentials", {"total": 0, "sources": []})
                    overall_confidence = pp.get("confidence_score", 0) if isinstance(pp.get("confidence_score", 0), (int, float)) else 0

                    processed_data = {
                        "meta": meta_fallback,
                        "identity": {
                            "primary_name": pp.get("primary_name", ""),
                            "name_variants": pp.get("name_variants", []) if isinstance(pp.get("name_variants", []), list) else [],
                            "gender": pp.get("gender", ""),
                            "age": pp.get("age", 0) or 0,
                            "birthdate": pp.get("birthdate", "")
                        },
                        "contacts": {
                            "phones": {"all": phones, "total": len(phones)},
                            "emails": {"all": emails, "total": len(emails)}
                        },
                        "professional": {
                            "employment": employment,
                            "education": education,
                            "total_positions": len(employment),
                            "total_companies": len({(job.get("company") or "") for job in employment if isinstance(job, dict)})
                        },
                        "social": {
                            "platforms": [],
                            "total_accounts": 0,
                            "total_platforms": 0
                        },
                        "geographic": {
                            "addresses": addresses,
                            "geolocation": {"metro_area": geolocation.get("metro_area", "")},
                            "total_addresses": len(addresses),
                            "current_address": addresses[0] if addresses else None
                        },
                        "network": {
                            "relatives": relatives,
                            "total_relatives": len(relatives)
                        },
                        "financial": {
                            "properties": properties,
                            "total_properties": len(properties)
                        },
                        "security": {
                            "leaked_credentials": leaked_credentials
                        },
                        "quality": {
                            "overall_confidence": overall_confidence
                        }
                    }

                    # 最小摘要
                    summary_data = {
                        "identity": {
                            "name": processed_data["identity"]["primary_name"],
                            "age": processed_data["identity"]["age"],
                            "gender": processed_data["identity"]["gender"],
                            "location": processed_data["geographic"]["geolocation"]["metro_area"]
                        },
                        "stats": {
                            "phones": processed_data["contacts"]["phones"]["total"],
                            "emails": processed_data["contacts"]["emails"]["total"],
                            "addresses": processed_data["geographic"]["total_addresses"],
                            "relatives": processed_data["network"]["total_relatives"],
                            "properties": processed_data["financial"]["total_properties"],
                            "data_sources": processed_data["meta"]["data_sources_count"],
                            "confidence": round(processed_data["quality"]["overall_confidence"] * 100) if isinstance(processed_data["quality"]["overall_confidence"], (int, float)) else 0
                        },
                        "risks": {
                            "has_leaks": (processed_data["security"]["leaked_credentials"].get("total", 0) > 0),
                            "leak_count": processed_data["security"]["leaked_credentials"].get("total", 0),
                            "has_plaintext": processed_data["security"]["leaked_credentials"].get("has_plaintext", False)
                        }
                    }
                
                    return {
                        "success": True,
                        "source": "investigate_api",
                        "data": {
                            "investigation_id": investigation_id,
                            "phone_number": phone_clean,
                            "status": status,
                            "duration_seconds": duration,
                            "pipeline_success": pipeline_success,
                            "data_sources_count": data_sources_count,
                            
                            # 处理后的数据（优先使用）
                            "processed": processed_data,
                            "summary": summary_data,
                        
                        # 核心数据（向后兼容）
                        "person_profile": person_profile,
                        "pipeline_result": pipeline_result,
                        
                        # 原始数据（可选，用于调试）
                        # "raw_data": data  # 注释掉以减少响应大小
                    },
                    "metadata": {
                        "api_url": url,
                        "response_time": duration,
                        "data_sources": data_sources_count,
                        "processed": processed_data is not None
                    }
                }
            else:
                error_msg = f"HTTP {response.status_code}: {response.text[:200]}"
                logger.error(f"❌ [Investigate API] 请求失败: {error_msg}")
                return {
                    "success": False,
                    "source": "investigate_api",
                    "data": None,
                    "error": error_msg
                }
                
    except httpx.TimeoutException:
        error_msg = f"请求超时（{timeout}秒）"
        logger.error(f"❌ [Investigate API] {error_msg}")
        return {
            "success": False,
            "source": "investigate_api",
            "data": None,
            "error": error_msg
        }
    except httpx.ConnectError as e:
        error_msg = f"连接错误: {str(e)}"
        logger.error(f"❌ [Investigate API] {error_msg}")
        return {
            "success": False,
            "source": "investigate_api",
            "data": None,
            "error": error_msg
        }
    except Exception as e:
        error_msg = f"未知错误: {str(e)}"
        logger.error(f"❌ [Investigate API] {error_msg}")
        return {
            "success": False,
            "source": "investigate_api",
            "data": None,
            "error": error_msg
        }


async def extract_person_summary(investigate_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    从 Investigate API 响应中提取人物摘要信息
    
    Args:
        investigate_data: Investigate API的完整响应数据
        
    Returns:
        Dict包含提取的关键信息
    """
    try:
        person_profile = investigate_data.get("person_profile", {})
        
        # 提取基本信息
        summary = {
            "primary_name": person_profile.get("primary_name", ""),
            "name_variants": person_profile.get("name_variants", []),
            "gender": person_profile.get("gender", ""),
            "age": person_profile.get("age", 0),
            "birthdate": person_profile.get("birthdate", ""),
            
            # 联系方式
            "phones": person_profile.get("phones", [])[:5],  # 只取前5个
            "emails": person_profile.get("emails", [])[:10],  # 只取前10个
            "addresses": person_profile.get("addresses", [])[:5],  # 只取前5个
            
            # 职业信息
            "employment": person_profile.get("employment", [])[:5],
            "education": person_profile.get("education", []),
            "income_bracket": person_profile.get("income_bracket", ""),
            
            # 社交信息
            "social_profiles": person_profile.get("social_profiles", []),
            "account_registrations": len(person_profile.get("account_registrations", [])),
            
            # 其他信息
            "relatives": person_profile.get("relatives", [])[:10],
            "property_records": len(person_profile.get("property_records", [])),
            "leaked_credentials": len(person_profile.get("leaked_credentials", [])),
            
            # 地理位置
            "geolocation": person_profile.get("geolocation", {}),
            
            # 数据源
            "sources": person_profile.get("sources", []),
            "sources_count": len(person_profile.get("sources", [])),
            "confidence_score": person_profile.get("confidence_score", 0),
        }
        
        return {
            "success": True,
            "summary": summary
        }
        
    except Exception as e:
        logger.error(f"❌ [Investigate API] 提取摘要失败: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


# 测试函数
async def test_investigate_api():
    """测试 Investigate API"""
    test_phones = [
        "+14126704024",
        "+8613800138000"
    ]
    
    for phone in test_phones:
        print(f"\n{'='*60}")
        print(f"测试电话: {phone}")
        print('='*60)
        
        result = await query_investigate_api(phone)
        
        if result.get("success"):
            print(f"✅ 查询成功")
            print(f"📊 数据源数量: {result['data']['data_sources_count']}")
            print(f"⏱️  响应时间: {result['data']['duration_seconds']:.2f}秒")
            print(f"👤 主要姓名: {result['data']['person_profile'].get('primary_name', 'N/A')}")
            
            # 提取摘要
            summary_result = await extract_person_summary(result['data'])
            if summary_result.get("success"):
                summary = summary_result['summary']
                print(f"\n📋 人物摘要:")
                print(f"  - 姓名: {summary['primary_name']}")
                print(f"  - 年龄: {summary['age']}")
                print(f"  - 性别: {summary['gender']}")
                print(f"  - 电话数量: {len(summary['phones'])}")
                print(f"  - 邮箱数量: {len(summary['emails'])}")
                print(f"  - 地址数量: {len(summary['addresses'])}")
                print(f"  - 数据源: {summary['sources_count']}个")
        else:
            print(f"❌ 查询失败: {result.get('error')}")


if __name__ == "__main__":
    import asyncio
    asyncio.run(test_investigate_api())

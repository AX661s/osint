"""
GPT-5 数据分析模块
使用 RapidAPI 的 ChatGPT-GPT5 API 来分析 OSINT 数据
"""
import httpx
import json
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

RAPIDAPI_KEY = "b491571bafmsh04f7fa840b92045p1a8db2jsn4c5d1dbd653d"
GPT5_API_URL = "https://chatgpt-gpt5.p.rapidapi.com/ask"

async def analyze_osint_data_with_gpt5(
    results: List[Dict[str, Any]],
    query: str,
    main_person: Optional[str] = None
) -> Dict[str, Any]:
    """
    使用 GPT-5 分析 OSINT Industries 数据
    
    Args:
        results: OSINT Industries 返回的结果列表
        query: 查询的邮箱或电话
        main_person: 主要人物姓名（可选）
    
    Returns:
        分析结果，包含提取的字段和 AI 生成的摘要
    """
    try:
        # 构建提示词
        prompt = f"""
请分析以下 OSINT 数据，提取主要人物的关键信息。

查询目标: {query}
{f'主要人物: {main_person}' if main_person else ''}

数据记录数: {len(results)}

请从这些数据中提取并整理以下信息：

1. **基本信息**
   - 姓名（所有变体）
   - 年龄/生日
   - 性别
   - 当前居住地

2. **联系方式**
   - 所有邮箱地址
   - 所有电话号码
   - 历史地址

3. **职业信息**
   - 当前/历史工作单位
   - 职位
   - 工作地点

4. **社交媒体**
   - 平台和用户名
   - 个人简介
   - 关注者数等

5. **安全风险**
   - 密码泄露情况
   - 泄露的密码
   - 数据泄露来源

6. **其他重要信息**
   - IP 地址
   - 注册时间
   - 最后活跃时间

数据样本（前5条）:
{json.dumps(results[:5], indent=2, ensure_ascii=False)}

请以 JSON 格式返回，结构如下：
{{
  "person_name": "主要人物姓名",
  "basic_info": {{
    "names": ["姓名变体1", "姓名变体2"],
    "age": "年龄或生日",
    "gender": "性别",
    "location": "当前居住地"
  }},
  "contact": {{
    "emails": ["邮箱1", "邮箱2"],
    "phones": ["电话1", "电话2"],
    "addresses": ["地址1", "地址2"]
  }},
  "career": {{
    "companies": ["公司1", "公司2"],
    "titles": ["职位1", "职位2"]
  }},
  "social_media": {{
    "twitter": "用户名",
    "linkedin": "链接",
    "other": ["其他账号"]
  }},
  "security_risks": {{
    "leaked_passwords": ["密码1", "密码2"],
    "leak_sources": ["来源1", "来源2"],
    "risk_level": "高/中/低"
  }},
  "summary": "一段简短的人物摘要（100-200字）"
}}
"""

        # 调用 GPT-5 API
        headers = {
            "Content-Type": "application/json",
            "x-rapidapi-host": "chatgpt-gpt5.p.rapidapi.com",
            "x-rapidapi-key": RAPIDAPI_KEY
        }
        
        payload = {
            "query": prompt
        }
        
        logger.info(f"🤖 Calling GPT-5 API to analyze {len(results)} records...")
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                GPT5_API_URL,
                headers=headers,
                json=payload
            )
            
            if response.status_code != 200:
                logger.error(f"❌ GPT-5 API error: {response.status_code} - {response.text}")
                return {
                    "success": False,
                    "error": f"API error: {response.status_code}"
                }
            
            result = response.json()
            logger.info(f"✅ GPT-5 API response received")
            
            # 解析 GPT-5 的响应
            gpt_response = result.get("response", "")
            
            # 尝试从响应中提取 JSON
            try:
                # 查找 JSON 代码块
                if "```json" in gpt_response:
                    json_start = gpt_response.find("```json") + 7
                    json_end = gpt_response.find("```", json_start)
                    json_str = gpt_response[json_start:json_end].strip()
                elif "```" in gpt_response:
                    json_start = gpt_response.find("```") + 3
                    json_end = gpt_response.find("```", json_start)
                    json_str = gpt_response[json_start:json_end].strip()
                else:
                    json_str = gpt_response
                
                analyzed_data = json.loads(json_str)
                
                return {
                    "success": True,
                    "data": analyzed_data,
                    "raw_response": gpt_response
                }
            except json.JSONDecodeError as e:
                logger.error(f"❌ Failed to parse GPT-5 JSON response: {e}")
                return {
                    "success": False,
                    "error": "Failed to parse AI response",
                    "raw_response": gpt_response
                }
    
    except Exception as e:
        logger.error(f"❌ GPT-5 analysis error: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


async def quick_analyze_person(
    results: List[Dict[str, Any]],
    query: str
) -> Dict[str, Any]:
    """
    快速分析人物信息（不使用 AI，直接提取）
    
    Args:
        results: OSINT 数据结果
        query: 查询目标
    
    Returns:
        提取的人物信息
    """
    fields = {
        "names": set(),
        "emails": set(),
        "phones": set(),
        "addresses": set(),
        "cities": set(),
        "states": set(),
        "companies": set(),
        "job_titles": set(),
        "social_media": set(),
        "passwords": set(),
        "ips": set(),
        "ages": set(),
        "genders": set()
    }
    
    for result in results:
        # 姓名
        if result.get("FullName"):
            fields["names"].add(result["FullName"])
        if result.get("FirstName") and result.get("LastName"):
            fields["names"].add(f"{result['FirstName']} {result['LastName']}")
        
        # 联系方式
        if result.get("Email"):
            fields["emails"].add(result["Email"])
        if result.get("Phone"):
            fields["phones"].add(result["Phone"])
        if result.get("MobilePhone"):
            fields["phones"].add(result["MobilePhone"])
        
        # 地址
        if result.get("Address"):
            fields["addresses"].add(result["Address"])
        if result.get("City"):
            fields["cities"].add(result["City"])
        if result.get("State"):
            fields["states"].add(result["State"])
        
        # 职业
        if result.get("CompanyName"):
            fields["companies"].add(result["CompanyName"])
        if result.get("JobTitle"):
            fields["job_titles"].add(result["JobTitle"])
        
        # 社交媒体
        if result.get("NickName"):
            fields["social_media"].add(f"@{result['NickName']}")
        if result.get("Link"):
            fields["social_media"].add(result["Link"])
        
        # 安全
        if result.get("Password"):
            fields["passwords"].add(result["Password"])
        if result.get("IP"):
            fields["ips"].add(result["IP"])
        
        # 个人信息
        if result.get("Age"):
            fields["ages"].add(str(result["Age"]))
        if result.get("BDayYear"):
            fields["ages"].add(f"生于 {result['BDayYear']}")
        if result.get("Gender"):
            fields["genders"].add(result["Gender"])
    
    # 转换 Set 为 List
    return {
        "names": list(fields["names"]),
        "emails": list(fields["emails"]),
        "phones": list(fields["phones"]),
        "addresses": list(fields["addresses"]),
        "cities": list(fields["cities"]),
        "states": list(fields["states"]),
        "companies": list(fields["companies"]),
        "job_titles": list(fields["job_titles"]),
        "social_media": list(fields["social_media"]),
        "passwords": list(fields["passwords"]),
        "ips": list(fields["ips"]),
        "ages": list(fields["ages"]),
        "genders": list(fields["genders"])
    }

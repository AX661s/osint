"""
AI分析器 - 使用ChatGPT分析OSINT数据并提取主要人物资料
"""
import httpx
import json
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

# RapidAPI配置
RAPIDAPI_KEY = "b491571bafmsh04f7fa840b92045p1a8db2jsn4c5d1dbd653d"
RAPIDAPI_HOST = "chatgpt-gpt5.p.rapidapi.com"
API_URL = f"https://{RAPIDAPI_HOST}/ask"


async def analyze_person_data(osint_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    使用AI分析OSINT数据，提取主要人物资料
    
    Args:
        osint_data: OSINT查询返回的原始数据
        
    Returns:
        Dict包含:
        - success: bool
        - analysis: dict - AI分析结果
        - person_profile: dict - 提取的人物档案
        - error: str - 错误信息（如果失败）
    """
    try:
        # 构建AI提示词
        prompt = build_analysis_prompt(osint_data)
        
        # 调用ChatGPT API
        headers = {
            "Content-Type": "application/json",
            "x-rapidapi-host": RAPIDAPI_HOST,
            "x-rapidapi-key": RAPIDAPI_KEY
        }
        
        payload = {
            "query": prompt
        }
        
        logger.info("🤖 调用ChatGPT API分析数据...")
        
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(API_URL, headers=headers, json=payload)
            response.raise_for_status()
            result = response.json()
            
            # 解析AI响应
            ai_response = result.get("response", "")
            
            # 尝试从AI响应中提取JSON格式的人物档案
            person_profile = extract_person_profile(ai_response)
            
            logger.info("✅ AI分析完成")
            
            return {
                "success": True,
                "analysis": ai_response,
                "person_profile": person_profile,
                "raw_response": result
            }
            
    except Exception as e:
        error_msg = str(e)
        logger.error(f"❌ AI分析失败: {error_msg}")
        return {
            "success": False,
            "error": error_msg
        }


def build_analysis_prompt(osint_data: Dict[str, Any]) -> str:
    """
    构建专业OSINT分析提示词 - EFID生成与唯一人判定
    """
    # 提取关键信息
    summary = osint_data.get("summary", {})
    keywords = summary.get("keywords", [])
    emails = summary.get("email", [])
    phones = summary.get("phone", [])
    sources = summary.get("sources", [])
    results = summary.get("results", [])
    
    # 构建提示词
    prompt = f"""
# OSINT 实体分析 - EFID 生成与唯一人判定

## 输入数据概览
- **搜索关键词**: {', '.join(keywords) if keywords else '无'}
- **发现的邮箱**: {', '.join(emails) if emails else '无'}
- **发现的电话**: {', '.join(phones) if phones else '无'}
- **数据来源**: {len(sources)}个平台
- **数据记录**: {len(results)}条

## 原始JSON数据（异构多源）
{format_results_sample(results, max_samples=10)}

---

## 处理要求

### 1. 标准化与去重

#### 邮箱处理
- 全部转小写、去空格
- 统计出现频次
- 选出 **Primary Email**（最高频/最可信，与目标线索一致优先）

#### 电话处理
- 去除所有非数字字符
- 美国号码标准化为10位本地号（去掉前导1）
- 同时保留E.164格式（+1开头）
- 选出 **Primary Phone**（与线索一致优先，其次最高频）

#### 出生日期
- 从所有来源中挑选最完整/最可信的生日
- 优先格式：YYYY-MM-DD 或 YYYY/MM/DD
- 标注数据来源

#### 地点标准化
- 从地址字段中抽取：城市 + 州（或城市 + 国家）
- 根据出现频次选择 **Canonical Location**
- 若与线索城市一致则优先

#### 用户名/昵称
- 收集所有 NickName/Login/Username
- 按平台聚合（Twitter、MyFitnessPal、Poshmark等）
- 大小写不敏感但保留原样

---

### 2. 强绑定证据分析（优先级从高到低）

#### 强证据（High Confidence）
1. **Email 精确匹配** (+40分)
2. **Phone 精确匹配** (+35分)
3. **平台UID跨平台映射** (+10分/单平台+8分)
4. **OAuth/rel=me链接** (+15分)
5. **GAIA/LinkedIn固定ID** (+12分)

#### 弱证据/侧证（Supporting Evidence）
1. **Bio中城市一致** (+10分)
2. **兴趣关键词一致** (+5分/个，最多+15分)
3. **头像感知哈希相似** (+10分)
4. **社交图谱重叠** (+10分)
5. **显示名精确匹配** (+5分)
6. **页面存在性** (+2分)
7. **注册时间线一致** (+5分)

---

### 3. EFID（Entity Fingerprint ID）生成

#### v1 规则
```
拼接格式: v1|{primary_email}|{primary_phone_10}|{birthdate}|{canonical_location}
哈希算法: SHA-256
输出: efid_v1_sha256
```

#### 示例
```
输入: v1|inesbrady@gmail.com|4126704024|1965-08-04|Pittsburgh,PA
输出: efid_v1_sha256 = sha256(上述字符串)
```

**注意**: 如因子缺失用空串占位，但需在说明中标注缺失项

---

### 4. 唯一人判定（Single True Identity）

#### 聚类算法
1. 按"强绑定证据"将各平台账号连通（任一强证据共享即合并）
2. 用相似度（位置/兴趣/bio/头像）≥阈值补充合并
3. 计算每个聚类的综合得分

#### 判定标准
- **≥85分 且 比第二大簇高≥20分**: "唯一真实人（High Confidence）"
- **70-84分**: "可能同一人（Review Required）"
- **<70分**: "证据不足（Insufficient Evidence）"

---

## 输出格式（JSON）

```json
{{
  "efid": {{
    "version": "v1",
    "primary_email": "标准化的主邮箱",
    "primary_phone": "标准化的主电话（10位）",
    "primary_phone_e164": "E.164格式电话",
    "birthdate": "YYYY-MM-DD",
    "canonical_location": "City, State",
    "efid_v1_sha256": "SHA-256哈希值",
    "missing_factors": ["缺失的因子列表"]
  }},
  
  "identity_assessment": {{
    "conclusion": "唯一真实人（High Confidence）",
    "confidence_score": 92,
    "second_cluster_score": 45,
    "score_gap": 47,
    "reasoning": "详细判定理由"
  }},
  
  "standardized_fields": {{
    "emails": [
      {{"email": "inesbrady@gmail.com", "frequency": 25, "sources": ["Twitter", "MyFitnessPal", ...]}},
      {{"email": "InesBrady@gmail.com", "frequency": 8, "sources": [...]}}
    ],
    "phones": [
      {{"phone": "4126704024", "e164": "+14126704024", "frequency": 18, "sources": [...]}},
      {{"phone": "4124416333", "e164": "+14124416333", "frequency": 2, "sources": [...]}}
    ],
    "birthdates": [
      {{"date": "1965-08-04", "source": "MGM Resorts", "confidence": "high"}},
      {{"date": "1962-03", "source": "Experian", "confidence": "low"}}
    ],
    "locations": [
      {{"location": "Pittsburgh, PA", "frequency": 15, "sources": [...]}},
      {{"location": "Glenshaw, PA", "frequency": 3, "sources": [...]}}
    ],
    "usernames": [
      {{"username": "Ines_Brady", "platform": "Twitter", "url": "https://twitter.com/Ines_Brady"}},
      {{"username": "inesb1", "platform": "MyFitnessPal"}},
      {{"username": "InesB138", "platform": "Zynga"}}
    ]
  }},
  
  "account_clusters": [
    {{
      "cluster_id": 1,
      "total_score": 92,
      "accounts": [
        {{
          "platform": "Twitter",
          "username": "Ines_Brady",
          "evidence_score": 85,
          "evidence_points": [
            {{"type": "email_match", "value": "inesbrady@gmail.com", "score": 40}},
            {{"type": "location_match", "value": "Pittsburgh, PA", "score": 10}},
            {{"type": "display_name", "value": "Ines Brady", "score": 5}},
            {{"type": "page_exists", "score": 2}}
          ]
        }},
        {{
          "platform": "MyFitnessPal",
          "username": "inesb1",
          "evidence_score": 75,
          "evidence_points": [
            {{"type": "email_match", "value": "inesbrady@gmail.com", "score": 40}},
            {{"type": "phone_match", "value": "4126704024", "score": 35}}
          ]
        }}
      ]
    }}
  ]},
  
  "security_analysis": {{
    "leaked_passwords": [
      {{"password": "Keely2000", "sources": ["Cloudata", "Collection #2", "WhitePages"], "risk": "high"}},
      {{"password": "keely2000", "sources": ["MyFitnessPal", "Zeeroq"], "risk": "high"}},
      {{"password": "Keely2", "sources": ["Poshmark"], "risk": "medium"}}
    ],
    "data_breaches": [
      {{"source": "MyFitnessPal", "date": "2018", "records": 150000000}},
      {{"source": "Collection #2", "date": "2019", "records": 2200000000}},
      {{"source": "Twitter 200M", "date": "2022", "records": 200000000}}
    ],
    "overall_risk": "高风险",
    "recommendations": [
      "立即更改所有使用Keely2000的账户密码",
      "启用双因素认证（2FA）",
      "监控信用报告",
      "考虑更换邮箱地址"
    ]
  }},
  
  "summary": {{
    "full_name": "Ines Brady",
    "age": 59,
    "gender": "Female",
    "primary_location": "Pittsburgh, PA",
    "primary_email": "inesbrady@gmail.com",
    "primary_phone": "+14126704024",
    "online_footprint": "Twitter, MyFitnessPal, Poshmark, Zynga等34个平台",
    "data_exposure": "在12个数据泄露事件中发现，包括明文密码泄露",
    "brief": "Ines Brady，女性，59岁，居住在宾夕法尼亚州匹兹堡。在多个数据泄露事件中发现其信息，包括明文密码泄露，存在高安全风险。社交媒体活跃，Twitter粉丝54人。"
  }}
}}
```

**重要**: 
1. 绝对不要脱敏任何字段
2. 保留所有原始数据（邮箱、电话、密码、地址等）
3. 提供完整的证据链和评分细节
4. 输出纯JSON，不要包含markdown代码块标记
"""
    
    return prompt


def format_results_sample(results: List[str], max_samples: int = 5) -> str:
    """
    格式化结果样本用于AI分析
    """
    if not results:
        return "无数据记录"
    
    samples = []
    for i, result in enumerate(results[:max_samples]):
        # 截断过长的记录
        truncated = result[:500] + "..." if len(result) > 500 else result
        samples.append(f"记录{i+1}: {truncated}")
    
    if len(results) > max_samples:
        samples.append(f"... 还有 {len(results) - max_samples} 条记录")
    
    return "\n".join(samples)


def extract_person_profile(ai_response: str) -> Dict[str, Any]:
    """
    从AI响应中提取JSON格式的人物档案
    """
    try:
        # 尝试找到JSON部分
        start_idx = ai_response.find("{")
        end_idx = ai_response.rfind("}") + 1
        
        if start_idx != -1 and end_idx > start_idx:
            json_str = ai_response[start_idx:end_idx]
            profile = json.loads(json_str)
            return profile
        else:
            # 如果没有找到JSON，返回原始文本
            return {"raw_analysis": ai_response}
            
    except json.JSONDecodeError:
        # JSON解析失败，返回原始文本
        return {"raw_analysis": ai_response}
    except Exception as e:
        logger.error(f"提取人物档案失败: {str(e)}")
        return {"error": str(e), "raw_analysis": ai_response}


async def generate_person_summary(person_profile: Dict[str, Any]) -> str:
    """
    基于人物档案生成简洁的中文摘要
    """
    try:
        basic = person_profile.get("basic_info", {})
        contact = person_profile.get("contact_info", {})
        location = person_profile.get("location", {})
        
        name = basic.get("full_name", "未知")
        age = basic.get("age", "未知")
        gender = basic.get("gender", "未知")
        city = location.get("current_city", "未知")
        state = location.get("current_state", "")
        
        summary_parts = []
        
        # 基本信息
        if name != "未知":
            summary_parts.append(f"姓名：{name}")
        if age != "未知":
            summary_parts.append(f"年龄：{age}岁")
        if gender != "未知":
            summary_parts.append(f"性别：{gender}")
        
        # 位置信息
        location_str = f"{city}, {state}" if state else city
        if location_str != "未知":
            summary_parts.append(f"位置：{location_str}")
        
        # 联系方式
        emails = contact.get("emails", [])
        if emails:
            summary_parts.append(f"邮箱：{emails[0]}")
        
        phones = contact.get("phones", [])
        if phones:
            summary_parts.append(f"电话：{phones[0]}")
        
        return " | ".join(summary_parts) if summary_parts else "无法生成摘要"
        
    except Exception as e:
        logger.error(f"生成摘要失败: {str(e)}")
        return "摘要生成失败"

# 🔑 API密钥配置完整指南

本文档详细说明如何获取和配置OSINT Tracker所需的所有API密钥。

---

## 📋 快速配置步骤

### 1. 复制模板文件
```bash
cd jackma/backend
cp .env.template .env
```

### 2. 编辑.env文件
使用文本编辑器打开`.env`文件，填入您的API密钥。

### 3. 重启服务
```bash
# 重启后端服务以加载新配置
python -m uvicorn server:app --host 0.0.0.0 --port 8000
```

---

## 🔑 必需的API密钥

### 1. Have I Been Pwned (HIBP)

**用途**: 邮箱数据泄露查询

**获取步骤**:
1. 访问 https://haveibeenpwned.com/API/Key
2. 点击"Get a key"
3. 填写邮箱和支付信息
4. 费用：$3.50/月

**配置**:
```env
HIBP_API_KEY=your_hibp_api_key_here
```

**测试**:
```bash
curl -H "hibp-api-key: your_key" \
  "https://haveibeenpwned.com/api/v3/breachedaccount/test@example.com"
```

---

### 2. OSINT Industries

**用途**: 综合邮箱OSINT查询

**获取步骤**:
1. 访问 https://osint.industries/
2. 注册账户
3. 进入Dashboard获取API密钥
4. 费用：按查询计费

**配置**:
```env
OSINT_INDUSTRIES_API_KEY=your_osint_industries_api_key_here
```

**测试**:
```bash
curl -X POST "https://osint.industries/api/email" \
  -H "Authorization: Bearer your_key" \
  -d '{"email":"test@example.com"}'
```

---

### 3. RapidAPI

**用途**: 多个API服务的统一密钥

**获取步骤**:
1. 访问 https://rapidapi.com/
2. 注册账户
3. 进入"My Apps"
4. 创建新应用或使用默认应用
5. 复制"X-RapidAPI-Key"

**配置**:
```env
RAPIDAPI_KEY=your_rapidapi_key_here
```

**支持的服务**:
- Social Media Scanner
- Caller ID (Eyecon)
- Truecaller
- 其他RapidAPI市场服务

---

## 🎯 推荐的API密钥

### 4. IPQualityScore

**用途**: 电话号码质量评分和欺诈检测

**获取步骤**:
1. 访问 https://www.ipqualityscore.com/
2. 注册免费账户
3. 进入Dashboard
4. 复制API密钥
5. 免费额度：5,000次请求/月

**配置**:
```env
IPQS_API_KEY=your_ipqs_api_key_here
```

**测试**:
```bash
curl "https://ipqualityscore.com/api/json/phone/your_key/14155552671"
```

---

### 5. Truecaller (RapidAPI)

**用途**: 电话号码详细信息查询

**获取步骤**:
1. 访问 https://rapidapi.com/truecaller/api/truecaller4
2. 订阅API（有免费套餐）
3. 使用RapidAPI密钥

**配置**:
```env
TRUECALLER_RAPIDAPI_KEY=your_rapidapi_key_here
```

**注意**: 如不单独配置，将使用`RAPIDAPI_KEY`

---

### 6. Caller ID (Eyecon)

**用途**: 来电显示和号码识别

**获取步骤**:
1. 访问 https://rapidapi.com/eyecon-eyecon-default/api/caller-id
2. 订阅API
3. 使用RapidAPI密钥

**配置**:
```env
CALLER_ID_RAPIDAPI_KEY=your_rapidapi_key_here
```

**注意**: 如不单独配置，将使用`RAPIDAPI_KEY`

---

## 🔧 可选的API密钥

### 7. WhatsApp验证

**用途**: WhatsApp号码验证

**获取步骤**:
1. 联系WhatsApp API服务提供商
2. 或使用第三方服务

**配置**:
```env
WHATSAPP_API_KEY=your_whatsapp_api_key_here
```

---

### 8. SerpAPI

**用途**: Google搜索结果API

**获取步骤**:
1. 访问 https://serpapi.com/
2. 注册账户
3. 获取API密钥
4. 免费额度：100次搜索/月

**配置**:
```env
SERPAPI_KEY=your_serpapi_key_here
```

---

### 9. OpenAI (GPT)

**用途**: AI数据分析和摘要生成

**获取步骤**:
1. 访问 https://platform.openai.com/
2. 注册账户
3. 进入API Keys页面
4. 创建新密钥

**配置**:
```env
OPENAI_API_KEY=your_openai_api_key_here
```

**费用**: 按使用量计费

---

### 10. Telegram API

**用途**: Telegram用户信息查询

**获取步骤**:

**Bot Token**:
1. 在Telegram中搜索 @BotFather
2. 发送 `/newbot`
3. 按提示创建机器人
4. 获取Bot Token

**API ID和Hash**:
1. 访问 https://my.telegram.org/apps
2. 登录Telegram账户
3. 创建新应用
4. 获取API ID和API Hash

**配置**:
```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_API_ID=your_telegram_api_id_here
TELEGRAM_API_HASH=your_telegram_api_hash_here
```

---

## 💰 成本估算

### 必需服务（每月）
- **HIBP**: $3.50
- **OSINT Industries**: 按查询计费（约$10-50）
- **RapidAPI**: 免费套餐可用，付费约$10-30

**总计**: 约$23.50 - $83.50/月

### 可选服务（每月）
- **IPQualityScore**: 免费（5,000次）
- **SerpAPI**: 免费（100次）
- **OpenAI**: 按使用量（约$5-20）

---

## 🔒 安全最佳实践

### 1. 密钥保护
```bash
# 设置文件权限（Linux/Mac）
chmod 600 .env

# 确保.env在.gitignore中
echo ".env" >> .gitignore
```

### 2. 密钥轮换
- 定期更换API密钥（建议每3-6个月）
- 发现泄露立即更换
- 使用密钥管理服务（如AWS Secrets Manager）

### 3. 访问控制
- 限制API密钥的IP白名单
- 设置使用限额
- 启用API密钥的使用监控

### 4. 环境隔离
```env
# 开发环境
APP_ENV=development
DEBUG=true

# 生产环境
APP_ENV=production
DEBUG=false
```

---

## 📊 API使用监控

### 查看API使用统计
1. 登录管理员面板
2. 进入"API密钥管理"
3. 查看各API的使用情况

### 设置告警
```env
# 配置邮件通知
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_password
NOTIFICATION_EMAIL=admin@example.com
```

---

## 🧪 测试API配置

### 测试脚本
创建 `test_apis.py`:

```python
import os
from dotenv import load_dotenv
import requests

load_dotenv()

def test_hibp():
    key = os.getenv('HIBP_API_KEY')
    if not key:
        print("❌ HIBP_API_KEY not configured")
        return
    
    headers = {'hibp-api-key': key}
    response = requests.get(
        'https://haveibeenpwned.com/api/v3/breachedaccount/test@example.com',
        headers=headers
    )
    
    if response.status_code in [200, 404]:
        print("✅ HIBP API working")
    else:
        print(f"❌ HIBP API error: {response.status_code}")

def test_osint_industries():
    key = os.getenv('OSINT_INDUSTRIES_API_KEY')
    if not key:
        print("❌ OSINT_INDUSTRIES_API_KEY not configured")
        return
    
    # 测试代码...
    print("✅ OSINT Industries API configured")

def test_rapidapi():
    key = os.getenv('RAPIDAPI_KEY')
    if not key:
        print("❌ RAPIDAPI_KEY not configured")
        return
    
    print("✅ RapidAPI key configured")

if __name__ == '__main__':
    print("🧪 Testing API configurations...\n")
    test_hibp()
    test_osint_industries()
    test_rapidapi()
```

运行测试:
```bash
cd jackma/backend
python test_apis.py
```

---

## 🆘 常见问题

### Q1: API密钥无效
**A**: 
- 检查密钥是否正确复制（无多余空格）
- 确认密钥未过期
- 检查API服务是否正常

### Q2: 超出使用限额
**A**:
- 升级API套餐
- 启用缓存减少调用
- 优化查询逻辑

### Q3: API响应慢
**A**:
- 增加超时时间
- 使用异步请求
- 启用Redis缓存

### Q4: 某些API不工作
**A**:
- 检查API服务状态
- 查看错误日志
- 验证API密钥权限

---

## 📚 相关文档

- [API文档](../docs/03-api-reference/API_DOCUMENTATION.md)
- [快速启动指南](../docs/01-getting-started/QUICKSTART.md)
- [生产部署指南](./PRODUCTION_DEPLOYMENT_GUIDE.md)
- [故障排除](../docs/07-troubleshooting/CURRENT_ISSUES_AND_FIXES.md)

---

## 📞 获取帮助

如需帮助，请：
1. 查看API提供商的文档
2. 检查项目的故障排除文档
3. 在GitHub提交Issue
4. 联系技术支持

---

**最后更新**: 2025-11-10  
**版本**: 1.0.0

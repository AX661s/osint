# 🔧 环境变量配置说明

本目录包含多个环境变量配置文件，用于不同的场景。

---

## 📁 配置文件说明

### 1. `.env.template` - 配置模板（推荐）
**用途**: 完整的配置模板，包含所有可配置项和详细说明

**特点**:
- ✅ 包含所有API密钥配置项
- ✅ 详细的注释和说明
- ✅ 获取API密钥的链接
- ✅ 费用和免费额度信息

**使用方法**:
```bash
# 复制模板文件
cp .env.template .env

# 编辑.env文件，填入您的API密钥
nano .env  # 或使用其他编辑器
```

---

### 2. `.env.default` - 默认配置
**用途**: 包含从config.py提取的默认API密钥

**特点**:
- ✅ 可以直接使用（测试环境）
- ⚠️ 包含的是测试密钥，可能有限制
- ⚠️ 生产环境必须替换

**使用方法**:
```bash
# 快速开始（仅用于测试）
cp .env.default .env

# 启动服务
python -m uvicorn server:app --host 0.0.0.0 --port 8000
```

**警告**: 
- 这些默认密钥可能已过期或有使用限制
- 生产环境请务必使用自己的API密钥

---

### 3. `.env` - 实际配置文件
**用途**: 实际使用的环境变量文件

**特点**:
- ✅ 由.env.template或.env.default复制而来
- ✅ 包含您的真实API密钥
- ⚠️ 不应提交到版本控制

**安全提示**:
```bash
# 确保.env在.gitignore中
echo ".env" >> ../.gitignore

# 设置文件权限（Linux/Mac）
chmod 600 .env
```

---

## 🚀 快速开始

### 方式1: 使用交互式配置向导（推荐）

```bash
cd jackma/backend
python setup_env.py
```

这将启动一个交互式向导，引导您配置所有API密钥。

---

### 方式2: 手动配置

#### 步骤1: 复制模板
```bash
cd jackma/backend
cp .env.template .env
```

#### 步骤2: 编辑配置
使用文本编辑器打开`.env`文件：

```bash
# Windows
notepad .env

# Linux/Mac
nano .env
# 或
vim .env
```

#### 步骤3: 填入API密钥

必需的API密钥：
```env
HIBP_API_KEY=your_actual_key_here
OSINT_INDUSTRIES_API_KEY=your_actual_key_here
RAPIDAPI_KEY=your_actual_key_here
```

#### 步骤4: 测试配置
```bash
python test_api_keys.py
```

---

### 方式3: 使用默认配置（仅测试）

```bash
cd jackma/backend
cp .env.default .env
python test_api_keys.py
```

---

## 🔑 获取API密钥

### 必需的API密钥

#### 1. Have I Been Pwned (HIBP)
- **网址**: https://haveibeenpwned.com/API/Key
- **费用**: $3.50/月
- **用途**: 邮箱数据泄露查询

#### 2. OSINT Industries
- **网址**: https://osint.industries/
- **费用**: 按查询计费
- **用途**: 综合邮箱OSINT查询

#### 3. RapidAPI
- **网址**: https://rapidapi.com/
- **费用**: 免费套餐可用
- **用途**: 多个API服务的统一密钥

### 详细指南
完整的API密钥获取指南请参见：`API_KEYS_CONFIGURATION.md`

---

## 🧪 测试配置

### 测试所有API密钥
```bash
cd jackma/backend
python test_api_keys.py
```

### 测试输出示例
```
🔑 OSINT Tracker - API密钥配置测试
============================================================

📌 必需的API密钥:
------------------------------------------------------------
✅ Have I Been Pwned: API working (Status: 404)
✅ OSINT Industries: API key configured (format valid)
✅ RapidAPI: API key configured (format valid)

🎯 推荐的API密钥:
------------------------------------------------------------
✅ IPQualityScore: API working
⚠️  WhatsApp: WHATSAPP_API_KEY not configured

📊 测试总结:
============================================================
必需API: 3/3 通过
推荐API: 1/2 配置
可选API: 0/3 配置
```

---

## 📊 配置优先级

系统按以下优先级读取配置：

1. **环境变量** (最高优先级)
   ```bash
   export HIBP_API_KEY=your_key
   ```

2. **.env文件**
   ```env
   HIBP_API_KEY=your_key
   ```

3. **config.py中的默认值** (最低优先级)
   ```python
   HIBP_API_KEY = os.environ.get('HIBP_API_KEY', 'default_key')
   ```

---

## 🔒 安全最佳实践

### 1. 保护.env文件
```bash
# 添加到.gitignore
echo ".env" >> ../.gitignore

# 设置文件权限（Linux/Mac）
chmod 600 .env

# 验证文件不会被提交
git status
```

### 2. 定期更换密钥
- 建议每3-6个月更换一次
- 发现泄露立即更换
- 使用密钥管理服务

### 3. 环境隔离
```env
# 开发环境
APP_ENV=development
DEBUG=true

# 生产环境
APP_ENV=production
DEBUG=false
```

### 4. 监控使用量
- 定期检查API使用统计
- 设置使用限额告警
- 启用缓存减少调用

---

## 🆘 常见问题

### Q1: .env文件不生效？
**A**: 
```bash
# 1. 确认文件名正确（不是.env.txt）
ls -la .env

# 2. 确认文件在正确的目录
pwd  # 应该在 jackma/backend

# 3. 重启服务器
```

### Q2: API密钥无效？
**A**:
```bash
# 1. 检查密钥是否正确复制（无空格）
# 2. 运行测试脚本
python test_api_keys.py

# 3. 检查API服务状态
```

### Q3: 如何使用多个环境？
**A**:
```bash
# 开发环境
cp .env.template .env.development

# 生产环境
cp .env.template .env.production

# 使用时指定
python -m uvicorn server:app --env-file .env.development
```

### Q4: 默认密钥能用多久？
**A**:
- 默认密钥仅供测试使用
- 可能随时失效或有限制
- 生产环境必须使用自己的密钥

---

## 📚 相关文档

- [API密钥配置完整指南](./API_KEYS_CONFIGURATION.md)
- [生产部署指南](./PRODUCTION_DEPLOYMENT_GUIDE.md)
- [API文档](../docs/03-api-reference/API_DOCUMENTATION.md)
- [快速启动指南](../docs/01-getting-started/QUICKSTART.md)

---

## 🔄 配置文件对比

| 文件 | 用途 | 包含密钥 | 提交到Git | 适用场景 |
|------|------|----------|-----------|----------|
| `.env.template` | 配置模板 | ❌ | ✅ | 新项目配置 |
| `.env.default` | 默认配置 | ✅ | ✅ | 快速测试 |
| `.env` | 实际配置 | ✅ | ❌ | 生产使用 |
| `.env.example` | 示例配置 | ❌ | ✅ | 文档参考 |

---

## 📞 获取帮助

如需帮助，请：
1. 查看 `API_KEYS_CONFIGURATION.md`
2. 运行 `python test_api_keys.py`
3. 查看 `../docs/07-troubleshooting/`
4. 在GitHub提交Issue

---

**最后更新**: 2025-11-10  
**版本**: 1.0.0

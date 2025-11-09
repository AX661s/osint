"""
环境变量快速配置脚本
交互式帮助用户配置API密钥
"""
import os
import sys
from pathlib import Path

def print_header(text):
    """打印标题"""
    print("\n" + "="*60)
    print(f"  {text}")
    print("="*60 + "\n")

def print_section(text):
    """打印章节"""
    print(f"\n📌 {text}")
    print("-" * 60)

def get_input(prompt, default="", required=False):
    """获取用户输入"""
    if default:
        prompt = f"{prompt} [{default}]: "
    else:
        prompt = f"{prompt}: "
    
    while True:
        value = input(prompt).strip()
        if not value and default:
            return default
        if not value and required:
            print("❌ 此项为必填项，请输入有效值")
            continue
        return value

def confirm(prompt):
    """确认操作"""
    response = input(f"{prompt} (y/n): ").strip().lower()
    return response in ['y', 'yes']

def create_env_file():
    """创建.env文件"""
    print_header("🔑 OSINT Tracker - 环境变量配置向导")
    
    print("本向导将帮助您配置OSINT Tracker所需的API密钥。")
    print("您可以跳过可选项，稍后再配置。")
    
    if not confirm("\n是否继续？"):
        print("配置已取消。")
        return
    
    env_vars = {}
    
    # 必需的API密钥
    print_section("必需的API密钥")
    
    print("\n1. Have I Been Pwned (HIBP)")
    print("   用途: 邮箱数据泄露查询")
    print("   获取: https://haveibeenpwned.com/API/Key")
    print("   费用: $3.50/月")
    hibp_key = get_input("   请输入HIBP API密钥", required=True)
    env_vars['HIBP_API_KEY'] = hibp_key
    
    print("\n2. OSINT Industries")
    print("   用途: 综合邮箱OSINT查询")
    print("   获取: https://osint.industries/")
    osint_key = get_input("   请输入OSINT Industries API密钥", required=True)
    env_vars['OSINT_INDUSTRIES_API_KEY'] = osint_key
    
    print("\n3. RapidAPI")
    print("   用途: 多个API服务的统一密钥")
    print("   获取: https://rapidapi.com/")
    rapid_key = get_input("   请输入RapidAPI密钥", required=True)
    env_vars['RAPIDAPI_KEY'] = rapid_key
    
    # 推荐的API密钥
    print_section("推荐的API密钥（可选）")
    
    if confirm("\n是否配置推荐的API密钥？"):
        print("\n4. IPQualityScore")
        print("   用途: 电话号码质量评分")
        print("   获取: https://www.ipqualityscore.com/")
        print("   免费额度: 5,000次/月")
        ipqs_key = get_input("   请输入IPQS API密钥（回车跳过）")
        if ipqs_key:
            env_vars['IPQS_API_KEY'] = ipqs_key
        
        print("\n5. Truecaller (RapidAPI)")
        print("   用途: 电话号码详细信息")
        truecaller_key = get_input("   请输入Truecaller密钥（回车使用RapidAPI密钥）")
        if truecaller_key:
            env_vars['TRUECALLER_RAPIDAPI_KEY'] = truecaller_key
        
        print("\n6. Caller ID (RapidAPI)")
        print("   用途: 来电显示")
        caller_key = get_input("   请输入Caller ID密钥（回车使用RapidAPI密钥）")
        if caller_key:
            env_vars['CALLER_ID_RAPIDAPI_KEY'] = caller_key
    
    # 可选的API密钥
    print_section("可选的API密钥")
    
    if confirm("\n是否配置可选的API密钥？"):
        print("\n7. WhatsApp验证")
        whatsapp_key = get_input("   请输入WhatsApp API密钥（回车跳过）")
        if whatsapp_key:
            env_vars['WHATSAPP_API_KEY'] = whatsapp_key
        
        print("\n8. OpenAI (GPT)")
        print("   用途: AI数据分析")
        openai_key = get_input("   请输入OpenAI API密钥（回车跳过）")
        if openai_key:
            env_vars['OPENAI_API_KEY'] = openai_key
        
        print("\n9. SerpAPI")
        print("   用途: Google搜索结果")
        serp_key = get_input("   请输入SerpAPI密钥（回车跳过）")
        if serp_key:
            env_vars['SERPAPI_KEY'] = serp_key
    
    # 系统配置
    print_section("系统配置")
    
    print("\n环境设置:")
    env = get_input("   应用环境 (development/production)", default="production")
    env_vars['APP_ENV'] = env
    
    debug = get_input("   调试模式 (true/false)", default="false")
    env_vars['DEBUG'] = debug
    
    # 安全配置
    print("\n安全配置:")
    print("   生成随机密钥...")
    import secrets
    secret_key = secrets.token_hex(32)
    env_vars['SECRET_KEY'] = secret_key
    print(f"   ✅ 已生成SECRET_KEY")
    
    # CORS配置
    print("\nCORS配置:")
    cors = get_input("   允许的域名（逗号分隔）", 
                     default="http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,http://127.0.0.1:8000")
    env_vars['CORS_ORIGINS'] = cors
    
    # 生成.env文件
    print_section("生成配置文件")
    
    env_file = Path(__file__).parent / '.env'
    
    if env_file.exists():
        if not confirm(f"\n⚠️  文件 {env_file} 已存在，是否覆盖？"):
            backup_file = env_file.with_suffix('.env.backup')
            print(f"   备份现有文件到: {backup_file}")
            import shutil
            shutil.copy(env_file, backup_file)
    
    print(f"\n正在生成 {env_file}...")
    
    with open(env_file, 'w', encoding='utf-8') as f:
        f.write("# ============================================\n")
        f.write("# OSINT Tracker - 环境变量配置\n")
        f.write("# 自动生成于配置向导\n")
        f.write("# ============================================\n\n")
        
        # 必需的API密钥
        f.write("# 必需的API密钥\n")
        f.write(f"HIBP_API_KEY={env_vars.get('HIBP_API_KEY', '')}\n")
        f.write(f"OSINT_INDUSTRIES_API_KEY={env_vars.get('OSINT_INDUSTRIES_API_KEY', '')}\n")
        f.write(f"RAPIDAPI_KEY={env_vars.get('RAPIDAPI_KEY', '')}\n\n")
        
        # 推荐的API密钥
        if any(k in env_vars for k in ['IPQS_API_KEY', 'TRUECALLER_RAPIDAPI_KEY', 'CALLER_ID_RAPIDAPI_KEY']):
            f.write("# 推荐的API密钥\n")
            if 'IPQS_API_KEY' in env_vars:
                f.write(f"IPQS_API_KEY={env_vars['IPQS_API_KEY']}\n")
            if 'TRUECALLER_RAPIDAPI_KEY' in env_vars:
                f.write(f"TRUECALLER_RAPIDAPI_KEY={env_vars['TRUECALLER_RAPIDAPI_KEY']}\n")
            if 'CALLER_ID_RAPIDAPI_KEY' in env_vars:
                f.write(f"CALLER_ID_RAPIDAPI_KEY={env_vars['CALLER_ID_RAPIDAPI_KEY']}\n")
            f.write("\n")
        
        # 可选的API密钥
        if any(k in env_vars for k in ['WHATSAPP_API_KEY', 'OPENAI_API_KEY', 'SERPAPI_KEY']):
            f.write("# 可选的API密钥\n")
            if 'WHATSAPP_API_KEY' in env_vars:
                f.write(f"WHATSAPP_API_KEY={env_vars['WHATSAPP_API_KEY']}\n")
            if 'OPENAI_API_KEY' in env_vars:
                f.write(f"OPENAI_API_KEY={env_vars['OPENAI_API_KEY']}\n")
            if 'SERPAPI_KEY' in env_vars:
                f.write(f"SERPAPI_KEY={env_vars['SERPAPI_KEY']}\n")
            f.write("\n")
        
        # 系统配置
        f.write("# 系统配置\n")
        f.write(f"APP_ENV={env_vars.get('APP_ENV', 'production')}\n")
        f.write(f"DEBUG={env_vars.get('DEBUG', 'false')}\n")
        f.write(f"SECRET_KEY={env_vars.get('SECRET_KEY', '')}\n")
        f.write(f"CORS_ORIGINS={env_vars.get('CORS_ORIGINS', '')}\n\n")
        
        # 超时配置
        f.write("# 超时配置\n")
        f.write("DEFAULT_TIMEOUT=15\n")
        f.write("LONG_TIMEOUT=30\n")
        f.write("OSINT_INDUSTRIES_TIMEOUT=110\n\n")
        
        # 数据库配置
        f.write("# 数据库配置（可选）\n")
        f.write("# MONGO_URL=mongodb://localhost:27017/\n")
        f.write("# DB_NAME=jackma_db\n\n")
        
        # Redis配置
        f.write("# Redis配置（可选）\n")
        f.write("# REDIS_HOST=localhost\n")
        f.write("# REDIS_PORT=6379\n")
        f.write("# REDIS_PASSWORD=\n")
        f.write("# REDIS_DB=0\n")
    
    print("✅ 配置文件已生成！")
    
    # 测试配置
    print_section("测试配置")
    
    if confirm("\n是否立即测试API配置？"):
        print("\n正在测试API配置...")
        os.system(f"{sys.executable} test_api_keys.py")
    
    # 完成
    print_header("✅ 配置完成！")
    
    print("下一步:")
    print("1. 检查 .env 文件确认配置正确")
    print("2. 运行 'python test_api_keys.py' 测试API")
    print("3. 启动服务器: 'python -m uvicorn server:app --host 0.0.0.0 --port 8000'")
    print("\n详细文档: API_KEYS_CONFIGURATION.md")

if __name__ == '__main__':
    try:
        create_env_file()
    except KeyboardInterrupt:
        print("\n\n❌ 配置已取消。")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ 错误: {str(e)}")
        sys.exit(1)

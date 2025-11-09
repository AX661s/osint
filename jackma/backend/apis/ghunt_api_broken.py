""""""

GHunt API集成模块GHunt API 封装模块

为OSINT系统提供Google账户信息查询功能提供统一的GHunt查询接口

""""""

import asyncioimport logging

import subprocessfrom typing import Dict, Any, Optional

import json

import logginglogger = logging.getLogger(__name__)

import os

import tempfile

from typing import Dict, Any, Optionalasync def query_ghunt_email(email: str, timeout: int = 120) -> Dict[str, Any]:

from datetime import datetime    """

    使用GHunt查询Google账户信息

logger = logging.getLogger(__name__)    

    Args:

        email: 邮箱地址

class GHuntAPI:        timeout: 超时时间（秒）

    """GHunt API封装类"""    

        Returns:

    def __init__(self, ghunt_path: str = "/root/GHunt", timeout: int = 120):        查询结果字典

        """    """

        初始化GHunt API    try:

                # 导入GHunt服务

        Args:        from ghunt_service import run_ghunt_email_python, is_ghunt_authenticated

            ghunt_path: GHunt安装路径        

            timeout: 查询超时时间        # 检查GHunt是否已认证

        """        if not is_ghunt_authenticated():

        self.ghunt_path = ghunt_path            logger.warning("⚠️ [GHunt] Not authenticated, skipping query")

        self.timeout = timeout            return {

        self.logger = logger                "success": False,

                    "source": "ghunt",

    async def query_email(self, email: str) -> Dict[str, Any]:                "error": "GHunt not authenticated. Run 'ghunt login' first.",

        """                "authenticated": False

        查询Gmail账户信息            }

                

        Args:        logger.info(f"🔎 [GHunt] Querying email: {email}")

            email: 邮箱地址        

                    # 执行查询

        Returns:        result = run_ghunt_email_python(email, timeout=timeout)

            查询结果字典        

        """        if result.get("success"):

        try:            logger.info(f"✅ [GHunt] Query successful for: {email}")

            self.logger.info(f"🔍 开始GHunt邮箱查询: {email}")        else:

                        logger.warning(f"⚠️ [GHunt] Query failed for {email}: {result.get('error')}")

            # 创建临时文件保存结果        

            with tempfile.NamedTemporaryFile(mode='w+', suffix='.json', delete=False) as tmp_file:        return result

                tmp_path = tmp_file.name        

                except ImportError as e:

            try:        logger.error(f"❌ [GHunt] Import error: {str(e)}")

                # 构建命令        return {

                cmd = [            "success": False,

                    "python3", "-m", "ghunt.ghunt",             "source": "ghunt",

                    "email", email,             "error": f"GHunt module not found: {str(e)}. Install with: pip install ghunt"

                    "--json", tmp_path        }

                ]    except Exception as e:

                        logger.error(f"❌ [GHunt] Unexpected error: {str(e)}")

                # 在GHunt目录中执行命令        return {

                process = await asyncio.create_subprocess_exec(            "success": False,

                    *cmd,            "source": "ghunt",

                    cwd=self.ghunt_path,            "error": f"GHunt query error: {str(e)}"

                    stdout=asyncio.subprocess.PIPE,        }

                    stderr=asyncio.subprocess.PIPE

                )

                def format_ghunt_data(raw_data: Dict[str, Any]) -> Dict[str, Any]:

                # 等待命令完成    """

                stdout, stderr = await asyncio.wait_for(    格式化GHunt返回的数据，提取关键信息

                    process.communicate(),     

                    timeout=self.timeout    Args:

                )        raw_data: GHunt原始数据

                    

                # 检查返回码    Returns:

                if process.returncode == 0:        格式化后的数据

                    # 读取JSON结果    """

                    try:    if not raw_data or not isinstance(raw_data, dict):

                        with open(tmp_path, 'r', encoding='utf-8') as f:        return {}

                            ghunt_data = json.load(f)    

                            formatted = {

                        # 解析结果        "source": "ghunt",

                        return self._parse_ghunt_result(email, ghunt_data, stdout.decode())        "platform": "Google",

                            }

                    except (FileNotFoundError, json.JSONDecodeError) as e:    

                        # JSON文件不存在或格式错误，尝试解析stdout    # 提取基本信息

                        return self._parse_stdout_result(email, stdout.decode())    if "name" in raw_data:

                else:        formatted["name"] = raw_data["name"]

                    error_msg = stderr.decode() if stderr else "Unknown error"    

                    return self._create_error_result(email, error_msg)    if "gaia_id" in raw_data:

                            formatted["gaia_id"] = raw_data["gaia_id"]

            finally:    

                # 清理临时文件    if "profile_pic" in raw_data or "profile_picture" in raw_data:

                try:        formatted["avatar"] = raw_data.get("profile_pic") or raw_data.get("profile_picture")

                    os.unlink(tmp_path)    

                except:    # 提取服务列表

                    pass    if "services" in raw_data and isinstance(raw_data["services"], list):

                            formatted["services"] = raw_data["services"]

        except asyncio.TimeoutError:    

            self.logger.error(f"⏰ GHunt查询超时: {email}")    # 提取最后编辑时间

            return self._create_error_result(email, "Query timeout")    if "last_edit" in raw_data:

                    formatted["last_edit"] = raw_data["last_edit"]

        except Exception as e:    

            self.logger.error(f"❌ GHunt查询失败: {email}, 错误: {str(e)}")    # 提取其他可用信息

            return self._create_error_result(email, str(e))    for key in ["email", "phone", "location", "bio", "url"]:

            if key in raw_data and raw_data[key]:

    def _parse_ghunt_result(self, email: str, ghunt_data: Dict, stdout: str) -> Dict[str, Any]:            formatted[key] = raw_data[key]

        """解析GHunt JSON结果"""    

        try:    return formatted

            result = {

                "success": True,

                "email": email,async def query_ghunt_with_fallback(email: str, timeout: int = 120) -> Dict[str, Any]:

                "query_time": datetime.utcnow().isoformat(),    """

                "source": "ghunt",    带降级的GHunt查询

                "data": {    如果GHunt不可用，返回友好的错误信息而不是抛出异常

                    "basic_info": {},    

                    "google_services": {},    Args:

                    "maps_data": {},        email: 邮箱地址

                    "calendar_data": {},        timeout: 超时时间

                    "play_games": {}    

                }    Returns:

            }        查询结果

                """

            # 解析基本信息    try:

            if "gaia_id" in ghunt_data:        result = await query_ghunt_email(email, timeout)

                result["data"]["basic_info"]["gaia_id"] = ghunt_data["gaia_id"]        

            if "name" in ghunt_data:        # 如果查询成功，格式化数据

                result["data"]["basic_info"]["name"] = ghunt_data["name"]        if result.get("success") and result.get("data"):

            if "profile_pic" in ghunt_data:            formatted_data = format_ghunt_data(result["data"])

                result["data"]["basic_info"]["profile_pic"] = ghunt_data["profile_pic"]            result["formatted_data"] = formatted_data

            if "last_edit" in ghunt_data:        

                result["data"]["basic_info"]["last_edit"] = ghunt_data["last_edit"]        return result

                except Exception as e:

            # 解析Google服务        logger.error(f"❌ [GHunt] Fallback error: {str(e)}")

            if "services" in ghunt_data:        return {

                result["data"]["google_services"] = ghunt_data["services"]            "success": False,

                        "source": "ghunt",

            # 解析地图数据            "error": f"GHunt unavailable: {str(e)}",

            if "maps" in ghunt_data:            "fallback": True

                result["data"]["maps_data"] = ghunt_data["maps"]        }

            
            # 如果没有有效数据，标记为无结果
            if not any(result["data"].values()):
                result["success"] = False
                result["error"] = "No public information available"
            
            return result
            
        except Exception as e:
            return self._create_error_result(email, f"Failed to parse result: {str(e)}")
    
    def _parse_stdout_result(self, email: str, stdout: str) -> Dict[str, Any]:
        """解析stdout文本结果"""
        try:
            result = {
                "success": True,
                "email": email,
                "query_time": datetime.utcnow().isoformat(),
                "source": "ghunt",
                "data": {
                    "basic_info": {},
                    "google_services": {},
                    "maps_data": {},
                    "raw_output": stdout
                }
            }
            
            lines = stdout.split('\n')
            
            # 解析基本信息
            for line in lines:
                line = line.strip()
                
                if "Email :" in line:
                    result["data"]["basic_info"]["email"] = line.split("Email :")[1].strip()
                elif "Gaia ID :" in line:
                    result["data"]["basic_info"]["gaia_id"] = line.split("Gaia ID :")[1].strip()
                elif "=> https://lh3.googleusercontent.com" in line:
                    result["data"]["basic_info"]["profile_pic"] = line.replace("=>", "").strip()
                elif "Last profile edit :" in line:
                    result["data"]["basic_info"]["last_edit"] = line.split("Last profile edit :")[1].strip()
                elif "Reviews :" in line:
                    result["data"]["maps_data"]["reviews"] = line.split("Reviews :")[1].strip()
                elif "Photos :" in line and "maps" not in line.lower():
                    result["data"]["maps_data"]["photos"] = line.split("Photos :")[1].strip()
                elif "Answers :" in line:
                    result["data"]["maps_data"]["answers"] = line.split("Answers :")[1].strip()
            
            # 检查是否为私密账户
            if "No public" in stdout or "private" in stdout.lower():
                result["data"]["privacy_note"] = "Account has limited public information"
            
            return result
            
        except Exception as e:
            return self._create_error_result(email, f"Failed to parse stdout: {str(e)}")
    
    def _create_error_result(self, email: str, error: str) -> Dict[str, Any]:
        """创建错误结果"""
        return {
            "success": False,
            "email": email,
            "query_time": datetime.utcnow().isoformat(),
            "source": "ghunt",
            "error": error,
            "data": {}
        }


# 全局GHunt API实例
ghunt_api = GHuntAPI()


async def query_ghunt_email(email: str, timeout: int = 120) -> Dict[str, Any]:
    """
    查询Gmail账户信息的便捷函数
    
    Args:
        email: 邮箱地址
        timeout: 超时时间
        
    Returns:
        查询结果
    """
    try:
        # 设置超时
        original_timeout = ghunt_api.timeout
        ghunt_api.timeout = timeout
        
        # 执行查询
        result = await ghunt_api.query_email(email)
        
        return result
        
    except Exception as e:
        logger.error(f"❌ GHunt查询异常: {email}, {str(e)}")
        return {
            "success": False,
            "email": email,
            "query_time": datetime.utcnow().isoformat(),
            "source": "ghunt",
            "error": str(e),
            "data": {}
        }
    finally:
        # 恢复原始超时设置
        ghunt_api.timeout = original_timeout


async def query_ghunt_with_fallback(email: str, timeout: int = 60) -> Dict[str, Any]:
    """
    带降级处理的GHunt查询
    如果GHunt失败，返回友好的错误信息
    
    Args:
        email: 邮箱地址
        timeout: 超时时间
        
    Returns:
        查询结果
    """
    try:
        result = await query_ghunt_email(email, timeout)
        
        # 如果查询成功但没有数据，给出友好提示
        if result.get("success") and not result.get("data", {}).get("basic_info"):
            result["data"]["note"] = "This Gmail account appears to have limited public information available"
        
        return result
        
    except Exception as e:
        logger.warning(f"⚠️ GHunt查询降级: {email}")
        return {
            "success": False,
            "email": email,
            "query_time": datetime.utcnow().isoformat(),
            "source": "ghunt",
            "error": "GHunt service temporarily unavailable",
            "data": {"note": "Gmail OSINT functionality is currently unavailable"}
        }


# 测试函数
async def test_ghunt():
    """测试GHunt功能"""
    test_emails = [
        "test@gmail.com",
        "inesbrady@gmail.com"  # 已知有数据的邮箱
    ]
    
    for email in test_emails:
        print(f"\n🔍 测试查询: {email}")
        result = await query_ghunt_email(email)
        
        if result["success"]:
            print(f"✅ 查询成功")
            print(f"📧 邮箱: {result['email']}")
            
            basic_info = result["data"].get("basic_info", {})
            if basic_info.get("gaia_id"):
                print(f"🆔 Gaia ID: {basic_info['gaia_id']}")
            if basic_info.get("profile_pic"):
                print(f"🖼️ 头像: {basic_info['profile_pic']}")
            
            maps_data = result["data"].get("maps_data", {})
            if maps_data:
                print(f"🗺️ 地图数据: {maps_data}")
                
        else:
            print(f"❌ 查询失败: {result.get('error')}")


if __name__ == "__main__":
    # 运行测试
    asyncio.run(test_ghunt())
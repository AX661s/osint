"""
API数据模型
"""
from typing import Dict, List, Any, Optional
from pydantic import BaseModel


class PhoneQueryResult(BaseModel):
    """电话查询结果"""
    success: bool
    phone: str
    data: Optional[List[Dict[str, Any]]] = None
    error: Optional[str] = None


class EmailQueryResult(BaseModel):
    """邮箱查询结果"""
    success: bool
    email: str
    data: Optional[List[Dict[str, Any]]] = None
    error: Optional[str] = None

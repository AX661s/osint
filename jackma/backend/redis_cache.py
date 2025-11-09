"""
Redis缓存层实现
提供高性能的分布式缓存服务
"""
import json
import logging
from typing import Optional, Dict, Any
import redis.asyncio as redis
from datetime import timedelta
import os

logger = logging.getLogger(__name__)

# Redis配置
REDIS_HOST = os.environ.get('REDIS_HOST', 'localhost')
REDIS_PORT = int(os.environ.get('REDIS_PORT', 6379))
REDIS_DB = int(os.environ.get('REDIS_DB', 0))
REDIS_PASSWORD = os.environ.get('REDIS_PASSWORD', None)

# 缓存TTL配置
CACHE_TTL_SHORT = 3600  # 1小时
CACHE_TTL_MEDIUM = 21600  # 6小时
CACHE_TTL_LONG = 86400  # 24小时


class RedisCache:
    """Redis缓存管理器"""
    
    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None
        self._initialized = False
    
    async def initialize(self):
        """初始化Redis连接"""
        if self._initialized:
            return
        
        try:
            self.redis_client = redis.Redis(
                host=REDIS_HOST,
                port=REDIS_PORT,
                db=REDIS_DB,
                password=REDIS_PASSWORD,
                decode_responses=True,
                max_connections=50,  # 连接池大小
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True
            )
            
            # 测试连接
            await self.redis_client.ping()
            self._initialized = True
            logger.info(f"✅ Redis连接成功: {REDIS_HOST}:{REDIS_PORT}")
        except Exception as e:
            logger.error(f"❌ Redis连接失败: {str(e)}")
            self.redis_client = None
            self._initialized = False
    
    async def close(self):
        """关闭Redis连接"""
        if self.redis_client:
            await self.redis_client.close()
            logger.info("✅ Redis连接已关闭")
    
    def _generate_key(self, query: str, query_type: str) -> str:
        """生成缓存键"""
        return f"osint:{query_type}:{query}"
    
    async def get(self, query: str, query_type: str) -> Optional[Dict[str, Any]]:
        """
        获取缓存数据
        
        Args:
            query: 查询内容 (邮箱/手机号)
            query_type: 查询类型 ('email' 或 'phone')
        
        Returns:
            缓存的查询结果，如果不存在则返回None
        """
        if not self.redis_client:
            return None
        
        try:
            key = self._generate_key(query, query_type)
            cached_data = await self.redis_client.get(key)
            
            if cached_data:
                logger.info(f"✅ Redis缓存命中: {query_type}:{query}")
                return json.loads(cached_data)
            
            logger.info(f"❌ Redis缓存未命中: {query_type}:{query}")
            return None
        except Exception as e:
            logger.error(f"❌ Redis获取缓存失败: {str(e)}")
            return None
    
    async def set(
        self,
        query: str,
        query_type: str,
        data: Dict[str, Any],
        ttl: int = CACHE_TTL_LONG
    ) -> bool:
        """
        设置缓存数据
        
        Args:
            query: 查询内容
            query_type: 查询类型
            data: 要缓存的数据
            ttl: 过期时间（秒）
        
        Returns:
            是否设置成功
        """
        if not self.redis_client:
            return False
        
        try:
            key = self._generate_key(query, query_type)
            serialized_data = json.dumps(data, ensure_ascii=False)
            
            await self.redis_client.setex(
                key,
                ttl,
                serialized_data
            )
            
            logger.info(f"✅ Redis缓存已设置: {query_type}:{query} (TTL: {ttl}s)")
            return True
        except Exception as e:
            logger.error(f"❌ Redis设置缓存失败: {str(e)}")
            return False
    
    async def delete(self, query: str, query_type: str) -> bool:
        """
        删除缓存
        
        Args:
            query: 查询内容
            query_type: 查询类型
        
        Returns:
            是否删除成功
        """
        if not self.redis_client:
            return False
        
        try:
            key = self._generate_key(query, query_type)
            result = await self.redis_client.delete(key)
            
            if result:
                logger.info(f"✅ Redis缓存已删除: {query_type}:{query}")
            return bool(result)
        except Exception as e:
            logger.error(f"❌ Redis删除缓存失败: {str(e)}")
            return False
    
    async def exists(self, query: str, query_type: str) -> bool:
        """
        检查缓存是否存在
        
        Args:
            query: 查询内容
            query_type: 查询类型
        
        Returns:
            缓存是否存在
        """
        if not self.redis_client:
            return False
        
        try:
            key = self._generate_key(query, query_type)
            result = await self.redis_client.exists(key)
            return bool(result)
        except Exception as e:
            logger.error(f"❌ Redis检查缓存失败: {str(e)}")
            return False
    
    async def get_ttl(self, query: str, query_type: str) -> int:
        """
        获取缓存剩余过期时间
        
        Args:
            query: 查询内容
            query_type: 查询类型
        
        Returns:
            剩余秒数，-1表示永不过期，-2表示不存在
        """
        if not self.redis_client:
            return -2
        
        try:
            key = self._generate_key(query, query_type)
            ttl = await self.redis_client.ttl(key)
            return ttl
        except Exception as e:
            logger.error(f"❌ Redis获取TTL失败: {str(e)}")
            return -2
    
    async def clear_pattern(self, pattern: str) -> int:
        """
        清除匹配模式的所有缓存
        
        Args:
            pattern: 匹配模式 (例如: "osint:phone:*")
        
        Returns:
            删除的键数量
        """
        if not self.redis_client:
            return 0
        
        try:
            keys = []
            async for key in self.redis_client.scan_iter(match=pattern):
                keys.append(key)
            
            if keys:
                deleted = await self.redis_client.delete(*keys)
                logger.info(f"✅ Redis批量删除缓存: {deleted}个键")
                return deleted
            return 0
        except Exception as e:
            logger.error(f"❌ Redis批量删除失败: {str(e)}")
            return 0
    
    async def get_stats(self) -> Dict[str, Any]:
        """
        获取Redis统计信息
        
        Returns:
            统计信息字典
        """
        if not self.redis_client:
            return {"error": "Redis未连接"}
        
        try:
            info = await self.redis_client.info()
            
            # 统计OSINT相关的键
            email_count = 0
            phone_count = 0
            
            async for key in self.redis_client.scan_iter(match="osint:email:*"):
                email_count += 1
            
            async for key in self.redis_client.scan_iter(match="osint:phone:*"):
                phone_count += 1
            
            return {
                "connected": True,
                "redis_version": info.get("redis_version"),
                "used_memory_human": info.get("used_memory_human"),
                "connected_clients": info.get("connected_clients"),
                "total_commands_processed": info.get("total_commands_processed"),
                "keyspace_hits": info.get("keyspace_hits", 0),
                "keyspace_misses": info.get("keyspace_misses", 0),
                "hit_rate": self._calculate_hit_rate(
                    info.get("keyspace_hits", 0),
                    info.get("keyspace_misses", 0)
                ),
                "osint_email_keys": email_count,
                "osint_phone_keys": phone_count,
                "total_osint_keys": email_count + phone_count
            }
        except Exception as e:
            logger.error(f"❌ Redis获取统计信息失败: {str(e)}")
            return {"error": str(e)}
    
    def _calculate_hit_rate(self, hits: int, misses: int) -> str:
        """计算缓存命中率"""
        total = hits + misses
        if total == 0:
            return "0.00%"
        rate = (hits / total) * 100
        return f"{rate:.2f}%"


# 全局Redis缓存实例
redis_cache = RedisCache()


async def get_redis_cache() -> RedisCache:
    """获取Redis缓存实例（用于依赖注入）"""
    if not redis_cache._initialized:
        await redis_cache.initialize()
    return redis_cache


# 三层缓存策略
async def get_cached_result(
    query: str,
    query_type: str,
    db_session=None
) -> Optional[Dict[str, Any]]:
    """
    三层缓存查询策略
    L1: Redis缓存 (< 10ms)
    L2: 数据库缓存 (50-100ms)
    L3: 实时查询 (15-30s)
    
    Args:
        query: 查询内容
        query_type: 查询类型
        db_session: 数据库会话（可选）
    
    Returns:
        查询结果或None
    """
    # L1: Redis缓存
    cache = await get_redis_cache()
    redis_result = await cache.get(query, query_type)
    if redis_result:
        logger.info(f"🚀 L1缓存命中 (Redis): {query_type}:{query}")
        return redis_result
    
    # L2: 数据库缓存
    if db_session:
        from db_operations import get_cache
        db_result = get_cache(db_session, query, query_type)
        if db_result:
            logger.info(f"💾 L2缓存命中 (Database): {query_type}:{query}")
            # 回填Redis缓存
            await cache.set(query, query_type, db_result, CACHE_TTL_MEDIUM)
            return db_result
    
    logger.info(f"❌ 缓存未命中，需要实时查询: {query_type}:{query}")
    return None


async def save_cached_result(
    query: str,
    query_type: str,
    data: Dict[str, Any],
    db_session=None,
    ttl: int = CACHE_TTL_LONG
) -> bool:
    """
    保存结果到所有缓存层
    
    Args:
        query: 查询内容
        query_type: 查询类型
        data: 查询结果
        db_session: 数据库会话（可选）
        ttl: Redis缓存过期时间
    
    Returns:
        是否保存成功
    """
    success = True
    
    # 保存到Redis
    cache = await get_redis_cache()
    redis_success = await cache.set(query, query_type, data, ttl)
    if redis_success:
        logger.info(f"✅ 结果已保存到Redis: {query_type}:{query}")
    else:
        success = False
    
    # 保存到数据库
    if db_session:
        try:
            from db_operations import save_cache
            save_cache(db_session, query, query_type, data, ttl_hours=ttl//3600)
            logger.info(f"✅ 结果已保存到数据库: {query_type}:{query}")
        except Exception as e:
            logger.error(f"❌ 保存到数据库失败: {str(e)}")
            success = False
    
    return success

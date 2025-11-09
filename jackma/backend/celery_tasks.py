"""
Celery异步任务队列
处理耗时的OSINT查询任务
"""
from celery import Celery, Task
from celery.result import AsyncResult
import logging
import os
from typing import Dict, Any
import json
from datetime import datetime

logger = logging.getLogger(__name__)

# Celery配置
REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379')
CELERY_BROKER_URL = f"{REDIS_URL}/0"  # Redis DB 0 作为消息队列
CELERY_RESULT_BACKEND = f"{REDIS_URL}/1"  # Redis DB 1 存储任务结果

# 创建Celery应用
celery_app = Celery(
    'osint_tracker',
    broker=CELERY_BROKER_URL,
    backend=CELERY_RESULT_BACKEND
)

# Celery配置
celery_app.conf.update(
    # 任务序列化
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    
    # 任务结果配置
    result_expires=3600,  # 结果保留1小时
    result_backend_transport_options={
        'master_name': 'mymaster',
        'visibility_timeout': 3600,
    },
    
    # 任务执行配置
    task_acks_late=True,  # 任务完成后才确认
    task_reject_on_worker_lost=True,  # Worker丢失时拒绝任务
    task_time_limit=300,  # 任务最大执行时间5分钟
    task_soft_time_limit=240,  # 软超时4分钟
    
    # Worker配置
    worker_prefetch_multiplier=1,  # 每次只预取1个任务
    worker_max_tasks_per_child=100,  # 每个worker最多执行100个任务后重启
    
    # 重试配置
    task_default_retry_delay=60,  # 默认重试延迟60秒
    task_max_retries=3,  # 最多重试3次
)


class CallbackTask(Task):
    """带回调的任务基类"""
    
    def on_success(self, retval, task_id, args, kwargs):
        """任务成功时的回调"""
        logger.info(f"✅ 任务成功: {task_id}")
    
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """任务失败时的回调"""
        logger.error(f"❌ 任务失败: {task_id}, 错误: {str(exc)}")
    
    def on_retry(self, exc, task_id, args, kwargs, einfo):
        """任务重试时的回调"""
        logger.warning(f"⚠️ 任务重试: {task_id}, 原因: {str(exc)}")


@celery_app.task(
    bind=True,
    base=CallbackTask,
    name='osint_tracker.query_phone',
    max_retries=3,
    default_retry_delay=60
)
def async_query_phone(self, phone: str, timeout: int = 120) -> Dict[str, Any]:
    """
    异步执行手机号查询
    
    Args:
        phone: 手机号
        timeout: 超时时间
    
    Returns:
        查询结果字典
    """
    try:
        logger.info(f"🔍 开始异步查询手机号: {phone}")
        
        # 更新任务状态
        self.update_state(
            state='PROCESSING',
            meta={
                'phone': phone,
                'status': 'Querying external APIs...',
                'progress': 10
            }
        )
        
        # 导入查询函数（延迟导入避免循环依赖）
        import asyncio
        from apis import query_phone_comprehensive
        
        # 在新的事件循环中执行异步查询
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(query_phone_comprehensive(phone))
            result_dict = result.model_dump() if hasattr(result, 'model_dump') else result
        finally:
            loop.close()
        
        # 更新进度
        self.update_state(
            state='PROCESSING',
            meta={
                'phone': phone,
                'status': 'Saving results...',
                'progress': 80
            }
        )
        
        # 保存到数据库和缓存
        from models import SessionLocal
        from db_operations import save_phone_query
        from redis_cache import save_cached_result
        
        db_session = SessionLocal()
        try:
            # 保存到数据库
            success = result_dict.get('success', False)
            error_msg = result_dict.get('error', None)
            save_phone_query(
                db=db_session,
                phone=phone,
                result=result_dict,
                success=success,
                error=error_msg
            )
            
            # 保存到Redis缓存
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                loop.run_until_complete(
                    save_cached_result(phone, "phone", result_dict, db_session)
                )
            finally:
                loop.close()
            
        finally:
            db_session.close()
        
        logger.info(f"✅ 手机号查询完成: {phone}")
        
        return {
            'success': True,
            'phone': phone,
            'data': result_dict,
            'completed_at': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"❌ 手机号查询失败: {phone}, 错误: {error_msg}")
        
        # 重试逻辑
        if self.request.retries < self.max_retries:
            logger.info(f"⚠️ 准备重试 ({self.request.retries + 1}/{self.max_retries})")
            raise self.retry(exc=e, countdown=60)
        
        # 最终失败，返回错误结果
        return {
            'success': False,
            'phone': phone,
            'error': error_msg,
            'completed_at': datetime.utcnow().isoformat()
        }


@celery_app.task(
    bind=True,
    base=CallbackTask,
    name='osint_tracker.query_email',
    max_retries=3,
    default_retry_delay=60
)
def async_query_email(self, email: str, timeout: int = 120) -> Dict[str, Any]:
    """
    异步执行邮箱查询
    
    Args:
        email: 邮箱地址
        timeout: 超时时间
    
    Returns:
        查询结果字典
    """
    try:
        logger.info(f"📧 开始异步查询邮箱: {email}")
        
        # 更新任务状态
        self.update_state(
            state='PROCESSING',
            meta={
                'email': email,
                'status': 'Querying external APIs...',
                'progress': 10
            }
        )
        
        # 导入查询函数
        import asyncio
        from apis import query_email_comprehensive
        
        # 执行异步查询
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(query_email_comprehensive(email))
            result_dict = result.model_dump() if hasattr(result, 'model_dump') else result
        finally:
            loop.close()
        
        # 更新进度
        self.update_state(
            state='PROCESSING',
            meta={
                'email': email,
                'status': 'Saving results...',
                'progress': 80
            }
        )
        
        # 保存到数据库和缓存
        from models import SessionLocal
        from db_operations import save_email_query
        from redis_cache import save_cached_result
        
        db_session = SessionLocal()
        try:
            # 保存到数据库
            success = result_dict.get('success', False)
            error_msg = result_dict.get('error', None)
            save_email_query(
                db=db_session,
                email=email,
                result=result_dict,
                success=success,
                error=error_msg
            )
            
            # 保存到Redis缓存
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                loop.run_until_complete(
                    save_cached_result(email, "email", result_dict, db_session)
                )
            finally:
                loop.close()
            
        finally:
            db_session.close()
        
        logger.info(f"✅ 邮箱查询完成: {email}")
        
        return {
            'success': True,
            'email': email,
            'data': result_dict,
            'completed_at': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"❌ 邮箱查询失败: {email}, 错误: {error_msg}")
        
        # 重试逻辑
        if self.request.retries < self.max_retries:
            logger.info(f"⚠️ 准备重试 ({self.request.retries + 1}/{self.max_retries})")
            raise self.retry(exc=e, countdown=60)
        
        # 最终失败
        return {
            'success': False,
            'email': email,
            'error': error_msg,
            'completed_at': datetime.utcnow().isoformat()
        }


@celery_app.task(name='osint_tracker.cleanup_old_results')
def cleanup_old_results():
    """
    定期清理过期的任务结果
    """
    try:
        from celery.result import AsyncResult
        # 清理逻辑
        logger.info("🧹 开始清理过期任务结果")
        # 实现清理逻辑
        logger.info("✅ 清理完成")
    except Exception as e:
        logger.error(f"❌ 清理失败: {str(e)}")


# 定期任务配置
celery_app.conf.beat_schedule = {
    'cleanup-every-hour': {
        'task': 'osint_tracker.cleanup_old_results',
        'schedule': 3600.0,  # 每小时执行一次
    },
}


def get_task_status(task_id: str) -> Dict[str, Any]:
    """
    获取任务状态
    
    Args:
        task_id: 任务ID
    
    Returns:
        任务状态信息
    """
    try:
        task = AsyncResult(task_id, app=celery_app)
        
        if task.state == 'PENDING':
            return {
                'task_id': task_id,
                'state': 'PENDING',
                'status': 'Task is waiting in queue...',
                'progress': 0
            }
        elif task.state == 'PROCESSING':
            return {
                'task_id': task_id,
                'state': 'PROCESSING',
                'status': task.info.get('status', 'Processing...'),
                'progress': task.info.get('progress', 50)
            }
        elif task.state == 'SUCCESS':
            return {
                'task_id': task_id,
                'state': 'SUCCESS',
                'status': 'Task completed successfully',
                'progress': 100,
                'result': task.result
            }
        elif task.state == 'FAILURE':
            return {
                'task_id': task_id,
                'state': 'FAILURE',
                'status': 'Task failed',
                'progress': 0,
                'error': str(task.info)
            }
        elif task.state == 'RETRY':
            return {
                'task_id': task_id,
                'state': 'RETRY',
                'status': 'Task is being retried...',
                'progress': 25
            }
        else:
            return {
                'task_id': task_id,
                'state': task.state,
                'status': 'Unknown state',
                'progress': 0
            }
    except Exception as e:
        logger.error(f"❌ 获取任务状态失败: {str(e)}")
        return {
            'task_id': task_id,
            'state': 'ERROR',
            'status': 'Failed to get task status',
            'error': str(e)
        }


def cancel_task(task_id: str) -> bool:
    """
    取消任务
    
    Args:
        task_id: 任务ID
    
    Returns:
        是否取消成功
    """
    try:
        task = AsyncResult(task_id, app=celery_app)
        task.revoke(terminate=True)
        logger.info(f"✅ 任务已取消: {task_id}")
        return True
    except Exception as e:
        logger.error(f"❌ 取消任务失败: {str(e)}")
        return False


def get_queue_stats() -> Dict[str, Any]:
    """
    获取队列统计信息
    
    Returns:
        队列统计数据
    """
    try:
        inspect = celery_app.control.inspect()
        
        # 获取活跃任务
        active = inspect.active()
        active_count = sum(len(tasks) for tasks in (active or {}).values())
        
        # 获取预定任务
        scheduled = inspect.scheduled()
        scheduled_count = sum(len(tasks) for tasks in (scheduled or {}).values())
        
        # 获取保留任务
        reserved = inspect.reserved()
        reserved_count = sum(len(tasks) for tasks in (reserved or {}).values())
        
        return {
            'active_tasks': active_count,
            'scheduled_tasks': scheduled_count,
            'reserved_tasks': reserved_count,
            'total_pending': active_count + scheduled_count + reserved_count
        }
    except Exception as e:
        logger.error(f"❌ 获取队列统计失败: {str(e)}")
        return {
            'error': str(e)
        }



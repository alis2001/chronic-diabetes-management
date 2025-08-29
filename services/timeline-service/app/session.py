# services/timeline-service/app/session.py
"""
Professional Session Management for Healthcare System
Redis-based doctor session management with 10-hour expiry
"""

import redis.asyncio as aioredis
import json
import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import Request, HTTPException, Depends
from fastapi.responses import RedirectResponse
import logging
import os

logger = logging.getLogger(__name__)

class SessionManager:
    """Professional session manager for doctor workspaces"""
    
    def __init__(self):
        self.redis_client = None
        self.session_expiry = 36000  # 10 hours in seconds
        
    async def init_redis(self):
        """Initialize Redis connection"""
        if not self.redis_client:
            redis_url = os.getenv("REDIS_URL", "redis://:redis123@redis:6379/0")
            self.redis_client = aioredis.from_url(
                redis_url,
                encoding="utf-8",
                decode_responses=True,
                retry_on_timeout=True
            )
            logger.info("Redis session manager initialized")
    
    async def create_session(self, doctor_id: str, additional_data: Dict[str, Any] = None) -> str:
        """Create new doctor session"""
        await self.init_redis()
        
        session_id = str(uuid.uuid4())
        session_key = f"doctor_session:{doctor_id}:{session_id}"
        
        session_data = {
            "doctor_id": doctor_id,
            "session_id": session_id,
            "created_at": datetime.now().isoformat(),
            "last_activity": datetime.now().isoformat(),
            "workspace_active": True,
            **(additional_data or {})
        }
        
        # Store session with 10-hour expiry
        await self.redis_client.setex(
            session_key, 
            self.session_expiry, 
            json.dumps(session_data)
        )
        
        logger.info(f"Session created for doctor {doctor_id}: {session_id}")
        return session_id
    
    async def get_session(self, doctor_id: str, session_id: str) -> Optional[Dict[str, Any]]:
        """Get doctor session data"""
        await self.init_redis()
        
        session_key = f"doctor_session:{doctor_id}:{session_id}"
        session_data = await self.redis_client.get(session_key)
        
        if not session_data:
            return None
            
        session = json.loads(session_data)
        
        # Update last activity
        session["last_activity"] = datetime.now().isoformat()
        await self.redis_client.setex(
            session_key,
            self.session_expiry,
            json.dumps(session)
        )
        
        return session
    
    async def validate_session(self, doctor_id: str, session_id: str) -> bool:
        """Validate if session is active and valid"""
        session = await self.get_session(doctor_id, session_id)
        return session is not None and session.get("workspace_active", False)
    
    async def invalidate_session(self, doctor_id: str, session_id: str):
        """Invalidate doctor session"""
        await self.init_redis()
        session_key = f"doctor_session:{doctor_id}:{session_id}"
        await self.redis_client.delete(session_key)
        logger.info(f"Session invalidated for doctor {doctor_id}: {session_id}")
    
    async def cleanup_expired_sessions(self):
        """Cleanup expired sessions (maintenance task)"""
        await self.init_redis()
        pattern = "doctor_session:*"
        async for key in self.redis_client.scan_iter(match=pattern):
            ttl = await self.redis_client.ttl(key)
            if ttl <= 0:
                await self.redis_client.delete(key)
                logger.info(f"Cleaned up expired session: {key}")

# Global session manager instance
session_manager = SessionManager()

class SessionCookie:
    """Cookie-based session handling"""
    
    @staticmethod
    def set_session_cookie(response, doctor_id: str, session_id: str):
        """Set secure session cookie"""
        cookie_value = f"{doctor_id}:{session_id}"
        response.set_cookie(
            key="doctor_session",
            value=cookie_value,
            max_age=36000,  # 10 hours
            httponly=True,
            secure=False,  # Set to True in production with HTTPS
            samesite="lax"
        )
    
    @staticmethod
    def get_session_from_cookie(request: Request) -> Optional[tuple[str, str]]:
        """Extract doctor_id and session_id from cookie"""
        cookie_value = request.cookies.get("doctor_session")
        if not cookie_value:
            return None
            
        try:
            doctor_id, session_id = cookie_value.split(":", 1)
            return doctor_id, session_id
        except ValueError:
            return None
    
    @staticmethod
    def clear_session_cookie(response):
        """Clear session cookie"""
        response.delete_cookie("doctor_session")

# Dependency for route authentication
async def require_valid_session(request: Request):
    """FastAPI dependency to require valid doctor session"""
    session_data = SessionCookie.get_session_from_cookie(request)
    
    if not session_data:
        raise HTTPException(
            status_code=302,
            detail="No active session",
            headers={"Location": "/"}
        )
    
    doctor_id, session_id = session_data
    
    # Validate session
    is_valid = await session_manager.validate_session(doctor_id, session_id)
    if not is_valid:
        raise HTTPException(
            status_code=302,
            detail="Session expired",
            headers={"Location": "/"}
        )
    
    # Get session data
    session = await session_manager.get_session(doctor_id, session_id)
    return {
        "doctor_id": doctor_id,
        "session_id": session_id,
        "session_data": session
    }

# Optional session dependency (doesn't redirect)
async def get_current_session(request: Request) -> Optional[Dict[str, Any]]:
    """Get current session if available, None otherwise"""
    session_data = SessionCookie.get_session_from_cookie(request)
    
    if not session_data:
        return None
    
    doctor_id, session_id = session_data
    
    # Validate session
    is_valid = await session_manager.validate_session(doctor_id, session_id)
    if not is_valid:
        return None
    
    session = await session_manager.get_session(doctor_id, session_id)
    return {
        "doctor_id": doctor_id,
        "session_id": session_id,
        "session_data": session
    }
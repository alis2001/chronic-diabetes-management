# services/admin-dashboard/app/session_manager.py
"""
Admin Session Manager
Redis-based session management for admin users
"""

import redis.asyncio as redis
import json
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import logging
import os

logger = logging.getLogger(__name__)

class AdminSessionManager:
    """Redis session manager for admin authentication"""
    
    def __init__(self):
        self.redis_client = None
        self.session_expiry_hours = 8
        self.session_prefix = "admin_session:"
        
    async def init_redis(self):
        """Initialize Redis connection"""
        try:
            redis_url = os.getenv("REDIS_URL", "redis://:redis123@redis:6379/0")
            
            # Parse Redis URL for connection
            if redis_url.startswith("redis://"):
                # Extract password and connection details
                if "@" in redis_url:
                    auth_part, host_part = redis_url.split("@")
                    password = auth_part.split(":")[-1]
                    host_port = host_part.split("/")[0]
                    host, port = host_port.split(":")
                    db = int(host_part.split("/")[1]) if "/" in host_part else 0
                else:
                    # No password
                    url_parts = redis_url.replace("redis://", "").split("/")
                    host_port = url_parts[0]
                    host, port = host_port.split(":")
                    password = None
                    db = int(url_parts[1]) if len(url_parts) > 1 else 0
            else:
                # Default values
                host = "redis"
                port = 6379
                password = "redis123"
                db = 0
            
            self.redis_client = redis.Redis(
                host=host,
                port=int(port),
                db=db,
                password=password,
                decode_responses=True,
                socket_timeout=5,
                socket_connect_timeout=5
            )
            
            # Test connection
            await self.redis_client.ping()
            logger.info("✅ Redis session manager connected")
            
        except Exception as e:
            logger.error(f"❌ Redis connection failed: {str(e)}")
            logger.warning("⚠️ Sessions will be stored in memory (development only)")
            self.redis_client = None
    
    def _generate_session_token(self) -> str:
        """Generate secure session token"""
        return secrets.token_urlsafe(32)
    
    async def create_session(self, user_id: str, user_data: Dict[str, Any]) -> str:
        """Create new session and return token"""
        try:
            session_token = self._generate_session_token()
            session_key = f"{self.session_prefix}{session_token}"
            
            # Prepare session data
            session_data = {
                "user_id": user_id,
                "email": user_data.get("email"),
                "nome": user_data.get("nome"),
                "cognome": user_data.get("cognome"),
                "role": user_data.get("role"),
                "username": user_data.get("username"),
                "created_at": datetime.now().isoformat(),
                "last_accessed": datetime.now().isoformat()
            }
            
            if self.redis_client:
                # Store in Redis with expiration
                expiry_seconds = self.session_expiry_hours * 3600
                await self.redis_client.setex(
                    session_key,
                    expiry_seconds,
                    json.dumps(session_data)
                )
                logger.info(f"✅ Session created: {user_data.get('email')} - Token: {session_token[:8]}...")
            else:
                # Fallback: store in memory (development only)
                if not hasattr(self, '_memory_sessions'):
                    self._memory_sessions = {}
                self._memory_sessions[session_token] = {
                    **session_data,
                    "expires_at": (datetime.now() + timedelta(hours=self.session_expiry_hours)).isoformat()
                }
                logger.warning(f"⚠️ Session stored in memory: {user_data.get('email')}")
            
            return session_token
            
        except Exception as e:
            logger.error(f"❌ Session creation failed: {str(e)}")
            raise Exception("Failed to create session")
    
    async def get_session(self, session_token: str) -> Optional[Dict[str, Any]]:
        """Get session data by token"""
        try:
            session_key = f"{self.session_prefix}{session_token}"
            
            if self.redis_client:
                # Get from Redis
                session_data_json = await self.redis_client.get(session_key)
                if session_data_json:
                    session_data = json.loads(session_data_json)
                    
                    # Update last accessed time
                    session_data["last_accessed"] = datetime.now().isoformat()
                    expiry_seconds = self.session_expiry_hours * 3600
                    await self.redis_client.setex(
                        session_key,
                        expiry_seconds,
                        json.dumps(session_data)
                    )
                    
                    return session_data
            else:
                # Get from memory (development only)
                if hasattr(self, '_memory_sessions') and session_token in self._memory_sessions:
                    session_data = self._memory_sessions[session_token]
                    
                    # Check if expired
                    expires_at = datetime.fromisoformat(session_data["expires_at"])
                    if datetime.now() > expires_at:
                        del self._memory_sessions[session_token]
                        return None
                    
                    # Update last accessed
                    session_data["last_accessed"] = datetime.now().isoformat()
                    return session_data
            
            return None
            
        except Exception as e:
            logger.error(f"❌ Session retrieval failed: {str(e)}")
            return None
    
    async def delete_session(self, session_token: str) -> bool:
        """Delete session"""
        try:
            session_key = f"{self.session_prefix}{session_token}"
            
            if self.redis_client:
                # Delete from Redis
                result = await self.redis_client.delete(session_key)
                return result > 0
            else:
                # Delete from memory
                if hasattr(self, '_memory_sessions') and session_token in self._memory_sessions:
                    del self._memory_sessions[session_token]
                    return True
            
            return False
            
        except Exception as e:
            logger.error(f"❌ Session deletion failed: {str(e)}")
            return False
    
    async def cleanup_expired_sessions(self):
        """Cleanup expired sessions (mainly for memory storage)"""
        try:
            if not self.redis_client and hasattr(self, '_memory_sessions'):
                now = datetime.now()
                expired_tokens = []
                
                for token, session_data in self._memory_sessions.items():
                    expires_at = datetime.fromisoformat(session_data["expires_at"])
                    if now > expires_at:
                        expired_tokens.append(token)
                
                for token in expired_tokens:
                    del self._memory_sessions[token]
                
                if expired_tokens:
                    logger.info(f"🧹 Cleaned up {len(expired_tokens)} expired sessions")
                    
        except Exception as e:
            logger.error(f"❌ Session cleanup failed: {str(e)}")
    
    async def get_user_sessions(self, user_id: str) -> list:
        """Get all sessions for a user (for admin purposes)"""
        try:
            if self.redis_client:
                # Scan for user sessions in Redis
                pattern = f"{self.session_prefix}*"
                sessions = []
                
                async for key in self.redis_client.scan_iter(match=pattern):
                    session_data_json = await self.redis_client.get(key)
                    if session_data_json:
                        session_data = json.loads(session_data_json)
                        if session_data.get("user_id") == user_id:
                            sessions.append({
                                "token": key.replace(self.session_prefix, ""),
                                "created_at": session_data.get("created_at"),
                                "last_accessed": session_data.get("last_accessed")
                            })
                
                return sessions
            else:
                # Get from memory
                sessions = []
                if hasattr(self, '_memory_sessions'):
                    for token, session_data in self._memory_sessions.items():
                        if session_data.get("user_id") == user_id:
                            sessions.append({
                                "token": token,
                                "created_at": session_data.get("created_at"),
                                "last_accessed": session_data.get("last_accessed")
                            })
                return sessions
                
        except Exception as e:
            logger.error(f"❌ Get user sessions failed: {str(e)}")
            return []

# Global session manager instance
session_manager = AdminSessionManager()
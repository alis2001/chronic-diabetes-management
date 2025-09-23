# services/scheduler-service/app/database.py
"""
Scheduler Service Database Operations - COMPLETE FIXED VERSION
MongoDB operations for appointment density calculation and scheduling
All import and class definition order issues resolved
"""

import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import List, Dict, Optional, Any, Tuple
from datetime import datetime, date, timedelta
from collections import defaultdict
from bson import ObjectId

from .models import (
    DensityLevel, DateDensity, AppointmentDocument, ExamForScheduling
)
from .exceptions import DatabaseOperationException

logger = logging.getLogger(__name__)

# Global database client
mongodb_client: AsyncIOMotorClient = None
database: AsyncIOMotorDatabase = None

# ================================
# CONNECTION MANAGEMENT
# ================================

async def connect_to_mongo():
    """Create database connection to diabetes_db"""
    global mongodb_client, database
    
    try:
        mongodb_url = os.getenv(
            "MONGODB_URL", 
            "mongodb://admin:admin123@mongodb:27017/diabetes_db?authSource=admin"
        )
        
        logger.info(f"🔗 Scheduler connecting to MongoDB...")
        
        mongodb_client = AsyncIOMotorClient(
            mongodb_url,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
            maxPoolSize=10
        )
        
        # Use same database as other services
        database = mongodb_client.diabetes_db
        
        # Test connection
        await database.command("ping")
        
        # Create indexes for optimal performance
        await create_scheduler_indexes()
        
        logger.info("✅ Scheduler MongoDB connected successfully")
        
    except Exception as e:
        logger.error(f"❌ Scheduler MongoDB connection failed: {str(e)}")
        raise

async def close_mongo_connection():
    """Close database connection"""
    global mongodb_client
    
    if mongodb_client is not None:
        mongodb_client.close()
        logger.info("🔌 Scheduler MongoDB connection closed")

async def get_database() -> AsyncIOMotorDatabase:
    """Get database instance"""
    global database
    
    if database is None:
        await connect_to_mongo()
    
    return database

async def create_scheduler_indexes():
    """Create necessary indexes for scheduler collections"""
    try:
        global database
        
        if database is None:
            return
        
        # Appointments collection indexes for scheduler queries
        await database.appointments.create_index([
            ("id_medico", 1),
            ("appointment_date", 1),
            ("status", 1)
        ], name="idx_scheduler_density")
        
        await database.appointments.create_index([
            ("appointment_date", 1),
            ("status", 1)
        ], name="idx_date_status")
        
        # Exam mappings indexes for exam selection
        await database.exam_mappings.create_index([
            ("cronoscita_id", 1),
            ("visualizza_nel_referto", 1),
            ("is_active", 1)
        ], name="idx_scheduler_exams")
        
        logger.info("✅ Scheduler database indexes created")
        
    except Exception as e:
        logger.error(f"❌ Error creating scheduler indexes: {e}")

# ================================
# DENSITY CALCULATION OPERATIONS
# ================================

class AppointmentDensityCalculator:
    """Calculate and visualize appointment density for doctors - FIXED VERSION"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.appointments_collection = db.appointments
    
    async def calculate_doctor_density(
        self, 
        id_medico: str, 
        start_date: date, 
        end_date: date
    ) -> Dict[str, int]:
        """
        Calculate appointment density for doctor across date range
        Returns dict with date strings as keys and appointment counts as values
        THIS SIGNATURE MATCHES WHAT SERVICES.PY EXPECTS
        """
        try:
            # Get all appointments for this doctor in date range
            pipeline = [
                {
                    "$match": {
                        "id_medico": id_medico,
                        "appointment_date": {
                            "$gte": start_date,
                            "$lte": end_date
                        },
                        "status": {"$in": ["scheduled", "completed"]}
                    }
                },
                {
                    "$group": {
                        "_id": "$appointment_date",
                        "count": {"$sum": 1}
                    }
                },
                {
                    "$sort": {"_id": 1}
                }
            ]
            
            # Execute aggregation
            cursor = self.appointments_collection.aggregate(pipeline)
            appointment_counts = await cursor.to_list(length=None)
            
            # Convert to dictionary format that services.py expects
            density_data = {}
            for item in appointment_counts:
                date_str = item["_id"].isoformat()  # Convert date to string
                density_data[date_str] = item["count"]
            
            logger.info(f"✅ Calculated density: {len(density_data)} dates with appointments")
            return density_data
            
        except Exception as e:
            logger.error(f"❌ Error calculating doctor density: {e}")
            return {}
    
    async def get_density_statistics(
        self, 
        id_medico: str, 
        start_date: date, 
        end_date: date
    ) -> Dict[str, Any]:
        """Get statistical summary of appointment density"""
        try:
            # Get density data
            density_data = await self.calculate_doctor_density(id_medico, start_date, end_date)
            
            if not density_data:
                return {
                    "total_appointments": 0,
                    "busiest_date": None,
                    "busiest_count": 0,
                    "average_per_day": 0.0,
                    "freest_dates": []
                }
            
            # Calculate statistics
            total_appointments = sum(density_data.values())
            busiest_date_str = max(density_data.keys(), key=lambda k: density_data[k])
            busiest_count = density_data[busiest_date_str]
            
            # Find freest dates (with minimum appointment count)
            min_count = min(density_data.values())
            freest_dates = [k for k, v in density_data.items() if v == min_count]
            
            # Calculate average
            total_days = (end_date - start_date).days + 1
            average_per_day = total_appointments / total_days if total_days > 0 else 0
            
            return {
                "total_appointments": total_appointments,
                "busiest_date": busiest_date_str,
                "busiest_count": busiest_count,
                "average_per_day": round(average_per_day, 2),
                "freest_dates": freest_dates[:5]  # Top 5 freest dates
            }
            
        except Exception as e:
            logger.error(f"❌ Error calculating density statistics: {e}")
            return {}

# ================================
# APPOINTMENT OPERATIONS - MOVED UP
# ================================

class AppointmentRepository:
    """Repository for appointment database operations"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.appointments_collection = db.appointments
    
    async def create_appointment(self, appointment_doc: AppointmentDocument) -> str:
        """Create new appointment document"""
        try:
            # Convert Pydantic model to dict for MongoDB
            doc_dict = appointment_doc.dict()
            doc_dict['_id'] = ObjectId()
            doc_dict['appointment_id'] = str(doc_dict['_id'])
            
            # Ensure created_at and updated_at are set
            doc_dict['created_at'] = datetime.now()
            doc_dict['updated_at'] = datetime.now()
            
            # Insert into database
            result = await self.appointments_collection.insert_one(doc_dict)
            
            logger.info(f"✅ Appointment created: {doc_dict['appointment_id']}")
            return doc_dict['appointment_id']
            
        except Exception as e:
            logger.error(f"❌ Error creating appointment: {e}")
            raise DatabaseOperationException("creating appointment", str(e))
    
    async def find_future_appointments_for_patient_cronoscita(
        self, 
        cf_paziente: str, 
        cronoscita_id: str
    ) -> List[Dict[str, Any]]:
        """Find future appointments for patient + cronoscita combination"""
        try:
            today = date.today()
            query = {
                "cf_paziente": cf_paziente.upper(),
                "cronoscita_id": cronoscita_id,
                "appointment_date": {"$gte": today},
                "status": {"$in": ["scheduled", "confirmed"]}
            }
            
            cursor = self.appointments_collection.find(query).sort("appointment_date", 1)
            appointments = await cursor.to_list(length=None)
            
            logger.info(f"📅 Found {len(appointments)} future appointments for {cf_paziente}")
            return appointments
            
        except Exception as e:
            logger.error(f"❌ Error finding future appointments: {e}")
            return []
    
    async def get_appointments_for_doctor(
        self, 
        id_medico: str, 
        start_date: date, 
        end_date: date
    ) -> List[Dict[str, Any]]:
        """Get all appointments for doctor in date range"""
        try:
            query = {
                "id_medico": id_medico,
                "appointment_date": {
                    "$gte": start_date,
                    "$lte": end_date
                }
            }
            
            cursor = self.appointments_collection.find(query).sort("appointment_date", 1)
            return await cursor.to_list(length=None)
            
        except Exception as e:
            logger.error(f"❌ Error getting doctor appointments: {e}")
            return []

# ================================
# EXAM OPERATIONS
# ================================

class ExamRepository:
    """Repository for exam-related database operations"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.exam_mappings_collection = db.exam_mappings
        self.exam_catalog_collection = db.exam_catalog
        self.cronoscita_collection = db.cronoscita
    
    async def get_available_exams_for_scheduling(
        self, 
        cronoscita_id: str
    ) -> List[ExamForScheduling]:
        """
        Get exams available for scheduling from database
        Only exams with visualizza_nel_referto = "S" and is_active = true
        """
        try:
            # Simple aggregation to get active exams for this cronoscita
            pipeline = [
                {
                    "$match": {
                        "cronoscita_id": cronoscita_id,
                        "visualizza_nel_referto": "S",  # Only show in timeline
                        "is_active": True
                    }
                },
                {
                    "$sort": {"nome_esame": 1}
                }
            ]
            
            cursor = self.exam_mappings_collection.aggregate(pipeline)
            results = await cursor.to_list(length=None)
            
            # Convert to ExamForScheduling objects
            exams = []
            for result in results:
                exam = ExamForScheduling(
                    mapping_id=str(result["_id"]),
                    exam_name=result.get("nome_esame", "Esame Sconosciuto"),
                    structure_name=result.get("struttura_nome", "Struttura Sconosciuta"),
                    is_active=result.get("is_active", True),
                    notes=result.get("notes", "")
                )
                exams.append(exam)
            
            logger.info(f"✅ Found {len(exams)} available exams for Cronoscita {cronoscita_id}")
            return exams
            
        except Exception as e:
            logger.error(f"❌ Error getting available exams: {e}")
            return []
    
    async def get_cronoscita_name(self, cronoscita_id: str) -> str:
        """Get cronoscita name by ID"""
        try:
            cronoscita = await self.cronoscita_collection.find_one(
                {"_id": ObjectId(cronoscita_id)}
            )
            
            return cronoscita["nome"] if cronoscita else "Cronoscita Sconosciuta"
            
        except Exception as e:
            logger.error(f"❌ Error getting cronoscita name: {e}")
            return "Cronoscita Sconosciuta"

# ================================
# VALIDATION SERVICE - MOVED DOWN
# ================================

class SchedulerValidationService:
    """Service for scheduler business rule validations"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.appointment_repo = AppointmentRepository(db)  # NOW AppointmentRepository IS DEFINED
        self.patients_collection = db.patients
        self.cronoscita_collection = db.cronoscita
    
    async def validate_can_schedule(
        self, 
        cf_paziente: str, 
        cronoscita_id: str
    ) -> Dict[str, Any]:
        """
        Validate if patient can schedule appointment
        BUSINESS RULE: One CF + One Cronoscita = Max One Future Appointment
        """
        try:
            # Check for existing future appointments
            existing_appointments = await self.appointment_repo.find_future_appointments_for_patient_cronoscita(
                cf_paziente, cronoscita_id
            )
            
            # Get cronoscita information
            cronoscita = await self._get_cronoscita_info(cronoscita_id)
            
            if existing_appointments:
                # Found duplicate - return detailed info
                existing = existing_appointments[0]
                
                return {
                    "can_schedule": False,
                    "error_type": "DUPLICATE_FUTURE_APPOINTMENT",
                    "message": f"Paziente ha già appuntamento futuro per {cronoscita['nome']}",
                    "existing_appointment": {
                        "appointment_id": existing.get("appointment_id"),
                        "appointment_date": existing.get("appointment_date"),
                        "cronoscita_name": cronoscita["nome"],
                        "status": existing.get("status")
                    }
                }
            
            # No duplicates found - can schedule
            return {
                "can_schedule": True,
                "message": "Paziente può programmare appuntamento",
                "cronoscita_name": cronoscita["nome"],
                "patient_cf": cf_paziente
            }
            
        except Exception as e:
            logger.error(f"❌ Error validating scheduling permission: {e}")
            return {
                "can_schedule": False,
                "error_type": "VALIDATION_ERROR", 
                "message": f"Errore durante validazione: {str(e)}",
                "existing_appointment": None
            }
    
    async def _get_cronoscita_info(self, cronoscita_id: str) -> Dict[str, Any]:
        """Get cronoscita information"""
        try:
            cronoscita = await self.cronoscita_collection.find_one(
                {"_id": ObjectId(cronoscita_id)}
            )
            
            return cronoscita or {
                "nome": "Cronoscita Sconosciuta",
                "descrizione": "",
                "_id": cronoscita_id
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting cronoscita info: {e}")
            return {
                "nome": "Cronoscita Sconosciuta", 
                "descrizione": "",
                "_id": cronoscita_id
            }
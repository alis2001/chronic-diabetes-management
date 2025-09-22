# services/scheduler-service/app/database.py
"""
Scheduler Service Database Operations
MongoDB operations for appointment density calculation and scheduling
"""

import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import List, Dict, Optional, Any, Tuple
from datetime import datetime, date, timedelta
from collections import defaultdict
from bson import ObjectId

from .models import (
    DensityLevel, DateDensity, DensityVisualization, 
    DENSITY_COLORS, AppointmentDocument, ExamForScheduling
)

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
    """Calculate and visualize appointment density for doctors"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.appointments_collection = db.appointments
    
    async def calculate_doctor_density(
        self, 
        id_medico: str, 
        start_date: date, 
        end_date: date
    ) -> List[DateDensity]:
        """
        Calculate appointment density for doctor across date range
        Returns visual density information with color gradients
        """
        try:
            # Get all future appointments for this doctor
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
            
            # Convert to dict for easy lookup
            counts_by_date = {}
            max_count = 0
            
            for item in appointment_counts:
                date_key = item["_id"]
                count = item["count"]
                counts_by_date[date_key] = count
                max_count = max(max_count, count)
            
            # Generate density info for each date in range
            date_densities = []
            current_date = start_date
            
            while current_date <= end_date:
                appointment_count = counts_by_date.get(current_date, 0)
                
                # Calculate density visualization
                density_viz = self._calculate_density_visualization(
                    appointment_count, 
                    max_count
                )
                
                # Create DateDensity object
                day_names = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"]
                day_name = day_names[current_date.weekday()]
                
                date_density = DateDensity(
                    date=current_date,
                    day_name=day_name,
                    appointment_count=appointment_count,
                    density_level=density_viz.density_level,
                    background_color=density_viz.background_color,
                    text_color=density_viz.text_color,
                    density_percentage=density_viz.density_percentage,
                    density_description=density_viz.description,
                    appointment_summary=f"{appointment_count} appuntamenti programmati" if appointment_count > 0 else "Nessun appuntamento"
                )
                
                date_densities.append(date_density)
                current_date += timedelta(days=1)
            
            return date_densities
            
        except Exception as e:
            logger.error(f"❌ Error calculating doctor density: {e}")
            return []
    
    def _calculate_density_visualization(
        self, 
        appointment_count: int, 
        max_count: int
    ) -> DensityVisualization:
        """Calculate visual density representation"""
        
        # Determine density level based on appointment count
        if appointment_count == 0:
            density_level = DensityLevel.VERY_LOW
        elif appointment_count <= 2:
            density_level = DensityLevel.LOW
        elif appointment_count <= 5:
            density_level = DensityLevel.MEDIUM
        elif appointment_count <= 8:
            density_level = DensityLevel.HIGH
        else:
            density_level = DensityLevel.VERY_HIGH
        
        # Get colors from mapping
        colors = DENSITY_COLORS[density_level]
        
        # Calculate percentage (relative to max or absolute scale)
        if max_count > 0:
            percentage = min((appointment_count / max(max_count, 10)) * 100, 100)
        else:
            percentage = 0
        
        return DensityVisualization(
            density_level=density_level,
            background_color=colors["bg"],
            text_color=colors["text"],
            density_percentage=percentage,
            description=colors["description"]
        )
    
    async def get_density_statistics(
        self, 
        id_medico: str, 
        start_date: date, 
        end_date: date
    ) -> Dict[str, Any]:
        """Get statistical summary of doctor's appointment density"""
        try:
            pipeline = [
                {
                    "$match": {
                        "id_medico": id_medico,
                        "appointment_date": {"$gte": start_date, "$lte": end_date},
                        "status": {"$in": ["scheduled", "completed"]}
                    }
                },
                {
                    "$group": {
                        "_id": "$appointment_date",
                        "count": {"$sum": 1}
                    }
                }
            ]
            
            cursor = self.appointments_collection.aggregate(pipeline)
            daily_counts = await cursor.to_list(length=None)
            
            if not daily_counts:
                return {
                    "total_appointments": 0,
                    "busiest_date": None,
                    "busiest_count": 0,
                    "average_per_day": 0.0,
                    "freest_dates": []
                }
            
            # Calculate statistics
            total_appointments = sum(item["count"] for item in daily_counts)
            busiest_date = max(daily_counts, key=lambda x: x["count"])
            
            # Find freest dates (dates with lowest appointment count)
            min_count = min(item["count"] for item in daily_counts)
            freest_dates = [item["_id"] for item in daily_counts if item["count"] == min_count]
            
            # Calculate average
            total_days = (end_date - start_date).days + 1
            average_per_day = total_appointments / total_days if total_days > 0 else 0
            
            return {
                "total_appointments": total_appointments,
                "busiest_date": busiest_date["_id"],
                "busiest_count": busiest_date["count"],
                "average_per_day": round(average_per_day, 2),
                "freest_dates": freest_dates[:5]  # Top 5 freest dates
            }
            
        except Exception as e:
            logger.error(f"❌ Error calculating density statistics: {e}")
            return {}

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
            pipeline = [
                {
                    "$match": {
                        "cronoscita_id": cronoscita_id,
                        "visualizza_nel_referto": "S",  # Only show in timeline
                        "is_active": True
                    }
                },
                {
                    "$lookup": {
                        "from": "exam_catalog",
                        "let": {
                            "codice": "$codice_catalogo",
                            "cronoscita": "$cronoscita_id"
                        },
                        "pipeline": [
                            {
                                "$match": {
                                    "$expr": {
                                        "$and": [
                                            {"$eq": ["$codice_catalogo", "$$codice"]},
                                            {"$eq": ["$cronoscita_id", "$$cronoscita"]}
                                        ]
                                    }
                                }
                            }
                        ],
                        "as": "catalog_info"
                    }
                },
                {
                    "$unwind": "$catalog_info"
                },
                {
                    "$sort": {"catalog_info.nome_esame": 1}
                }
            ]
            
            cursor = self.exam_mappings_collection.aggregate(pipeline)
            results = await cursor.to_list(length=None)
            
            # Convert to ExamForScheduling objects
            exams = []
            for result in results:
                exam = ExamForScheduling(
                    mapping_id=str(result["_id"]),
                    codice_catalogo=result["codice_catalogo"],
                    nome_esame_catalogo=result["catalog_info"]["nome_esame"],
                    codoffering_wirgilio=result["codoffering_wirgilio"],
                    nome_esame_wirgilio=result["nome_esame_wirgilio"],
                    struttura_nome=result["struttura_nome"]
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

class SchedulerValidationService:
    """Service for scheduler business rule validations"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.appointments_collection = db.appointments
        self.patients_collection = db.patients
        self.cronoscita_collection = db.cronoscita
    
    async def validate_can_schedule(
        self, 
        cf_paziente: str, 
        cronoscita_id: str
    ) -> Dict[str, Any]:
        """
        Validate if patient can schedule new appointment
        Called when opening scheduler - prevents UI from showing if not allowed
        """
        try:
            # Check if patient exists
            patient = await self.patients_collection.find_one(
                {"cf_paziente": cf_paziente.upper()}
            )
            
            if not patient:
                return {
                    "can_schedule": False,
                    "error_type": "PATIENT_NOT_FOUND",
                    "message": f"Paziente con CF {cf_paziente} non trovato nel sistema",
                    "existing_appointment": None
                }
            
            # Check if cronoscita exists
            try:
                cronoscita = await self.cronoscita_collection.find_one(
                    {"_id": ObjectId(cronoscita_id)}
                )
                
                if not cronoscita:
                    return {
                        "can_schedule": False,
                        "error_type": "CRONOSCITA_NOT_FOUND", 
                        "message": f"Cronoscita non trovata",
                        "existing_appointment": None
                    }
            except:
                return {
                    "can_schedule": False,
                    "error_type": "INVALID_CRONOSCITA_ID",
                    "message": "ID Cronoscita non valido",
                    "existing_appointment": None
                }
            
            # MAIN VALIDATION: Check for existing future appointment
            today = date.today()
            existing_appointment = await self.appointments_collection.find_one({
                "cf_paziente": cf_paziente.upper(),
                "cronoscita_id": cronoscita_id,
                "appointment_date": {"$gte": today},
                "status": {"$in": ["scheduled"]}
            })
            
            if existing_appointment:
                return {
                    "can_schedule": False,
                    "error_type": "DUPLICATE_FUTURE_APPOINTMENT",
                    "message": (
                        f"Il paziente {patient.get('demographics', {}).get('nome', '')} "
                        f"{patient.get('demographics', {}).get('cognome', '')} "
                        f"ha già un appuntamento programmato per {cronoscita['nome']} "
                        f"in data {existing_appointment['appointment_date'].strftime('%d/%m/%Y')}. "
                        f"Un paziente può avere solo un appuntamento futuro per patologia."
                    ),
                    "existing_appointment": {
                        "appointment_id": existing_appointment.get("appointment_id"),
                        "appointment_date": existing_appointment["appointment_date"].strftime('%d/%m/%Y'),
                        "cronoscita_name": cronoscita["nome"],
                        "status": existing_appointment.get("status"),
                        "notes": existing_appointment.get("notes")
                    }
                }
            
            # All validations passed
            return {
                "can_schedule": True,
                "error_type": None,
                "message": f"Paziente può programmare nuovo appuntamento per {cronoscita['nome']}",
                "existing_appointment": None,
                "patient_info": {
                    "nome": patient.get('demographics', {}).get('nome', ''),
                    "cognome": patient.get('demographics', {}).get('cognome', ''),
                    "cronoscita_name": cronoscita["nome"]
                }
            }
            
        except Exception as e:
            logger.error(f"❌ Error validating scheduling permissions: {e}")
            return {
                "can_schedule": False,
                "error_type": "VALIDATION_ERROR",
                "message": f"Errore durante validazione: {str(e)}",
                "existing_appointment": None
            }

# ================================
# APPOINTMENT OPERATIONS
# ================================

class AppointmentRepository:
    """Repository for appointment database operations"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.appointments_collection = db.appointments
        self.patients_collection = db.patients
    
    async def check_existing_future_appointment(
        self, 
        cf_paziente: str, 
        cronoscita_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Check if patient already has a future appointment for same Cronoscita
        Returns existing appointment data if found, None otherwise
        """
        try:
            today = date.today()
            
            existing_appointment = await self.appointments_collection.find_one({
                "cf_paziente": cf_paziente.upper(),
                "cronoscita_id": cronoscita_id,
                "appointment_date": {"$gte": today},
                "status": {"$in": ["scheduled"]}  # Only check scheduled appointments
            })
            
            if existing_appointment:
                logger.warning(f"⚠️ Patient {cf_paziente} already has future appointment for Cronoscita {cronoscita_id}")
                return {
                    "appointment_id": existing_appointment.get("appointment_id"),
                    "appointment_date": existing_appointment.get("appointment_date"),
                    "status": existing_appointment.get("status"),
                    "notes": existing_appointment.get("notes")
                }
            
            return None
            
        except Exception as e:
            logger.error(f"❌ Error checking existing appointment: {e}")
            return None
    
    async def create_appointment(
        self, 
        appointment_data: AppointmentDocument
    ) -> str:
        """
        Create new appointment in database
        Validates no duplicate future appointments for same CF + Cronoscita
        """
        try:
            # CRITICAL VALIDATION: Check for existing future appointment
            existing = await self.check_existing_future_appointment(
                appointment_data.cf_paziente,
                appointment_data.cronoscita_id
            )
            
            if existing:
                raise ValueError(
                    f"Il paziente {appointment_data.cf_paziente} ha già un appuntamento programmato "
                    f"per questa patologia in data {existing['appointment_date']}. "
                    f"Un paziente può avere solo un appuntamento futuro per Cronoscita."
                )
            
            # Convert to dict for MongoDB insertion
            appointment_dict = appointment_data.dict()
            appointment_dict["appointment_id"] = str(ObjectId())
            appointment_dict["created_at"] = datetime.now()
            appointment_dict["updated_at"] = datetime.now()
            
            result = await self.appointments_collection.insert_one(appointment_dict)
            
            logger.info(f"✅ Appointment created: {appointment_dict['appointment_id']} for CF {appointment_data.cf_paziente}")
            return str(result.inserted_id)
            
        except ValueError:
            # Re-raise validation errors
            raise
        except Exception as e:
            logger.error(f"❌ Error creating appointment: {e}")
            raise
    
    async def get_patient_info(self, cf_paziente: str) -> Optional[Dict[str, Any]]:
        """Get patient information for appointment"""
        try:
            patient = await self.patients_collection.find_one(
                {"cf_paziente": cf_paziente.upper()}
            )
            
            return patient
            
        except Exception as e:
            logger.error(f"❌ Error getting patient info: {e}")
            return None
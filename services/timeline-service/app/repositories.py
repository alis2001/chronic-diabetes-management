# services/timeline-service/app/repositories.py
"""
Timeline Service Repositories
Data access layer for clean database operations
FIXED: MongoDB date serialization issue
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, date
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

from .models import Patient, Appointment, AppointmentStatus, Referto
from .exceptions import DatabaseException, PatientNotFoundException, AppointmentNotFoundException

logger = logging.getLogger(__name__)

def serialize_for_mongodb(data: Dict[str, Any]) -> Dict[str, Any]:
    """Convert Python objects to MongoDB-compatible format"""
    if isinstance(data, dict):
        return {key: serialize_for_mongodb(value) for key, value in data.items()}
    elif isinstance(data, list):
        return [serialize_for_mongodb(item) for item in data]
    elif isinstance(data, date) and not isinstance(data, datetime):
        # Convert date to datetime for MongoDB compatibility
        return datetime.combine(data, datetime.min.time())
    elif isinstance(data, datetime):
        return data  # datetime objects are fine
    else:
        return data

class PatientRepository:
    """Repository for patient data access"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.patients
    
    async def find_by_cf(self, cf_paziente: str) -> Optional[Dict[str, Any]]:
        """Find patient by fiscal code"""
        try:
            return await self.collection.find_one({"cf_paziente": cf_paziente.upper()})
        except Exception as e:
            logger.error(f"Error finding patient by CF {cf_paziente}: {e}")
            raise DatabaseException(f"Failed to find patient: {str(e)}")
    
    async def create_patient(self, patient: Patient) -> str:
        """Create new patient with proper date serialization"""
        try:
            # Convert Pydantic model to dict and serialize dates for MongoDB
            patient_dict = patient.dict()
            patient_dict = serialize_for_mongodb(patient_dict)
            
            result = await self.collection.insert_one(patient_dict)
            logger.info(f"Patient created: {patient.cf_paziente}")
            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"Error creating patient {patient.cf_paziente}: {e}")
            raise DatabaseException(f"Failed to create patient: {str(e)}")
    
    async def update_patient(self, cf_paziente: str, updates: Dict[str, Any]) -> bool:
        """Update patient information"""
        try:
            updates["updated_at"] = datetime.now()
            updates = serialize_for_mongodb(updates)
            
            result = await self.collection.update_one(
                {"cf_paziente": cf_paziente.upper()},
                {"$set": updates}
            )
            if result.matched_count == 0:
                raise PatientNotFoundException(f"Patient {cf_paziente} not found")
            logger.info(f"Patient updated: {cf_paziente}")
            return result.modified_count > 0
        except PatientNotFoundException:
            raise
        except Exception as e:
            logger.error(f"Error updating patient {cf_paziente}: {e}")
            raise DatabaseException(f"Failed to update patient: {str(e)}")
    
    async def delete_patient(self, cf_paziente: str) -> bool:
        """Soft delete patient (set status to inactive)"""
        try:
            result = await self.collection.update_one(
                {"cf_paziente": cf_paziente.upper()},
                {
                    "$set": {
                        "status": "inactive",
                        "updated_at": datetime.now()
                    }
                }
            )
            if result.matched_count == 0:
                raise PatientNotFoundException(f"Patient {cf_paziente} not found")
            logger.info(f"Patient deactivated: {cf_paziente}")
            return result.modified_count > 0
        except PatientNotFoundException:
            raise
        except Exception as e:
            logger.error(f"Error deactivating patient {cf_paziente}: {e}")
            raise DatabaseException(f"Failed to deactivate patient: {str(e)}")
    
    async def find_patients_by_doctor(self, id_medico: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Find all patients for a doctor"""
        try:
            cursor = self.collection.find(
                {"id_medico": id_medico, "status": "active"}
            ).limit(limit)
            return await cursor.to_list(length=None)
        except Exception as e:
            logger.error(f"Error finding patients for doctor {id_medico}: {e}")
            raise DatabaseException(f"Failed to find patients for doctor: {str(e)}")

class AppointmentRepository:
    """Repository for appointment data access"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.appointments
    
    async def create_appointment(self, appointment: Appointment) -> str:
        """Create new appointment with proper date serialization"""
        try:
            appointment_dict = appointment.dict()
            appointment_dict = serialize_for_mongodb(appointment_dict)
            
            result = await self.collection.insert_one(appointment_dict)
            logger.info(f"Appointment created: {appointment.appointment_id}")
            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"Error creating appointment: {e}")
            raise DatabaseException(f"Failed to create appointment: {str(e)}")
    
    async def find_by_patient(self, cf_paziente: str) -> List[Dict[str, Any]]:
        """Find all appointments for a patient"""
        try:
            cursor = self.collection.find(
                {"cf_paziente": cf_paziente.upper()}
            ).sort("scheduled_date", 1)
            return await cursor.to_list(length=None)
        except Exception as e:
            logger.error(f"Error finding appointments for patient {cf_paziente}: {e}")
            raise DatabaseException(f"Failed to find appointments: {str(e)}")
    
    async def find_by_id(self, appointment_id: str) -> Optional[Dict[str, Any]]:
        """Find appointment by ID"""
        try:
            return await self.collection.find_one({"appointment_id": appointment_id})
        except Exception as e:
            logger.error(f"Error finding appointment {appointment_id}: {e}")
            raise DatabaseException(f"Failed to find appointment: {str(e)}")
    
    async def update_appointment(self, appointment_id: str, updates: Dict[str, Any]) -> bool:
        """Update appointment"""
        try:
            updates["updated_at"] = datetime.now()
            updates = serialize_for_mongodb(updates)
            
            result = await self.collection.update_one(
                {"appointment_id": appointment_id},
                {"$set": updates}
            )
            if result.matched_count == 0:
                raise AppointmentNotFoundException(f"Appointment {appointment_id} not found")
            logger.info(f"Appointment updated: {appointment_id}")
            return result.modified_count > 0
        except AppointmentNotFoundException:
            raise
        except Exception as e:
            logger.error(f"Error updating appointment {appointment_id}: {e}")
            raise DatabaseException(f"Failed to update appointment: {str(e)}")
    
    async def complete_appointment(self, appointment_id: str, completion_notes: str = None) -> bool:
        """Mark appointment as completed"""
        try:
            updates = {
                "status": AppointmentStatus.COMPLETED.value,
                "completed_at": datetime.now(),
                "updated_at": datetime.now()
            }
            if completion_notes:
                updates["completion_notes"] = completion_notes
                
            result = await self.collection.update_one(
                {"appointment_id": appointment_id},
                {"$set": updates}
            )
            if result.matched_count == 0:
                raise AppointmentNotFoundException(f"Appointment {appointment_id} not found")
            logger.info(f"Appointment completed: {appointment_id}")
            return result.modified_count > 0
        except AppointmentNotFoundException:
            raise
        except Exception as e:
            logger.error(f"Error completing appointment {appointment_id}: {e}")
            raise DatabaseException(f"Failed to complete appointment: {str(e)}")
    
    async def cancel_appointment(self, appointment_id: str, reason: str = None) -> bool:
        """Cancel appointment"""
        try:
            updates = {
                "status": AppointmentStatus.CANCELLED.value,
                "updated_at": datetime.now()
            }
            if reason:
                updates["cancellation_reason"] = reason
                
            result = await self.collection.update_one(
                {"appointment_id": appointment_id},
                {"$set": updates}
            )
            if result.matched_count == 0:
                raise AppointmentNotFoundException(f"Appointment {appointment_id} not found")
            logger.info(f"Appointment cancelled: {appointment_id}")
            return result.modified_count > 0
        except AppointmentNotFoundException:
            raise
        except Exception as e:
            logger.error(f"Error cancelling appointment {appointment_id}: {e}")
            raise DatabaseException(f"Failed to cancel appointment: {str(e)}")
    
    async def find_appointments_by_date_range(
        self, 
        start_date: date, 
        end_date: date, 
        doctor_id: str = None
    ) -> List[Dict[str, Any]]:
        """Find appointments in date range"""
        try:
            query = {
                "scheduled_date": {
                    "$gte": datetime.combine(start_date, datetime.min.time()),
                    "$lte": datetime.combine(end_date, datetime.max.time())
                }
            }
            if doctor_id:
                query["id_medico"] = doctor_id
            
            cursor = self.collection.find(query).sort("scheduled_date", 1)
            return await cursor.to_list(length=None)
        except Exception as e:
            logger.error(f"Error finding appointments by date range: {e}")
            raise DatabaseException(f"Failed to find appointments: {str(e)}")
    
    async def find_today_appointments(self, doctor_id: str = None) -> List[Dict[str, Any]]:
        """Find today's appointments"""
        today = date.today()
        return await self.find_appointments_by_date_range(today, today, doctor_id)
    
    async def get_appointment_statistics(self, cf_paziente: str) -> Dict[str, Any]:
        """Get appointment statistics for a patient"""
        try:
            pipeline = [
                {"$match": {"cf_paziente": cf_paziente.upper()}},
                {
                    "$group": {
                        "_id": "$status",
                        "count": {"$sum": 1}
                    }
                }
            ]
            cursor = self.collection.aggregate(pipeline)
            stats = await cursor.to_list(length=None)
            
            return {
                "total": sum(stat["count"] for stat in stats),
                "by_status": {stat["_id"]: stat["count"] for stat in stats}
            }
        except Exception as e:
            logger.error(f"Error getting appointment statistics: {e}")
            raise DatabaseException(f"Failed to get statistics: {str(e)}")
        
# Add this class at the END of your existing repositories.py file
# Insert after the AppointmentRepository class

class RefertoRepository:
    """Repository per operazioni referto medico"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.referti
    
    async def save_referto(self, referto) -> str:
        """Salva nuovo referto o aggiorna esistente"""
        try:
            # Genera ID se non presente
            if not referto.referto_id:
                referto.referto_id = f"REF_{int(datetime.now().timestamp())}"
            
            # Converte a dict e serializza per MongoDB
            referto_dict = referto.dict()
            referto_dict = serialize_for_mongodb(referto_dict)
            referto_dict["updated_at"] = datetime.now()
            
            # Upsert: aggiorna se esiste, crea se non esiste
            result = await self.collection.update_one(
                {"referto_id": referto.referto_id},
                {"$set": referto_dict},
                upsert=True
            )
            
            logger.info(f"Referto salvato: {referto.referto_id} per paziente {referto.cf_paziente}")
            return referto.referto_id
            
        except Exception as e:
            logger.error(f"Errore salvataggio referto: {e}")
            raise DatabaseException(f"Errore nel salvataggio referto: {str(e)}")
    
    async def find_by_patient(self, cf_paziente: str) -> List[Dict[str, Any]]:
        """Trova tutti i referti di un paziente"""
        try:
            cursor = self.collection.find(
                {"cf_paziente": cf_paziente.upper()}
            ).sort("data_visita", -1)  # Più recenti prima
            
            return await cursor.to_list(length=None)
            
        except Exception as e:
            logger.error(f"Errore ricerca referti paziente {cf_paziente}: {e}")
            raise DatabaseException(f"Errore ricerca referti: {str(e)}")
    
    async def find_by_id(self, referto_id: str) -> Optional[Dict[str, Any]]:
        """Trova referto per ID"""
        try:
            return await self.collection.find_one({"referto_id": referto_id})
        except Exception as e:
            logger.error(f"Errore ricerca referto {referto_id}: {e}")
            raise DatabaseException(f"Errore ricerca referto: {str(e)}")
    
    async def find_by_appointment(self, appointment_id: str) -> Optional[Dict[str, Any]]:
        """Trova referto associato ad appuntamento"""
        try:
            return await self.collection.find_one({"appointment_id": appointment_id})
        except Exception as e:
            logger.error(f"Errore ricerca referto per appuntamento {appointment_id}: {e}")
            raise DatabaseException(f"Errore ricerca referto: {str(e)}")
    
    async def update_status(self, referto_id: str, new_status: str) -> bool:
        """Aggiorna stato referto"""
        try:
            result = await self.collection.update_one(
                {"referto_id": referto_id},
                {
                    "$set": {
                        "status": new_status,
                        "updated_at": datetime.now()
                    }
                }
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Errore aggiornamento stato referto {referto_id}: {e}")
            raise DatabaseException(f"Errore aggiornamento referto: {str(e)}")
    
    async def check_referto_exists_for_patient_today(self, cf_paziente: str, id_medico: str) -> bool:
        """Controlla se esiste già un referto per il paziente oggi"""
        try:
            from datetime import date, datetime
            today = date.today()
            
            # Create datetime range for today (start and end of day)
            start_of_day = datetime.combine(today, datetime.min.time())
            end_of_day = datetime.combine(today, datetime.max.time())
            
            count = await self.collection.count_documents({
                "cf_paziente": cf_paziente.upper(),
                "id_medico": id_medico,
                "data_visita": {
                    "$gte": start_of_day,
                    "$lte": end_of_day
                }
            })
            
            logger.info(f"🔍 Checking referto for {cf_paziente} + {id_medico} on {today}: found {count} referti")
            return count > 0
            
        except Exception as e:
            logger.error(f"Errore controllo referto esistente: {e}")
            return False
# services/timeline-service/app/repositories.py
"""
Timeline Service Repositories
Data access layer for clean database operations
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, date
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

from .models import Patient, Appointment, AppointmentStatus
from .exceptions import DatabaseException, PatientNotFoundException, AppointmentNotFoundException

logger = logging.getLogger(__name__)

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
        """Create new patient"""
        try:
            result = await self.collection.insert_one(patient.dict())
            logger.info(f"Patient created: {patient.cf_paziente}")
            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"Error creating patient {patient.cf_paziente}: {e}")
            raise DatabaseException(f"Failed to create patient: {str(e)}")
    
    async def update_patient(self, cf_paziente: str, updates: Dict[str, Any]) -> bool:
        """Update patient information"""
        try:
            updates["updated_at"] = datetime.now()
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
        """Create new appointment"""
        try:
            result = await self.collection.insert_one(appointment.dict())
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
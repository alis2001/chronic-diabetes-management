# services/admin-dashboard/app/utils.py
"""
MongoDB ObjectId Serialization Utilities
Fixes the ObjectId serialization issue in laboratory endpoints
"""

from typing import Dict, List, Any, Union
from bson import ObjectId
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

def serialize_mongo_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert MongoDB document to JSON-serializable format
    Recursively handles ObjectId and datetime objects
    """
    if doc is None:
        return None
    
    if isinstance(doc, list):
        return [serialize_mongo_doc(item) for item in doc]
    
    if not isinstance(doc, dict):
        if isinstance(doc, ObjectId):
            return str(doc)
        elif isinstance(doc, datetime):
            return doc.isoformat()
        else:
            return doc
    
    serialized_doc = {}
    for key, value in doc.items():
        if key == "_id" and isinstance(value, ObjectId):
            # Convert _id to id
            serialized_doc["id"] = str(value)
        elif isinstance(value, ObjectId):
            # Convert any ObjectId to string
            serialized_doc[key] = str(value)
        elif isinstance(value, datetime):
            # Convert datetime to ISO string
            serialized_doc[key] = value.isoformat()
        elif isinstance(value, dict):
            # Recursively handle nested documents
            serialized_doc[key] = serialize_mongo_doc(value)
        elif isinstance(value, list):
            # Handle arrays
            serialized_doc[key] = serialize_mongo_doc(value)
        else:
            # Keep as is
            serialized_doc[key] = value
    
    return serialized_doc

def serialize_mongo_list(docs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Serialize a list of MongoDB documents
    """
    return [serialize_mongo_doc(doc) for doc in docs]

class MongoJSONEncoder:
    """
    Custom JSON encoder for MongoDB documents
    Use this for consistent ObjectId handling across all endpoints
    """
    
    @staticmethod
    def encode_response(data: Union[Dict, List], success: bool = True, message: str = None) -> Dict[str, Any]:
        """
        Create a standard API response with proper MongoDB serialization
        """
        if isinstance(data, list):
            serialized_data = serialize_mongo_list(data)
        else:
            serialized_data = serialize_mongo_doc(data)
        
        response = {
            "success": success,
            "data": serialized_data
        }
        
        if message:
            response["message"] = message
            
        if isinstance(data, list):
            response["total"] = len(data)
            
        return response

# Quick helper functions for common use cases
def serialize_exam_catalog(catalog_data: List[Dict]) -> List[Dict]:
    """Serialize exam catalog data specifically"""
    return serialize_mongo_list(catalog_data)

def serialize_exam_mappings(mappings_data: List[Dict]) -> List[Dict]:
    """Serialize exam mappings data specifically"""  
    return serialize_mongo_list(mappings_data)

def serialize_lab_overview(stats_data: Dict) -> Dict:
    """Serialize laboratory overview stats"""
    return serialize_mongo_doc(stats_data)
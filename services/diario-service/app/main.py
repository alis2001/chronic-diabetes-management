from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import httpx
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Diario Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

WIRGILIO_BASE_URL = os.getenv("WIRGILIO_BASE_URL", "https://10.10.13.14")
WIRGILIO_API_PATH = os.getenv("WIRGILIO_API_PATH", "/cpi/wirgilio-api")
WIRGILIO_VERIFY_SSL = os.getenv("WIRGILIO_VERIFY_SSL", "true").lower() == "true"
WIRGILIO_TOKEN = os.getenv("WIRGILIO_TOKEN", "your-wirgilio-api-token")

class HealthResponse(BaseModel):
    service: str
    status: str
    timestamp: datetime

@app.get("/")
def read_root():
    return {"service": "Diario Service", "status": "running"}

@app.get("/health", response_model=HealthResponse)
def health_check():
    return HealthResponse(
        service="diario-service",
        status="healthy", 
        timestamp=datetime.now()
    )

@app.get("/documents/{cf}")
async def get_documents(cf: str):
    try:
        logger.info(f"🔍 Fetching documents for CF: {cf}")
        
        headers = {
            "Authorization": f"Bearer {WIRGILIO_TOKEN}",
            "Content-Type": "application/json"
        }
        
        url = f"{WIRGILIO_BASE_URL}{WIRGILIO_API_PATH}/archivios/?codicefiscale={cf}"
        logger.info(f"🌐 Wirgilio URL: {url}")
        logger.info(f"🔐 Using token: {WIRGILIO_TOKEN[:10]}...")
        
        async with httpx.AsyncClient(timeout=60.0, verify=WIRGILIO_VERIFY_SSL) as client:
            response = await client.get(url, headers=headers)
            
            logger.info(f"📡 Wirgilio API response status: {response.status_code}")
            
            if response.status_code != 200:
                logger.error(f"❌ Wirgilio API error: {response.status_code} - {response.text}")
                raise HTTPException(status_code=response.status_code, detail=f"Wirgilio API error: {response.text}")
            
            documents = response.json()
            logger.info(f"✅ Retrieved {len(documents)} documents")
            
            sorted_docs = sorted(documents, key=lambda x: x.get('datadocumento', ''), reverse=True)
            
            return {"documents": sorted_docs, "count": len(sorted_docs)}
            
    except httpx.TimeoutException:
        logger.error(f"⏰ Timeout connecting to Wirgilio API")
        raise HTTPException(status_code=504, detail="Timeout connecting to Wirgilio API")
    except httpx.ConnectError as e:
        logger.error(f"🔌 Connection error to Wirgilio API: {str(e)}")
        raise HTTPException(status_code=503, detail=f"Cannot connect to Wirgilio API: {str(e)}")
    except Exception as e:
        logger.error(f"❌ Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

@app.get("/pdf/{file_id}")
async def get_pdf(file_id: str):
    try:
        logger.info(f"📄 Fetching PDF for file_id: {file_id}")
        
        headers = {
            "Authorization": f"Bearer {WIRGILIO_TOKEN}",
            "Content-Type": "application/json"
        }
        
        # Correct URL as specified: https://10.10.13.14/cpi/repository/uploads/base64/file/{file_id}
        url = f"{WIRGILIO_BASE_URL}/cpi/repository/uploads/base64/file/{file_id}"
        logger.info(f"🌐 PDF URL: {url}")
        
        async with httpx.AsyncClient(timeout=30.0, verify=WIRGILIO_VERIFY_SSL) as client:
            response = await client.get(url, headers=headers)
            
            logger.info(f"📡 PDF API response status: {response.status_code}")
            
            if response.status_code != 200:
                logger.error(f"❌ PDF API error: {response.status_code} - {response.text}")
                raise HTTPException(status_code=response.status_code, detail=f"PDF API error: {response.text}")
            
            return response.json()
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ PDF fetch error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"PDF fetch error: {str(e)}")
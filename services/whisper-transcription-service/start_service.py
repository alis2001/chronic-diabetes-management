#!/usr/bin/env python3
"""
Startup script for Whisper Transcription Service
Run this to start the service locally without containerization
"""

import os
import sys
import subprocess
from pathlib import Path

def main():
    """Start the Whisper transcription service"""
    
    # Get the service directory
    service_dir = Path(__file__).parent
    
    # Change to service directory
    os.chdir(service_dir)
    
    print("🎤 Starting Whisper Transcription Service...")
    print(f"📁 Working directory: {service_dir}")
    
    # Check if requirements are installed
    try:
        import whisper
        import torch
        import fastapi
        print("✅ Required packages are installed")
    except ImportError as e:
        print(f"❌ Missing required package: {e}")
        print("📦 Installing requirements...")
        
        # Install requirements
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"], check=True)
        print("✅ Requirements installed")
    
    # Start the service
    print("🚀 Starting service on http://localhost:5003")
    print("📚 API docs available at http://localhost:5003/docs")
    print("🛑 Press Ctrl+C to stop")
    
    try:
        # Run the service
        subprocess.run([
            sys.executable, "-m", "uvicorn", 
            "main:app", 
            "--host", "0.0.0.0", 
            "--port", "5003", 
            "--reload"
        ], check=True)
    except KeyboardInterrupt:
        print("\n🛑 Service stopped by user")
    except subprocess.CalledProcessError as e:
        print(f"❌ Service failed to start: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

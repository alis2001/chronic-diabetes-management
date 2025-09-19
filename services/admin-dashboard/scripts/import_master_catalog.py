#!/usr/bin/env python3
import pandas as pd
import asyncio
import sys
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def import_xlsx_to_master_catalog(xlsx_file_path: str):
    """Import XLSX catalog to master_prestazioni collection - STANDALONE VERSION"""
    try:
        print(f"📖 Reading XLSX: {xlsx_file_path}")
        
        # Read XLSX file
        df = pd.read_excel(xlsx_file_path)
        
        print(f"📊 Found {len(df)} rows in XLSX")
        print(f"📋 Columns: {list(df.columns)}")
        
        # Convert to list of dictionaries
        prestazioni_data = df.to_dict('records')
        
        # Connect to database (MongoDB running in Docker)
        mongodb_url = "mongodb://admin:admin123@localhost:27018/diabetes_db?authSource=admin"
        print("🔗 Connecting to MongoDB...")
        client = AsyncIOMotorClient(mongodb_url)
        db = client.diabetes_db
        
        # Test connection
        await db.command("ping")
        print("✅ Connected to database successfully")
        
        # Get collection
        master_collection = db.master_prestazioni
        
        print("🔄 Starting import...")
        
        imported_count = 0
        updated_count = 0
        errors = []
        
        for row_num, row_data in enumerate(prestazioni_data, 1):
            try:
                # Extract XLSX columns (exact column names)
                codice_catalogo = str(row_data.get("CODICECATALOGO", "")).strip()
                codicereg = str(row_data.get("CODICEREG", "")).strip()
                nome_esame = str(row_data.get("DESCRIZIONECATALOGO", "")).strip()
                codice_branca = str(row_data.get("CODICEBRANCA", "")).strip()
                
                # Skip rows with missing required data
                if not codice_catalogo or not nome_esame:
                    errors.append(f"Row {row_num}: Missing CODICECATALOGO or DESCRIZIONECATALOGO")
                    continue
                
                # Create document
                prestazione_doc = {
                    "codice_catalogo": codice_catalogo,
                    "codicereg": codicereg,
                    "nome_esame": nome_esame.upper(),  # Convert to uppercase
                    "codice_branca": codice_branca,
                    "branch_description": f"Branca {codice_branca}",
                    "is_active": True,
                    "imported_at": datetime.now()
                }
                
                # Insert or update (upsert)
                result = await master_collection.replace_one(
                    {"codice_catalogo": codice_catalogo},
                    prestazione_doc,
                    upsert=True
                )
                
                if result.upserted_id:
                    imported_count += 1
                else:
                    updated_count += 1
                
                # Progress indicator every 100 records
                total_processed = imported_count + updated_count
                if total_processed % 100 == 0:
                    print(f"✅ Processed {total_processed} procedures...")
                    
            except Exception as row_error:
                errors.append(f"Row {row_num}: {str(row_error)}")
                continue
        
        # Create indexes for better search performance
        try:
            await master_collection.create_index("codice_catalogo", unique=True)
            await master_collection.create_index("nome_esame")
            await master_collection.create_index("codice_branca")
            print("✅ Created database indexes")
        except Exception as idx_error:
            print(f"⚠️ Warning: Could not create indexes: {idx_error}")
        
        # Summary
        print("\n" + "="*60)
        print("✅ IMPORT COMPLETED SUCCESSFULLY")
        print(f"📥 Total imported (new): {imported_count}")
        print(f"🔄 Total updated (existing): {updated_count}")
        print(f"📊 Total processed: {len(prestazioni_data)}")
        print(f"⚠️  Errors: {len(errors)}")
        print("="*60)
        
        # Show first few errors if any
        if errors:
            print(f"\n❌ First {min(10, len(errors))} errors:")
            for error in errors[:10]:
                print(f"  - {error}")
        
        # Show sample imported data
        sample = await master_collection.find_one()
        if sample:
            print(f"\n📋 Sample imported record:")
            print(f"  - Codice: {sample.get('codice_catalogo')}")
            print(f"  - Nome: {sample.get('nome_esame')[:50]}...")
            print(f"  - Branca: {sample.get('codice_branca')}")
        
        client.close()
        return {"success": True, "imported": imported_count, "updated": updated_count}
        
    except FileNotFoundError:
        print(f"❌ ERROR: File not found: {xlsx_file_path}")
        return {"success": False, "error": "File not found"}
    except Exception as e:
        print(f"❌ IMPORT FAILED: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 import_master_catalog.py <xlsx_file>")
        print("Example: python3 import_master_catalog.py catalogo_regionale.xlsx")
        sys.exit(1)
    
    xlsx_file = sys.argv[1]
    
    if not os.path.exists(xlsx_file):
        print(f"❌ File not found: {xlsx_file}")
        print(f"Current directory: {os.getcwd()}")
        print(f"Files in directory: {os.listdir('.')}")
        sys.exit(1)
    
    print(f"🚀 Starting import of {xlsx_file}")
    result = asyncio.run(import_xlsx_to_master_catalog(xlsx_file))
    
    if result["success"]:
        print("🎉 Import completed successfully!")
        sys.exit(0)
    else:
        print("💥 Import failed!")
        sys.exit(1)

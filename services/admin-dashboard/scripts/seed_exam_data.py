# services/admin-dashboard/scripts/seed_exam_data.py
"""
Laboratory Exam Data Seeder - PERMANENT CATALOG
Seeds the database with the permanent official exam catalog provided by user
"""

import asyncio
import sys
import os
from typing import List, Dict

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import connect_to_mongo, get_database, create_exam_catalog_indexes
from datetime import datetime

# Raw exam data provided by user - PERMANENT CATALOG
OFFICIAL_EXAM_CATALOG = [
    ("90271.003", "90.27.1", "GLUCOSIO [Siero-Plasma]", "011"),
    ("90441.002", "90.44.1", "UREA [Plasma-Siero]", "011"),
    ("90163.002", "90.16.3", "CREATININA [Siero]", "011"),
    ("90435.001", "90.43.5", "URATO [Siero]", "011"),
    ("90143.001", "90.14.3", "COLESTEROLO TOTALE", "011"),
    ("90432.001", "90.43.2", "TRIGLICERIDI", "011"),
    ("90141.001", "90.14.1", "COLESTEROLO HDL", "011"),
    ("90281.001", "90.28.1", "Hb - EMOGLOBINA GLICATA", "011"),
    ("90164.001", "90.16.4", "CREATININA CLEARANCE. Non associabile a CREATININA (90.16.3)", "011"),
    ("90092.001", "90.09.2", "ASPARTATO AMINOTRANSFERASI (AST) (GOT)", "011"),
    ("90045.001", "90.04.5", "ALANINA AMINOTRANSFERASI (ALT) (GPT)", "011"),
    ("90154.001", "90.15.4", "CREATINA CHINASI (CPK o CK)", "011"),
    ("90443.001", "90.44.3", "URINE ESAME COMPLETO. Incluso: sedimento urinario", "011"),
    ("90051.001", "90.05.1", "ALBUMINA [Siero]", "011"),
    ("90051.003", "90.05.1", "ALBUMINA [Urine]", "011"),
    ("90105.001", "90.10.5", "BILIRUBINA REFLEX (cut-off >1 mg-dL salvo definizione di cut-off più restrittivi a livello regionale)", "011"),
    ("9013B.001", "90.13.B", "COLESTEROLO LDL. Determinazione indiretta. Erogabile solo in associazione a Colesterolo HDL (90.14.1)", "011"),
    ("90163.001", "90.16.3", "CREATININA [Liquido Amniotico]", "011"),
    ("90163.003", "90.16.3", "CREATININA [Urine 24h]", "011"),
    ("90163.004", "90.16.3", "CREATININA [Urine]", "011"),
    ("90622.001", "90.62.2", "EMOCROMO: ESAME EMOCROMOCITOMETRICO E CONTEGGIO LEUCOCITARIO DIFFERENZIALE Hb, GR, GB, HCT, PLT, IND", "011"),
    ("90271.001", "90.27.1", "GLUCOSIO [Liquido Amniotico]", "011"),
    ("90271.004", "90.27.1", "GLUCOSIO [Urine 24h]", "011"),
    ("90271.005", "90.27.1", "GLUCOSIO [Urine]", "011"),
    ("90255.001", "90.25.5", "Gamma GT", "011"),
    ("90255.003", "90.25.5", "Gamma GT [Siero]", "011"),
    ("90334.001", "90.33.4", "ALBUMINURIA [MICROALBUMINURIA]", "011"),
    ("91491.001", "91.49.1", "PRELIEVO DI SANGUE CAPILLARE", "011"),
    ("91492.001", "91.49.2", "PRELIEVO DI SANGUE VENOSO", "011"),
    ("90435.003", "90.43.5", "URATO [Urine]", "011"),
    ("90441.004", "90.44.1", "UREA [Urine]", "011"),
]

async def seed_exam_catalog():
    """Seed the permanent exam catalog into the database"""
    try:
        # Connect to database
        await connect_to_mongo()
        db = await get_database()
        
        # Ensure indexes exist
        await create_exam_catalog_indexes(db)
        
        # Get catalog collection
        catalog_collection = db.exam_catalog
        
        # Check if already seeded
        existing_count = await catalog_collection.count_documents({})
        if existing_count > 0:
            print(f"📊 Database already contains {existing_count} exam catalog entries")
            response = input("Do you want to clear and reseed? (y/N): ")
            if response.lower() != 'y':
                print("✅ Seeding cancelled")
                return
            
            # Clear existing data
            await catalog_collection.delete_many({})
            print("🗑️ Cleared existing catalog data")
        
        # Prepare catalog entries
        catalog_entries = []
        for codice_catalogo, codice_branca, nome_esame, struttura_codice in OFFICIAL_EXAM_CATALOG:
            entry = {
                "codice_catalogo": codice_catalogo,
                "codice_branca": codice_branca,
                "nome_esame": nome_esame,
                "struttura_codice": struttura_codice,
                "descrizione": f"Esame ufficiale - Branca {codice_branca}",
                "is_enabled": True,
                "created_at": datetime.now(),
                "updated_at": datetime.now()
            }
            catalog_entries.append(entry)
        
        # Insert all entries
        result = await catalog_collection.insert_many(catalog_entries)
        
        print(f"✅ Successfully seeded {len(result.inserted_ids)} exam catalog entries")
        print(f"📋 Total entries in catalog: {await catalog_collection.count_documents({})}")
        
        # Show sample entries
        print("\n🔬 Sample entries:")
        async for exam in catalog_collection.find().limit(5):
            print(f"   • {exam['codice_catalogo']} - {exam['nome_esame'][:50]}...")
        
        print("\n✅ Laboratory exam catalog seeding completed!")
        print("🎯 Next steps:")
        print("   1. Start admin dashboard: make up")
        print("   2. Go to http://localhost:3012 → Laboratorio tab")
        print("   3. Create mappings for different strutture")
        
    except Exception as e:
        print(f"❌ Error seeding database: {str(e)}")
        raise

if __name__ == "__main__":
    print("🔬 Laboratory Exam Catalog Seeder")
    print("=" * 50)
    print(f"📊 Will seed {len(OFFICIAL_EXAM_CATALOG)} official exams")
    print("🎯 These will be the permanent catalog entries")
    print()
    
    asyncio.run(seed_exam_catalog())
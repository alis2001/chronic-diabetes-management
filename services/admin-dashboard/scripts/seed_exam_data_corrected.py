# services/admin-dashboard/scripts/seed_exam_data_corrected.py
"""
Laboratory Exam Data Seeder - LABORATORY BRANCH 011 ONLY
Only includes Branca Laboratorio d'Analisi (branch code 011)
31 laboratory exams for diabetes management
"""

import asyncio
import sys
import os
from typing import List, Dict

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import connect_to_mongo, get_database, create_exam_catalog_indexes
from datetime import datetime

# LABORATORY EXAMS ONLY - BRANCH 011 (Branca Laboratorio d'Analisi)
LABORATORY_EXAM_CATALOG = [
    ("90271.003", "90.27.1", "GLUCOSIO [Siero-Plasma]"),
    ("90441.002", "90.44.1", "UREA [Plasma-Siero]"),
    ("90163.002", "90.16.3", "CREATININA [Siero]"),
    ("90435.001", "90.43.5", "URATO [Siero]"),
    ("90143.001", "90.14.3", "COLESTEROLO TOTALE"),
    ("90432.001", "90.43.2", "TRIGLICERIDI"),
    ("90141.001", "90.14.1", "COLESTEROLO HDL"),
    ("90281.001", "90.28.1", "Hb - EMOGLOBINA GLICATA"),
    ("90164.001", "90.16.4", "CREATININA CLEARANCE. Non associabile a CREATININA (90.16.3)"),
    ("90092.001", "90.09.2", "ASPARTATO AMINOTRANSFERASI (AST) (GOT)"),
    ("90045.001", "90.04.5", "ALANINA AMINOTRANSFERASI (ALT) (GPT)"),
    ("90154.001", "90.15.4", "CREATINA CHINASI (CPK o CK)"),
    ("90443.001", "90.44.3", "URINE ESAME COMPLETO. Incluso: sedimento urinario"),
    ("90051.001", "90.05.1", "ALBUMINA [Siero]"),
    ("90051.003", "90.05.1", "ALBUMINA [Urine]"),
    ("90105.001", "90.10.5", "BILIRUBINA REFLEX (cut-off >1 mg-dL salvo definizione di cut-off più restrittivi a livello regionale"),
    ("9013B.001", "90.13.B", "COLESTEROLO LDL. Determinazione indiretta. Erogabile solo in associazione a Colesterolo HDL (90.14.1"),
    ("90163.001", "90.16.3", "CREATININA [Liquido Amniotico]"),
    ("90163.003", "90.16.3", "CREATININA [Urine 24h]"),
    ("90163.004", "90.16.3", "CREATININA [Urine]"),
    ("90622.001", "90.62.2", "EMOCROMO: ESAME EMOCROMOCITOMETRICO E CONTEGGIO LEUCOCITARIO DIFFERENZIALE Hb, GR, GB, HCT, PLT, IND"),
    ("90271.001", "90.27.1", "GLUCOSIO [Liquido Amniotico]"),
    ("90271.004", "90.27.1", "GLUCOSIO [Urine 24h]"),
    ("90271.005", "90.27.1", "GLUCOSIO [Urine]"),
    ("90255.001", "90.25.5", "Gamma GT"),
    ("90255.003", "90.25.5", "Gamma GT [Siero]"),
    ("90334.001", "90.33.4", "ALBUMINURIA [MICROALBUMINURIA]"),
    ("91491.001", "91.49.1", "PRELIEVO DI SANGUE CAPILLARE"),
    ("91492.001", "91.49.2", "PRELIEVO DI SANGUE VENOSO"),
    ("90435.003", "90.43.5", "URATO [Urine]"),
    ("90441.004", "90.44.1", "UREA [Urine]"),
]

async def seed_exam_catalog():
    """Seed only the laboratory exam catalog (branch 011) into the database"""
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
        
        # Prepare catalog entries with CORRECT field mapping
        catalog_entries = []
        for codice_catalogo, codicereg, nome_esame in LABORATORY_EXAM_CATALOG:
            entry = {
                "codice_catalogo": codice_catalogo,        # First column: 90271.003
                "codicereg": codicereg,                   # Second column: 90.27.1 (CODICEREG)
                "nome_esame": nome_esame,                 # Third column: GLUCOSIO [Siero-Plasma]
                "codice_branca": "011",                   # Fourth column: always 011 (actual codice_branca)
                "branch_description": "Branca Laboratorio d'Analisi",
                "descrizione": f"Esame laboratorio - {nome_esame}",
                "is_enabled": True,
                "created_at": datetime.now(),
                "updated_at": datetime.now()
            }
            catalog_entries.append(entry)
        
        # Insert all entries
        result = await catalog_collection.insert_many(catalog_entries)
        
        print(f"✅ Successfully seeded {len(result.inserted_ids)} laboratory exam catalog entries")
        print(f"📋 Total entries in catalog: {await catalog_collection.count_documents({})}")
        
        print(f"\n🔬 Laboratory Analysis Branch (011): {len(catalog_entries)} exams")
        
        # Show first 5 sample entries
        print("\n📋 Sample laboratory exams:")
        for exam in catalog_entries[:5]:
            print(f"   • {exam['codice_catalogo']} | {exam['codicereg']} | {exam['nome_esame'][:50]}...")
        
        print("\n✅ Laboratory exam catalog seeding completed!")
        print("🎯 Next steps:")
        print("   1. Restart admin dashboard: docker-compose restart admin-dashboard")
        print("   2. Go to http://localhost:3012 → Laboratorio tab")
        print("   3. View the 31 laboratory exams in the catalog")
        print("   4. Create Wirgilio mappings for different healthcare structures")
        
    except Exception as e:
        print(f"❌ Error seeding database: {str(e)}")
        raise

if __name__ == "__main__":
    print("🔬 Laboratory Exam Catalog Seeder - Branch 011 Only")
    print("=" * 60)
    print(f"📊 Will seed {len(LABORATORY_EXAM_CATALOG)} laboratory exams")
    print("🎯 All exams will have codice_branca = 011 (Laboratorio d'Analisi)")
    print("\n📋 Structure:")
    print("   • codice_catalogo: Official catalog code (e.g., 90271.003)")
    print("   • codicereg: CODICEREG from Excel (e.g., 90.27.1)")
    print("   • nome_esame: Exam description")
    print("   • codice_branca: Always '011' for laboratory branch")
    print()
    
    asyncio.run(seed_exam_catalog())
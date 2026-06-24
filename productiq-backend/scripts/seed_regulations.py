"""
ProductIQ — Seed Regulations for Compliance Agent (Agent 12)
Run once: python scripts/seed_regulations.py

Seeds FSSAI, AYUSH, BIS regulatory text into pgvector for RAG retrieval.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import settings

REGULATIONS = [
    {
        "title": "FSSAI Food Safety Standards — Core Requirements",
        "source": "fssai",
        "text": """
Food Safety and Standards Authority of India (FSSAI) — Key Compliance Requirements:

1. LICENSING: All food business operators (FBOs) must obtain FSSAI licence or registration.
   - Petty FBOs (turnover < ₹12 lakh): Registration (Form A)
   - Small/Medium FBOs: State Licence (Form B)
   - Large FBOs (turnover > ₹20 crore, multi-state, importer): Central Licence (Form B)

2. LABELLING REQUIREMENTS (FSS Labelling and Display Regulations 2020):
   - Name and description of food product
   - Complete list of ingredients in descending order by weight
   - Nutritional information per 100g/100ml in prescribed tabular format
   - Net quantity (weight or volume)
   - Date of manufacture (DOM) and best before / use by date
   - Name, address, and contact of manufacturer and/or packer
   - Country of origin (for imported products)
   - FSSAI licence number prominently displayed
   - Batch/Lot number
   - Customer care details (name, address, email, telephone)
   - Instructions for use / storage conditions where necessary
   - Veg/Non-veg logo (green dot = vegetarian, brown dot = non-vegetarian)

3. HEALTH AND NUTRITION CLAIMS:
   - All health claims must be scientifically substantiated
   - Claims must be pre-approved — submit dossier to FSSAI
   - Prohibited: disease treatment, cure, mitigation, or prevention claims on food products
   - Nutrient content claims (e.g., "high protein", "low fat") require minimum thresholds per regulations
   - Organic claims require certification from FSSAI-accredited certifying bodies

4. PROPRIETARY FOOD (Novel and Fortified Products):
   - Products containing novel ingredients require pre-market approval
   - Functional foods and nutraceuticals regulated under FSS (Health Supplements, Nutraceuticals, 
     Food for Special Dietary Use, Food for Special Medical Purpose, Functional Food and Novel Food) 
     Regulations, 2016
   - Protein supplements, meal replacements fall under Schedule 4 of these regulations

5. ADDITIVES AND CONTAMINANTS:
   - Only FSSAI-permitted food additives at prescribed maximum limits
   - Heavy metals, pesticides, mycotoxins must be within Schedule limits
   - GMP compliance mandatory for manufacturing

6. QUALITY STANDARDS:
   - Products must conform to specifications in respective Food Product Standards
   - Regular testing from FSSAI-notified/accredited laboratories required
   - Third-party audits recommended for exports
""",
    },
    {
        "title": "AYUSH Ministry Regulations — Herbal and ASU Products",
        "source": "ayush",
        "text": """
AYUSH (Ayurveda, Yoga, Naturopathy, Unani, Siddha, Homeopathy) Regulatory Framework:

1. REGULATORY AUTHORITY:
   - ASU drugs regulated under Drugs and Cosmetics Act 1940 and Rules 1945
   - Ministry of AYUSH oversees licensing and quality standards
   - Schedule E1 lists herbs/ingredients restricted for use without medical supervision

2. CLASSICAL vs PATENT/PROPRIETARY:
   - Classical ASU formulations listed in official formularies (Ayurvedic Formulary of India, 
     Unani Pharmacopoeia, Siddha Formulary) do not require clinical trials
   - Patent and Proprietary ASU medicines require:
     a) Manufacturing licence from State Drug Control Authority (Form 25D)
     b) Safety and efficacy data per AYUSH guidelines
     c) Clinical trial if new combination not in classical texts

3. CLAIMS DIFFERENTIATION (Critical):
   - Wellness/adaptogen claims → can be made on food/nutraceutical products with FSSAI licence
   - Disease treatment, mitigation, prevention, cure claims → requires DRUG LICENCE, not food licence
   - Traditional use claims on classified ASU drugs → permitted as per Schedule H/OTC categorisation

4. HEAVY METAL LIMITS:
   - Lead: max 10 ppm
   - Mercury: max 1 ppm
   - Arsenic: max 3 ppm
   - Cadmium: max 0.3 ppm
   - Testing mandatory — use NABL-accredited laboratory

5. GMP COMPLIANCE:
   - Schedule T of Drugs and Cosmetics Rules mandates GMP for ASU manufacturing
   - Separate manufacturing licence required for each facility
   - WHO-GMP certification recommended for exports

6. LABELLING FOR ASU DRUGS:
   - Name of the drug (classical/proprietary)
   - Ingredients with botanical names
   - Manufacturing and expiry date
   - Batch number
   - Manufacturer name and address
   - AYUSH licence number
   - Dosage instructions
   - "To be taken under medical supervision" where applicable
   - Schedule H drugs require "Rx" symbol

7. COMMON RISK AREAS:
   - Ashwagandha products: wellness claims OK on FSSAI food; disease claims require drug licence
   - Protein supplements with Ayurvedic herbs: dual-licence territory — seek regulatory opinion
   - Imported raw materials: need import licence and testing at port of entry
""",
    },
    {
        "title": "BIS Standards — Consumer Products and Quality Control Orders",
        "source": "bis",
        "text": """
Bureau of Indian Standards (BIS) — Requirements for Consumer Goods:

1. ISI MARK:
   - Mandatory for products under Compulsory Certification Orders (CCOs)
   - Common CCO-covered categories: LPG cylinders, helmets, cement, packaged drinking water,
     electronics, toys, footwear, some food products
   - ISI Mark requires BIS product certification scheme (IS licence)

2. QUALITY CONTROL ORDERS (QCOs):
   - Government ministries issue QCOs making BIS certification mandatory for specific categories
   - Import of covered products requires BIS Registration/Certification
   - Check applicable QCO at the Ministry of Commerce or BIS website for your category

3. FOOD PRODUCTS:
   - IS 14550: Labelling and packaging standards for nutritional supplements
   - Packaged drinking water: IS 14543 (mandatory BIS certification)
   - Milk products: covered under Food Safety Standards + relevant IS standards
   - Organic products: aligned labelling with FSSAI organic certification

4. ELECTRONICS IN PRODUCTS:
   - Products with electronic components may require BIS certification under 
     Electronics and Information Technology Goods (Requirement for Compulsory Registration) 
     Order (CRO)
   - Smart packaging, IoT-enabled products: check CRO applicability

5. IMPORT REQUIREMENTS:
   - Importers of BIS-covered products must hold valid BIS registration
   - Random testing at ports — non-compliant goods can be seized
   - QCO-covered imports require advance BIS certification before clearance

6. VOLUNTARY CERTIFICATION:
   - Companies can voluntarily seek BIS certification even if not mandatory
   - Confers consumer trust, useful for government procurement
   - Required for several government tender categories

7. PROCESS:
   - Apply on BIS portal (mtnsmis.bis.gov.in)
   - Factory inspection and product sample testing
   - Licence valid for 1 year, renewable
   - Fees based on capacity and product category
""",
    },
    {
        "title": "India Import Export Regulations — D2C and E-commerce",
        "source": "import_export",
        "text": """
Import / Export Compliance for D2C and FMCG Products in India:

1. EXPORT REQUIREMENTS:
   - IEC (Import Export Code) from DGFT — mandatory for all exporters
   - APEDA registration for agricultural and processed food exports
   - FSSAI export certificate for food products
   - Meet destination country import regulations (e.g., USFDA for USA, EU Novel Food for Europe)
   - Documents: Commercial invoice, Packing list, COO (Certificate of Origin), COA

2. IMPORT REQUIREMENTS:
   - IEC mandatory
   - Custom Duty payment at applicable tariff rates
   - FSSAI import clearance for food and food contact materials
   - BIS registration for covered categories
   - Drug licence for ASU/cosmetic imports containing restricted ingredients
   - RBI/FEMA compliance for payments

3. E-COMMERCE EXPORT (ODOP / RBI FDI Policy):
   - Exports via courier: streamlined customs under Courier Imports and Exports Regulations
   - Automatic route for most D2C e-commerce exports
   - GST: zero-rated for exports; claim LUT/bond to export without upfront GST payment

4. LEGAL METROLOGY:
   - Legal Metrology (Packaged Commodities) Rules 2011
   - All pre-packed commodities must display: net quantity, MRP (inclusive of taxes), 
     month & year of manufacture, name of manufacturer/packer/importer
   - Penalty for non-compliance: fine up to ₹25,000 + seizure of stock
""",
    },
]


def seed():
    """Seeds all regulation documents into pgvector."""
    try:
        from llama_index.core import Document
        from llama_index.core.ingestion import IngestionPipeline
        from llama_index.core.node_parser import SentenceSplitter
        from llama_index.embeddings.gemini import GeminiEmbedding
        from llama_index.vector_stores.supabase import SupabaseVectorStore

        print(f"Seeding {len(REGULATIONS)} regulation documents into pgvector...")
        print(f"Supabase: {settings.SUPABASE_URL}")
        print()

        embed_model = GeminiEmbedding(
            model_name="models/embedding-001",
            api_key=settings.GEMINI_API_KEY,
        )
        vector_store = SupabaseVectorStore(
            postgres_connection_string=settings.DATABASE_URL,
            collection_name="embeddings",
            dimension=768,
        )

        documents = []
        for reg in REGULATIONS:
            doc = Document(
                text=reg["text"].strip(),
                metadata={
                    "source_type": "regulation",
                    "source": reg["source"],
                    "title": reg["title"],
                },
            )
            documents.append(doc)
            print(f"  ✓ Prepared: {reg['title']}")

        pipeline = IngestionPipeline(
            transformations=[
                SentenceSplitter(chunk_size=512, chunk_overlap=50),
                embed_model,
            ],
            vector_store=vector_store,
        )
        pipeline.run(documents=documents)

        print(f"\n✅ Successfully seeded {len(documents)} documents into pgvector.")
        print("Compliance Guardian (Agent 12) is now ready.")

    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Run: pip install llama-index llama-index-embeddings-gemini llama-index-vector-stores-supabase")
    except Exception as e:
        print(f"❌ Seeding failed: {e}")
        raise


if __name__ == "__main__":
    seed()

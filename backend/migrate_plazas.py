"""Migration: create all plazas (7 operational + 14 upcoming) and assign existing outlets.
Run: python3 /app/backend/migrate_plazas.py
"""
import os
import uuid
from datetime import datetime, timezone
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / ".env")

from pymongo import MongoClient

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

FEDRA_IMG = "https://customer-assets.emergentagent.com/job_gallops-reserve-dine/artifacts/dh0xn7c9_Fedra%20Image.jpeg"
ANAND_IMG = "https://customer-assets.emergentagent.com/job_gallops-reserve-dine/artifacts/dh0xn7c9_Fedra%20Image.jpeg"  # same visual style if no Anand banner yet

OPERATIONAL = [
    # (name, city, is_head_office, image, description)
    ("Fedra", "Fedra", True, FEDRA_IMG,
     "Our head office & flagship plaza — a full highway food destination."),
    ("Anand", "Anand", False, ANAND_IMG,
     "Our Anand plaza — 19 outlets under one roof for every traveller."),
    ("Limbdi", "Limbdi", False, None,
     "A quick halt on the way to Saurashtra with multi-cuisine options."),
    ("Tansa", "Tansa", False, None,
     "Scenic highway plaza offering a complete break for travellers."),
    ("Kim", "Kim", False, None,
     "A convenient stop on the Mumbai–Ahmedabad highway."),
    ("Borsad", "Borsad", False, None,
     "Family-friendly plaza with dining, snacks and amenities."),
    ("Mahuva", "Mahuva", False, None,
     "Coastal-route plaza with Gujarati & fast food outlets."),
]

UPCOMING = [
    "Chavan", "Himmatnagar", "Dahod", "Idar", "Mota Chiloda",
    "Unava", "Bardoli", "Kodinar", "Dwarka", "Halol",
    "Timba", "Varnama", "Dholera 1", "Dholera 2",
]

FEDRA_OUTLETS = [
    ("Lapinoz", "7600231450"),
    ("7 Counter", "7567301468"),
    ("Maggi & Pasta", "9662967054"),
    ("Potato Poha", "9722576660"),
    ("Sev Usal", "7990494246"),
    ("Khichdi", "9067535200"),
    ("Schmitten Chocolate", "9904452538"),
    ("Cutlery Store & Cassets", "8401078600"),
    ("Waffer Biscuit", "9913740103"),
    ("Chikki", "9082656565"),
    ("Pan Parlour", "9974980813"),
    ("Sankalp", "9316471719"),
    ("Kudrati Kahumbo", "9832599999"),
    ("Adil Qadri", "9428433486"),
    ("Sahaj Oil", "9998929209"),
    ("Waffle", "9898732805"),
    ("Budhia Juice", "9898732805"),
    ("Iscon Gathiya", "9913539246"),
    ("Dominoz", "8511645308"),
    ("Subway", "9984102992"),
    ("Karnavati", "8141183783"),
    ("Teapost", "8140806092"),
]


def run():
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]

    # Clear any previous plazas so this script is idempotent
    db.plazas.delete_many({})
    print("Cleared old plazas.")

    plaza_ids = {}

    # Operational
    for i, (name, city, hq, image, desc) in enumerate(OPERATIONAL):
        pid = str(uuid.uuid4())
        plaza_ids[name] = pid
        db.plazas.insert_one({
            "id": pid,
            "name": name,
            "city": city,
            "status": "operational",
            "is_head_office": hq,
            "description": desc,
            "address": f"Gallops Food Plaza, {city}, Gujarat",
            "image": image,
            "gallery": [],
            "google_maps_url": "",
            "contact_phone": "",
            "expected_opening": "",
            "order_index": i,
            "created_at": datetime.now(timezone.utc),
        })
    print(f"Inserted {len(OPERATIONAL)} operational plazas.")

    # Upcoming
    for i, name in enumerate(UPCOMING):
        db.plazas.insert_one({
            "id": str(uuid.uuid4()),
            "name": name,
            "city": name,
            "status": "upcoming",
            "is_head_office": False,
            "description": f"Gallops Food Plaza — {name}. Opening soon on your favourite highway.",
            "address": f"{name}, Gujarat",
            "image": None,
            "gallery": [],
            "google_maps_url": "",
            "contact_phone": "",
            "expected_opening": "2026 / 2027",
            "order_index": i,
            "created_at": datetime.now(timezone.utc),
        })
    print(f"Inserted {len(UPCOMING)} upcoming plazas.")

    # Link all existing outlets to Anand plaza (that's what's live today)
    anand_id = plaza_ids["Anand"]
    r = db.outlets.update_many({"plaza_id": {"$in": [None]}}, {"$set": {"plaza_id": anand_id}})
    r2 = db.outlets.update_many({"plaza_id": {"$exists": False}}, {"$set": {"plaza_id": anand_id}})
    print(f"Linked {r.modified_count + r2.modified_count} existing outlets to Anand plaza.")

    # Seed Fedra outlets
    fedra_id = plaza_ids["Fedra"]
    docs = []
    for name, mobile in FEDRA_OUTLETS:
        docs.append({
            "id": str(uuid.uuid4()),
            "plaza_id": fedra_id,
            "name": name,
            "mobile": f"+91{mobile}",
            "opening_time": "09:00",
            "closing_time": "23:00",
            "time_slots": [{"open": "09:00", "close": "23:00"}],
            "logo": None,
            "description": f"{name} — a Fedra outlet.",
            "address": "Gallops Food Plaza, Fedra, Gujarat",
            "is_reservation_enabled": False,
            "created_at": datetime.now(timezone.utc),
        })
    db.outlets.insert_many(docs)
    print(f"Inserted {len(FEDRA_OUTLETS)} Fedra outlets.")

    print("\n=== Summary ===")
    print(f"Plazas   : {db.plazas.count_documents({})}")
    print(f"Outlets  : {db.outlets.count_documents({})}")


if __name__ == "__main__":
    run()

"""One-off migration: replace seed outlets with the user's 15 real outlets from Excel.
Run: python3 /app/backend/migrate_outlets.py
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

# name, mobile, opening, closing, description, image_url, reservations
OUTLETS = [
    ("Gallops Restaurant", "9099449000", "11:00", "23:30",
     "Our signature multi-cuisine fine-dine restaurant. Reservations recommended.",
     "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80",
     True),
    ("Hocco", "9725003410", "10:00", "23:00",
     "Iconic ice-creams, shakes and desserts.",
     "https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=800&q=80",
     False),
    ("Jagdish Farshan", "8980808504", "08:00", "22:00",
     "Traditional Gujarati farsan, namkeens and snacks.",
     "https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=800&q=80",
     False),
    ("Poptos", "8200997758", "10:00", "22:30",
     "Gourmet popcorn and movie-style snacks.",
     "https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=800&q=80",
     False),
    ("Santusthi", "7895678133", "09:00", "22:30",
     "Home-style Gujarati and North Indian vegetarian food.",
     "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&q=80",
     False),
    ("Quick Bite", "9723372889", "09:00", "23:00",
     "Burgers, sandwiches, wraps and fast food favourites.",
     "https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&q=80",
     False),
    ("Iscon", "8980088899", "11:00", "22:30",
     "Pure veg Gujarati thali and traditional meals.",
     "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&q=80",
     False),
    ("South Leaf", "9824075777", "10:00", "22:30",
     "Authentic South Indian dosas, idlis and filter coffee.",
     "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=800&q=80",
     False),
    ("Tea-Post", "9925525624", "08:00", "23:00",
     "Indian chai, coffee and quick bites.",
     "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=800&q=80",
     False),
    ("Karnavati", "8449963355", "11:00", "22:30",
     "Signature Karnavati khichdi and Gujarati specialities.",
     "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800&q=80",
     False),
    ("Khichadi", "6355374639", "11:00", "22:30",
     "Wholesome khichdi bowls with a variety of toppings.",
     "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=800&q=80",
     False),
    ("Puffiza", "9904799899", "10:00", "22:30",
     "Freshly baked puffs, patties and savoury bakes.",
     "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&q=80",
     False),
    ("V B Pan", "6353175217", "10:00", "23:30",
     "Classic and flavoured paan, mukhwas and after-meal treats.",
     "https://images.unsplash.com/photo-1605197161470-5d2a9af0ac7e?w=800&q=80",
     False),
    ("Schmitten", "9909014029", "10:00", "23:00",
     "Premium Schmitten chocolates, truffles and gift hampers.",
     "https://images.unsplash.com/photo-1548907040-4baa42d10919?w=800&q=80",
     False),
    ("SATYANARAYAN", "7016058922", "08:00", "22:30",
     "Traditional Indian mithai, sweets and celebration boxes.",
     "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&q=80",
     False),
]


def run():
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]

    # Clear old outlets + related data (menu + non-global offers + reservations
    # that referenced removed outlets). Keep admin user + global offers.
    old_outlet_ids = [o["id"] for o in db.outlets.find({}, {"_id": 0, "id": 1})]
    db.outlets.delete_many({})
    db.menu_items.delete_many({})
    db.offers.delete_many({"outlet_id": {"$in": old_outlet_ids}})
    db.reservations.delete_many({"outlet_id": {"$in": old_outlet_ids}})
    print(f"Cleared {len(old_outlet_ids)} old outlets and related data.")

    docs = []
    for name, mobile, opening, closing, desc, logo, reservation in OUTLETS:
        docs.append({
            "id": str(uuid.uuid4()),
            "name": name,
            "mobile": f"+91{mobile}",
            "opening_time": opening,
            "closing_time": closing,
            "logo": logo,
            "description": desc,
            "address": "Gallops Food Plaza, Anand",
            "is_reservation_enabled": reservation,
            "created_at": datetime.now(timezone.utc),
        })
    db.outlets.insert_many(docs)
    print(f"Inserted {len(docs)} outlets from your Excel.")


if __name__ == "__main__":
    run()

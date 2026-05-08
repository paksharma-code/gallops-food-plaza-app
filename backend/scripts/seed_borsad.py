"""Seed Borsad plaza outlets from the official Excel sheet.

Idempotent: existing outlets at Borsad are upserted (updated when name matches).
Gallops Restaurant gets its time-slots + description refreshed; the flagship
menu was already seeded in migrate_gallops_restaurant.py.
"""
import os
import uuid
from datetime import datetime
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv('/app/backend/.env')
client = MongoClient(os.getenv('MONGO_URL'))
db = client[os.getenv('DB_NAME')]

# Cuisine image library (Unsplash/Pexels) - reused from previous migrations
CUISINE_IMG = {
    "restaurant":  "https://images.pexels.com/photos/29148133/pexels-photo-29148133.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    "south":       "https://images.pexels.com/photos/32229637/pexels-photo-32229637.png?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    "pizza":       "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&auto=format&fit=crop&q=60",
    "paratha":     "https://images.unsplash.com/photo-1626500155770-694f08a34e62?w=600&auto=format&fit=crop&q=60",
    "farsan":      "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=60",
    "tea":         "https://images.pexels.com/photos/31141291/pexels-photo-31141291.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    "north":       "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600&auto=format&fit=crop&q=60",
    "vada_pav":    "https://images.unsplash.com/photo-1643892465171-fda7e80a7a2e?w=600&auto=format&fit=crop&q=60",
    "handvo":      "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600&auto=format&fit=crop&q=60",
    "frankie":     "https://images.unsplash.com/photo-1625944228741-e74a44f7c46e?w=600&auto=format&fit=crop&q=60",
    "chaat":       "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600&auto=format&fit=crop&q=60",
    "chocolate":   "https://images.unsplash.com/photo-1610450949065-1f2841536c88?w=600&auto=format&fit=crop&q=60",
    "khichdi":     "https://images.unsplash.com/photo-1625398407796-82650a8c135f?w=600&auto=format&fit=crop&q=60",
    "juice":       "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600&auto=format&fit=crop&q=60",
    "perfume":     "https://images.unsplash.com/photo-1693302050215-66ae33076745?w=600&auto=format&fit=crop&q=60",
    "pan":         "https://images.unsplash.com/photo-1625033405953-f20401c7d848?w=600&auto=format&fit=crop&q=60",
    "car":         "https://images.unsplash.com/photo-1619551734325-81aaf323686c?w=600&auto=format&fit=crop&q=60",
    "waffle":      "https://images.pexels.com/photos/29850570/pexels-photo-29850570.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
}

# (name, description, time_slots[{open,close}], logo, is_reservation)
OUTLETS = [
    # Gallops Restaurant – update flagship times per Excel
    ("Gallops Restaurant",
     "Premium multi-cuisine restaurant & banquet at Gallops Food Plaza — the flagship of our highway experience.",
     [{"open": "11:00", "close": "15:45"}, {"open": "19:00", "close": "23:45"}],
     None,  # keep existing logo (backend static)
     True),
    ("Sankalp",
     "South Indian favourites — dosa, idli, uttapam, sambhar-vada.",
     [{"open": "07:00", "close": "23:00"}],
     CUISINE_IMG["south"], False),
    ("Lapinoz Pizza",
     "La Pino'z style pizzas with Italian & Mexican bites.",
     [{"open": "11:00", "close": "23:00"}],
     CUISINE_IMG["pizza"], False),
    ("Mucchad",
     "Punjabi dhaba classics — kulcha, paratha, lassi.",
     [{"open": "07:00", "close": "16:00"}, {"open": "19:00", "close": "23:00"}],
     CUISINE_IMG["paratha"], False),
    ("Jagdish Farsan",
     "Traditional Gujarati farsan & sweets.",
     [{"open": "06:30", "close": "23:30"}],
     CUISINE_IMG["farsan"], False),
    ("Tea Post",
     "Signature chai, Gujarati snacks & farsan.",
     [{"open": "06:00", "close": "23:59"}],
     CUISINE_IMG["tea"], False),
    ("Hocco",
     "North-Indian combos, ice creams & desserts.",
     [{"open": "10:00", "close": "23:59"}],
     CUISINE_IMG["north"], False),
    ("MMV Vada Pav",
     "Mumbai-style vada pav & quick snacks.",
     [{"open": "07:00", "close": "23:59"}],
     CUISINE_IMG["vada_pav"], False),
    ("Sasuma No Handvo",
     "Gujarati handvo, dhokla & papdi specialities.",
     [{"open": "06:30", "close": "23:59"}],
     CUISINE_IMG["handvo"], False),
    ("B&Q",
     "Frankie rolls, chaap & tandoori pizza.",
     [{"open": "11:00", "close": "23:00"}],
     CUISINE_IMG["frankie"], False),
    ("Flame & Spice",
     "Chinese bites, chaat & baked puffs.",
     [{"open": "07:30", "close": "23:00"}],
     CUISINE_IMG["chaat"], False),
    ("Schmitten Chocolates",
     "Premium chocolate bars, truffles & treats.",
     [{"open": "07:30", "close": "23:00"}],
     CUISINE_IMG["chocolate"], False),
    ("Khichdi",
     "Khichdi, biryani & pulao — quick & wholesome meals.",
     [{"open": "11:00", "close": "23:00"}],
     CUISINE_IMG["khichdi"], False),
    ("Bhudia Juice & Saladholic",
     "Fresh juices, fruit bowls & salad meals.",
     [{"open": "10:00", "close": "00:30"}],
     CUISINE_IMG["juice"], False),
    ("Adil Qadri",
     "Premium attar, oud & alcohol-free perfumes.",
     [{"open": "10:30", "close": "22:30"}],
     CUISINE_IMG["perfume"], False),
    ("Waymart",
     "Travel convenience store — paan parlour & toys.",
     [{"open": "07:00", "close": "23:59"}],
     CUISINE_IMG["pan"], False),
    ("Roger",
     "Car accessories & travel essentials.",
     [{"open": "09:00", "close": "19:30"}],
     CUISINE_IMG["car"], False),
    ("Great Indian Waffle",
     "Signature Belgian waffles, shakes, coffee & brownies.",
     [{"open": "10:00", "close": "23:59"}],
     CUISINE_IMG["waffle"], False),
]


def run():
    borsad = db.plazas.find_one({"name": "Borsad"})
    assert borsad, "Borsad plaza not found!"
    pid = borsad["id"]
    print(f"Borsad plaza id: {pid}")

    inserted = 0
    updated = 0

    for name, desc, slots, logo, res in OUTLETS:
        existing = db.outlets.find_one({"plaza_id": pid, "name": name})
        now = datetime.utcnow().isoformat()
        doc = {
            "plaza_id": pid,
            "name": name,
            "description": desc,
            "mobile": "+919157917777",  # central support number
            "opening_time": slots[0]["open"],
            "closing_time": slots[-1]["close"],
            "time_slots": slots,
            "is_reservation_enabled": res,
            "updated_at": now,
        }
        if logo:
            doc["logo"] = logo
        if existing:
            db.outlets.update_one({"id": existing["id"]}, {"$set": doc})
            updated += 1
            tag = "update"
        else:
            doc["id"] = str(uuid.uuid4())
            doc["created_at"] = now
            if not logo:
                doc["logo"] = ""
            db.outlets.insert_one(doc)
            inserted += 1
            tag = "NEW"
        print(f"  [{tag:6s}] {name} ({slots[0]['open']}–{slots[-1]['close']})")

    print(f"\n✔ Borsad outlets processed: {inserted} new, {updated} updated")
    total = db.outlets.count_documents({"plaza_id": pid})
    print(f"  Borsad now has {total} outlets")


if __name__ == "__main__":
    run()

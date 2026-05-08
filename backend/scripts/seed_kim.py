"""Seed Kim plaza outlets from the official Excel sheet.

Idempotent: existing outlets at Kim are upserted (matched by name).
"""
import os
import uuid
from datetime import datetime

from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv('/app/backend/.env')
client = MongoClient(os.getenv('MONGO_URL'))
db = client[os.getenv('DB_NAME')]


IMG = {
    "restaurant":  "https://images.pexels.com/photos/29148133/pexels-photo-29148133.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    "tea":         "https://images.pexels.com/photos/31141291/pexels-photo-31141291.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    "ice_cream":   "https://images.unsplash.com/photo-1567206563064-6f60f40a2b57?w=600&auto=format&fit=crop&q=60",
    "south":       "https://images.pexels.com/photos/32229637/pexels-photo-32229637.png?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    "chocolate":   "https://images.unsplash.com/photo-1610450949065-1f2841536c88?w=600&auto=format&fit=crop&q=60",
    "pizza":       "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&auto=format&fit=crop&q=60",
    "vada_pav":    "https://images.unsplash.com/photo-1643892465171-fda7e80a7a2e?w=600&auto=format&fit=crop&q=60",
    "refreshment": "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600&auto=format&fit=crop&q=60",
    "waffle":      "https://images.unsplash.com/photo-1598444028737-d66c0f3e98c3?w=600&auto=format&fit=crop&q=60",
    "chikki":      "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=600&auto=format&fit=crop&q=60",
    "perfume":     "https://images.unsplash.com/photo-1693302050215-66ae33076745?w=600&auto=format&fit=crop&q=60",
    "pan":         "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&auto=format&fit=crop&q=60",
}


# (name, description, time_slots, logo, is_reservation_enabled)
OUTLETS = [
    ("Gallops Restaurant",
     "Premium multi-cuisine restaurant — Tandoor, Chinese, Kathiyawari, Punjabi.",
     [{"open": "11:00", "close": "15:45"}, {"open": "19:00", "close": "23:45"}],
     None, True),

    ("Tea Post",
     "Specialty teas, Gujarati snacks & farsan.",
     [{"open": "06:00", "close": "23:45"}], IMG["tea"], False),

    ("HOCCO",
     "North Indian combos, meals & premium ice creams.",
     [{"open": "09:00", "close": "23:59"}], IMG["ice_cream"], False),

    ("Sankalp",
     "South Indian favourites — dosa, idli, uttapam & sambhar-vada.",
     [{"open": "07:00", "close": "23:00"}], IMG["south"], False),

    ("Tigmon",
     "Artisanal chocolates, confectionery & assorted gift hampers.",
     [{"open": "08:00", "close": "23:59"}], IMG["chocolate"], False),

    ("La Pino'z Pizza",
     "Signature Italian pizzas, garlic breads & Mexican favourites.",
     [{"open": "11:00", "close": "23:40"}], IMG["pizza"], False),

    ("MMV Vada Pav",
     "Mumbai-style vada pav, misal pav & snacks.",
     [{"open": "08:00", "close": "23:40"}], IMG["vada_pav"], False),

    ("Kudrati Kahumbo",
     "Mocktails, chillers & refreshing drinks.",
     [{"open": "08:00", "close": "23:59"}], IMG["refreshment"], False),

    ("Great Indian Waffle",
     "Freshly-made waffles in a variety of flavours.",
     [{"open": "10:00", "close": "23:00"}], IMG["waffle"], False),

    ("Lonavla Chikki",
     "Iconic Lonavala chikkis, fudges & gift boxes.",
     [{"open": "06:00", "close": "23:59"}], IMG["chikki"], False),

    ("Alize Perfume",
     "Premium perfumes & curated gift sets.",
     [{"open": "09:00", "close": "23:59"}], IMG["perfume"], False),

    ("Brothers Pan & Toys",
     "Pan, cold drinks, kids toys & travel essentials.",
     [{"open": "07:00", "close": "01:00"}], IMG["pan"], False),
]


def run():
    kim = db.plazas.find_one({"name": "Kim"}) or db.plazas.find_one({"city": "Kim"})
    assert kim, "Kim plaza not found!"
    pid = kim["id"]
    print(f"Kim plaza id: {pid}")

    inserted = 0
    updated = 0

    for name, desc, slots, logo, res in OUTLETS:
        existing = db.outlets.find_one({"plaza_id": pid, "name": name})
        now = datetime.utcnow().isoformat()
        doc = {
            "plaza_id": pid,
            "name": name,
            "description": desc,
            "mobile": "+917285851005",  # fallback to Kim plaza contact; admin can edit per outlet later
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
        slots_str = " + ".join(f"{s['open']}-{s['close']}" for s in slots)
        print(f"  [{tag:6s}] {name:<26} {slots_str}")

    print(f"\n✔ Kim outlets processed: {inserted} new, {updated} updated")
    total = db.outlets.count_documents({"plaza_id": pid})
    print(f"  Kim now has {total} outlets")


if __name__ == "__main__":
    run()

"""Seed Tansa plaza outlets from the official Excel sheet.

Idempotent: existing outlets at Tansa are upserted (matched by name).
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
    "fastfood":    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=60",
    "cafe":        "https://images.unsplash.com/photo-1511920170033-f8396924c348?w=600&auto=format&fit=crop&q=60",
    "pan":         "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&auto=format&fit=crop&q=60",
}


# (name, description, time_slots, logo, is_reservation_enabled)
OUTLETS = [
    ("Gallops Restaurant",
     "Premium multi-cuisine restaurant — Indian, Chinese & Kathiyawadi.",
     [{"open": "11:00", "close": "15:45"}, {"open": "19:00", "close": "23:45"}],
     None, True),

    ("Mumbai Misal Vadapav",
     "Mumbai street food — misal pav, vada pav, sev usal, sandwiches, sev puri, bhaji pav.",
     [{"open": "11:00", "close": "23:00"}], IMG["vada_pav"], False),

    ("Sankalp",
     "South Indian favourites — dosa, idli, uttapam.",
     [{"open": "07:00", "close": "23:59"}], IMG["south"], False),

    ("La Pino'z Pizza",
     "Signature Italian pizzas, garlic breads, pasta, milkshakes & mocktails.",
     [{"open": "12:00", "close": "23:59"}], IMG["pizza"], False),

    ("Tea Post",
     "Desi nashta, shakes, teas, coffee & cold coffee.",
     [{"open": "06:00", "close": "23:59"}], IMG["tea"], False),

    ("HOCCO Creamery",
     "Premium ice creams in a variety of flavours.",
     [{"open": "11:00", "close": "23:00"}], IMG["ice_cream"], False),

    ("Grill N Chill",
     "Fast food — grills, burgers & quick bites.",
     [{"open": "11:00", "close": "23:30"}], IMG["fastfood"], False),

    ("Rajhans Nutriments",
     "Luxury chocolates & confectionery gifts.",
     [{"open": "07:30", "close": "23:00"}], IMG["chocolate"], False),

    ("Coffee Culture",
     "Chinese, Continental, shakes, ice tea & premium coffee.",
     [{"open": "10:00", "close": "23:59"}], IMG["cafe"], False),

    ("Rudra Pan",
     "Wafers, biscuits & cold drinks.",
     [{"open": "09:00", "close": "23:59"}], IMG["pan"], False),
]


def run():
    tansa = db.plazas.find_one({"name": "Tansa"}) or db.plazas.find_one({"city": "Tansa"})
    assert tansa, "Tansa plaza not found!"
    pid = tansa["id"]
    print(f"Tansa plaza id: {pid}")

    # Ensure plaza whatsapp_number is populated (from contact_phone) so routing works
    if not (tansa.get("whatsapp_number") or "").strip():
        cp = (tansa.get("contact_phone") or "").strip()
        if cp:
            db.plazas.update_one({"id": pid}, {"$set": {"whatsapp_number": cp}})
            print(f"  whatsapp_number <- {cp}  (copied from contact_phone)")

    inserted = 0
    updated = 0

    for name, desc, slots, logo, res in OUTLETS:
        existing = db.outlets.find_one({"plaza_id": pid, "name": name})
        now = datetime.utcnow().isoformat()
        doc = {
            "plaza_id": pid,
            "name": name,
            "description": desc,
            "mobile": "+917285851003",  # fallback to Tansa plaza contact
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

    print(f"\n✔ Tansa outlets processed: {inserted} new, {updated} updated")
    total = db.outlets.count_documents({"plaza_id": pid})
    print(f"  Tansa now has {total} outlets")


if __name__ == "__main__":
    run()

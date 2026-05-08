"""Seed Limbdi plaza outlets from the official Excel sheet.

Idempotent: existing outlets at Limbdi are upserted (matched by name).
For outlets still marked "COMMING SOON" in the Excel, placeholder opening
hours 10:00–22:00 are used; timings should be updated by the plaza team
once each outlet actually opens.
"""
import os
import uuid
from datetime import datetime

from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv('/app/backend/.env')
client = MongoClient(os.getenv('MONGO_URL'))
db = client[os.getenv('DB_NAME')]


# ---- Cuisine / category image library (reused across plazas) ----
IMG = {
    "restaurant":  "https://images.pexels.com/photos/29148133/pexels-photo-29148133.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    "cafe":        "https://images.unsplash.com/photo-1511920170033-f8396924c348?w=600&auto=format&fit=crop&q=60",
    "pizza":       "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&auto=format&fit=crop&q=60",
    "south":       "https://images.pexels.com/photos/32229637/pexels-photo-32229637.png?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    "vada_pav":    "https://images.unsplash.com/photo-1643892465171-fda7e80a7a2e?w=600&auto=format&fit=crop&q=60",
    "khichdi":     "https://images.unsplash.com/photo-1625398407796-82650a8c135f?w=600&auto=format&fit=crop&q=60",
    "subway":      "https://images.unsplash.com/photo-1509722747041-616f39b57569?w=600&auto=format&fit=crop&q=60",
    "burger":      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=60",
    "ice_cream":   "https://images.unsplash.com/photo-1567206563064-6f60f40a2b57?w=600&auto=format&fit=crop&q=60",
    "tea":         "https://images.pexels.com/photos/31141291/pexels-photo-31141291.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    "farsan":      "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=60",
    "perfume":     "https://images.unsplash.com/photo-1693302050215-66ae33076745?w=600&auto=format&fit=crop&q=60",
    "chocolate":   "https://images.unsplash.com/photo-1610450949065-1f2841536c88?w=600&auto=format&fit=crop&q=60",
    "chikki":      "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=600&auto=format&fit=crop&q=60",
    "refreshment": "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600&auto=format&fit=crop&q=60",
    "service":     "https://images.unsplash.com/photo-1619551734325-81aaf323686c?w=600&auto=format&fit=crop&q=60",
}


def _phone(raw: str) -> str:
    """Normalise Indian 10-digit number to '+91XXXXXXXXXX'."""
    if not raw:
        return ""
    digits = "".join(ch for ch in str(raw) if ch.isdigit())
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    return f"+91{digits}" if len(digits) == 10 else ""


# (name, description, time_slots, logo, is_reservation_enabled, mobile)
PLACEHOLDER = [{"open": "10:00", "close": "22:00"}]  # for "COMMING SOON"

OUTLETS = [
    ("Gallops Restaurant",
     "Premium multi-cuisine restaurant — tandoor, Chinese, Kathiyawari, Punjabi. Flagship of Gallops Food Plaza Limbdi.",
     [{"open": "11:00", "close": "23:00"}],
     None, True, _phone("9825206333")),

    ("A Gourmesserie Cafe",
     "Contemporary cafe — coffee, sandwiches, pastries & quick bites. Opening soon.",
     PLACEHOLDER, IMG["cafe"], False, _phone("9974591918")),

    ("Domino's",
     "World-famous pizzas, pastas, breads & sides. Opening soon.",
     PLACEHOLDER, IMG["pizza"], False, _phone("9537897878")),

    ("Sankalp",
     "South Indian favourites — dosa, idli, uttapam, sambhar-vada. Opening soon.",
     PLACEHOLDER, IMG["south"], False, _phone("8080802062")),

    ("La Pino'z Pizza",
     "Signature Italian pizzas, garlic breads & shakes. Opening soon.",
     PLACEHOLDER, IMG["pizza"], False, _phone("9724825595")),

    ("Jay Bhavani Vadapav",
     "Mumbai-style vada pav, misal pav & kachori. Opening soon.",
     PLACEHOLDER, IMG["vada_pav"], False, _phone("8306555783")),

    ("Khichadi",
     "Gujarati-style khichdi, kadhi, dal-dhokli & comfort thalis. Opening soon.",
     PLACEHOLDER, IMG["khichdi"], False, _phone("9537889008")),

    ("Subway",
     "Customisable subs, wraps, salads & cookies. Opening soon.",
     PLACEHOLDER, IMG["subway"], False, _phone("9023514822")),

    ("Burger Farm",
     "Gourmet burgers, loaded fries & shakes. Opening soon.",
     PLACEHOLDER, IMG["burger"], False, _phone("9099690995")),

    ("HOCCO Ice Cream & Eatery",
     "Premium ice cream flavours, sundaes & desserts. Opening soon.",
     PLACEHOLDER, IMG["ice_cream"], False, _phone("9104099998")),

    ("Tea Post",
     "Specialty teas, masala chai, filter coffee & snacks. Opening soon.",
     PLACEHOLDER, IMG["tea"], False, _phone("8980805465")),

    ("Jagdish Farsan",
     "Gujarati farsan, sweets & savoury snacks. Opening soon.",
     PLACEHOLDER, IMG["farsan"], False, _phone("9558887075")),

    ("Adil Qadri Perfume",
     "Premium attar, oud & alcohol-free perfumes. Opening soon.",
     PLACEHOLDER, IMG["perfume"], False, _phone("8849959893")),

    ("Schmiten Chocolate",
     "Artisanal chocolates, truffles & gifting hampers. Opening soon.",
     PLACEHOLDER, IMG["chocolate"], False, _phone("8780695593")),

    ("Chikki Lonavala",
     "Iconic Lonavala chikkis, fudges & gift boxes. Opening soon.",
     PLACEHOLDER, IMG["chikki"], False, _phone("9905454540")),

    ("A to Z Refreshment",
     "Juices, shakes, cold drinks & quick refreshers. Opening soon.",
     PLACEHOLDER, IMG["refreshment"], False, _phone("9099084237")),

    ("Roger Service",
     "Car accessories, travel essentials & service counter. Opening soon.",
     PLACEHOLDER, IMG["service"], False, ""),
]


def run():
    limbdi = db.plazas.find_one({"name": "Limbdi"}) or db.plazas.find_one({"city": "Limbdi"})
    assert limbdi, "Limbdi plaza not found!"
    pid = limbdi["id"]
    print(f"Limbdi plaza id: {pid}")

    inserted = 0
    updated = 0

    for name, desc, slots, logo, res, mobile in OUTLETS:
        existing = db.outlets.find_one({"plaza_id": pid, "name": name})
        now = datetime.utcnow().isoformat()
        doc = {
            "plaza_id": pid,
            "name": name,
            "description": desc,
            "mobile": mobile or "+919157917777",  # central support fallback
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
        print(f"  [{tag:6s}] {name:<30} {slots[0]['open']}–{slots[-1]['close']}  {mobile or '(no mobile)'}")

    print(f"\n✔ Limbdi outlets processed: {inserted} new, {updated} updated")
    total = db.outlets.count_documents({"plaza_id": pid})
    print(f"  Limbdi now has {total} outlets")


if __name__ == "__main__":
    run()

"""One-off DB migration for the user's latest UI/data polish requests.

- Replaces Anand plaza image with the newly uploaded photo
- Removes placeholder image usage for missing ones (no-op if already null)
- Fedra (Head Office) outlets:
    * Delete 3 outlets that were legacy: Maggi & Pasta, Potato Poha, Sev Usal
    * Rename "7 Counter" -> "Chat Pata Hub"
    * Add "Gallops Restaurant" as the first outlet (has_reservation=True)
    * Assign cuisine-appropriate images to every Fedra outlet
"""
import os
import sys
import uuid
from datetime import datetime
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv('/app/backend/.env')

client = MongoClient(os.getenv('MONGO_URL'))
db = client[os.getenv('DB_NAME')]

ANAND_IMAGE = (
    "https://customer-assets.emergentagent.com/job_gallops-reserve-dine/"
    "artifacts/l0w4k05q_WhatsApp%20Image%202026-04-21%20at%2016.36.15.jpeg"
)

FEDRA_OUTLET_IMAGES = {
    "Gallops Restaurant": "https://images.pexels.com/photos/29148133/pexels-photo-29148133.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    "Lapinoz": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&auto=format&fit=crop&q=60",
    "Chat Pata Hub": "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600&auto=format&fit=crop&q=60",
    "Khichdi": "https://images.unsplash.com/photo-1625398407796-82650a8c135f?w=600&auto=format&fit=crop&q=60",
    "Schmitten Chocolate": "https://images.unsplash.com/photo-1610450949065-1f2841536c88?w=600&auto=format&fit=crop&q=60",
    "Cutlery Store & Cassets": "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&auto=format&fit=crop&q=60",
    "Waffer Biscuit": "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=600&auto=format&fit=crop&q=60",
    "Chikki": "https://images.pexels.com/photos/4110092/pexels-photo-4110092.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    "Pan Parlour": "https://images.unsplash.com/photo-1625033405953-f20401c7d848?w=600&auto=format&fit=crop&q=60",
    "Sankalp": "https://images.pexels.com/photos/32229637/pexels-photo-32229637.png?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    "Kudrati Kahumbo": "https://images.unsplash.com/photo-1619581073186-5b4ae1b0caad?w=600&auto=format&fit=crop&q=60",
    "Adil Qadri": "https://images.unsplash.com/photo-1693302050215-66ae33076745?w=600&auto=format&fit=crop&q=60",
    "Sahaj Oil": "https://images.unsplash.com/photo-1683533698664-12ee473e8c9d?w=600&auto=format&fit=crop&q=60",
    "Waffle": "https://images.pexels.com/photos/29850570/pexels-photo-29850570.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    "Budhia Juice": "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600&auto=format&fit=crop&q=60",
    "Iscon Gathiya": "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=60",
    "Dominoz": "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=600&auto=format&fit=crop&q=60",
    "Subway": "https://images.unsplash.com/photo-1553909489-cd47e0907980?w=600&auto=format&fit=crop&q=60",
    "Karnavati": "https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=600&auto=format&fit=crop&q=60",
    "Teapost": "https://images.pexels.com/photos/31141291/pexels-photo-31141291.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
}


def ensure_str(v):
    return v if isinstance(v, str) else ""


def run():
    # ---- 1) Update Anand plaza image -----------------------------------------
    anand = db.plazas.find_one({"name": "Anand"})
    if anand:
        db.plazas.update_one({"id": anand["id"]}, {"$set": {"image": ANAND_IMAGE}})
        print(f"[OK] Updated Anand image -> {ANAND_IMAGE[:60]}...")
    else:
        print("[WARN] Anand plaza not found")

    # ---- 2) Fedra plaza outlet CRUD ------------------------------------------
    fedra = db.plazas.find_one({"name": "Fedra"})
    if not fedra:
        print("[ERR] Fedra plaza not found — aborting outlet changes.")
        return
    fedra_id = fedra["id"]
    print(f"[INFO] Fedra plaza id = {fedra_id}")

    # Delete 3 outlets
    for name in ["Maggi & Pasta", "Potato Poha", "Sev Usal"]:
        res = db.outlets.delete_many({"plaza_id": fedra_id, "name": name})
        print(f"[OK] Deleted outlet '{name}' x{res.deleted_count}")

    # Rename 7 Counter -> Chat Pata Hub
    res = db.outlets.update_one(
        {"plaza_id": fedra_id, "name": "7 Counter"},
        {"$set": {"name": "Chat Pata Hub"}},
    )
    print(f"[OK] Renamed '7 Counter' -> 'Chat Pata Hub' (matched={res.matched_count})")

    # Add Gallops Restaurant if not present
    existing = db.outlets.find_one({"plaza_id": fedra_id, "name": "Gallops Restaurant"})
    if not existing:
        now = datetime.utcnow().isoformat()
        gallops_outlet = {
            "id": str(uuid.uuid4()),
            "plaza_id": fedra_id,
            "name": "Gallops Restaurant",
            "description": "Premium multi-cuisine restaurant & banquet at Gallops Food Plaza — the flagship of our highway experience.",
            "mobile": "+919157917777",
            "logo": FEDRA_OUTLET_IMAGES["Gallops Restaurant"],
            "category": "Restaurant",
            "opening_time": "11:00",
            "closing_time": "23:00",
            "time_slots": [
                {"open": "11:00", "close": "15:30", "label": "Lunch"},
                {"open": "18:30", "close": "23:00", "label": "Dinner"},
            ],
            "has_reservation": True,
            "is_reservation_enabled": True,
            "created_at": now,
            "updated_at": now,
        }
        db.outlets.insert_one(gallops_outlet)
        print("[OK] Added new outlet 'Gallops Restaurant' at Fedra")
    else:
        # Ensure reservation + image
        db.outlets.update_one(
            {"id": existing["id"]},
            {"$set": {
                "has_reservation": True,
                "logo": FEDRA_OUTLET_IMAGES["Gallops Restaurant"],
            }},
        )
        print("[OK] 'Gallops Restaurant' already existed; refreshed meta")

    # ---- 3) Assign images to each Fedra outlet -------------------------------
    updated, skipped = 0, 0
    for outlet in db.outlets.find({"plaza_id": fedra_id}):
        image = FEDRA_OUTLET_IMAGES.get(outlet["name"])
        if not image:
            skipped += 1
            continue
        db.outlets.update_one({"id": outlet["id"]}, {"$set": {"logo": image}})
        updated += 1
    print(f"[OK] Fedra outlet images set: updated={updated}, skipped(no-mapping)={skipped}")

    # ---- 4) Summary ----------------------------------------------------------
    final = list(db.outlets.find({"plaza_id": fedra_id}, {"name": 1, "logo": 1, "_id": 0}))
    print(f"\n[FINAL] Fedra now has {len(final)} outlets:")
    for o in final:
        has_img = "✓" if ensure_str(o.get("logo")) else "✗"
        print(f"   [{has_img}] {o['name']}")


if __name__ == "__main__":
    run()
    print("\n✔ Migration complete")

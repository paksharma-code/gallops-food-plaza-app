"""
One-shot migration for Gallops Food Plaza — Borsad.

Idempotent — safe to re-run.

Final order (after migration):
    1.  Gallops Restaurant       (brand priority idx 0)
    2.  La Pino'z Pizza          (brand priority idx 3)
    3.  HOCCO                    (order_index 3)
    4.  Jagdish Farsan           (order_index 4)
    5.  Sankalp                  (order_index 5)
    6.  Tea Post                 (order_index 6)
    7.  Flame & Spice            (order_index 7)
    8.  Khichdi                  (order_index 8)
    9.  MMV Vadapav              (order_index 9)
    10. Mucchad                  (order_index 10)
    11. Sasuma No Handvo         (order_index 11)
    12. Great Indian Waffle      (order_index 12)
    13. B & Q                    (order_index 13)
    14. Budhia Juice & Saladhalic (order_index 14)
    15. Schmitten                (order_index 15)
    16. Adil Qadri               (order_index 16)
    17+ Any future-added outlets (order_index 0 → alphabetical at the bottom).
"""
import asyncio
import os
import uuid as _uuid
from datetime import datetime, timezone

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ.get("DB_NAME", "test_database")
BORSAD_PLAZA_ID = "1dd37a31-dadf-4845-a5cc-c3a66339c9f0"

RENAMES: list[tuple[str, str]] = [
    ("Lapinoz Pizza", "La Pino'z Pizza"),
    ("Hocco", "HOCCO"),
    ("MMV Vada Pav", "MMV Vadapav"),
    ("B&Q", "B & Q"),
    ("Bhudia Juice & Saladholic", "Budhia Juice & Saladhalic"),
    ("Schmitten Chocolates", "Schmitten"),
]

DELETIONS: list[str] = []

BORSAD_ORDER: list[tuple[str, int]] = [
    ("Gallops Restaurant", 1),
    ("La Pino'z Pizza", 2),
    ("HOCCO", 3),
    ("Jagdish Farsan", 4),
    ("Sankalp", 5),
    ("Tea Post", 6),
    ("Flame & Spice", 7),
    ("Khichdi", 8),
    ("MMV Vadapav", 9),
    ("Mucchad", 10),
    ("Sasuma No Handvo", 11),
    ("Great Indian Waffle", 12),
    ("B & Q", 13),
    ("Budhia Juice & Saladhalic", 14),
    ("Schmitten", 15),
    ("Adil Qadri", 16),
]

NEW_OUTLETS: dict[str, dict] = {}


async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    outlets = db.outlets

    plaza = await db.plazas.find_one({"id": BORSAD_PLAZA_ID})
    assert plaza, f"Borsad plaza {BORSAD_PLAZA_ID} not found"
    print(f"Migrating Borsad plaza: {plaza['name']}")

    for old, new in RENAMES:
        res = await outlets.update_one(
            {"plaza_id": BORSAD_PLAZA_ID,
             "name": {"$regex": f"^{old}$", "$options": "i"}},
            {"$set": {"name": new}},
        )
        if res.modified_count:
            print(f"  ✏️  renamed '{old}' → '{new}'")
        else:
            print(f"  ✓  '{new}' already canonical (or not present)")

    for name in DELETIONS:
        res = await outlets.delete_one(
            {"plaza_id": BORSAD_PLAZA_ID,
             "name": {"$regex": f"^{name}$", "$options": "i"}}
        )
        if res.deleted_count:
            print(f"  🗑️  deleted '{name}'")

    for name, _idx in BORSAD_ORDER:
        existing = await outlets.find_one({"plaza_id": BORSAD_PLAZA_ID, "name": name})
        if existing:
            continue
        defaults = NEW_OUTLETS.get(name)
        if not defaults:
            print(f"  ⚠️  '{name}' missing but no placeholder defaults — skipping")
            continue
        new_doc = {
            "id": str(_uuid.uuid4()),
            "plaza_id": BORSAD_PLAZA_ID,
            "name": name,
            "logo": "",
            "image2": None,
            "image3": None,
            "order_index": 0,
            "created_at": datetime.now(timezone.utc),
            **defaults,
        }
        await outlets.insert_one(new_doc)
        print(f"  ✨ created '{name}' with placeholder details")

    requested = {name: idx for name, idx in BORSAD_ORDER}
    cur = outlets.find({"plaza_id": BORSAD_PLAZA_ID})
    async for o in cur:
        new_oi = requested.get(o["name"], 0)
        if o.get("order_index", 0) != new_oi:
            await outlets.update_one(
                {"id": o["id"]}, {"$set": {"order_index": new_oi}}
            )
            print(f"  📍 order_index({o['name']}) = {new_oi}")

    print("\n--- Final Borsad outlets ---")
    cur = outlets.find(
        {"plaza_id": BORSAD_PLAZA_ID},
        {"_id": 0, "name": 1, "order_index": 1},
    ).sort([("order_index", 1), ("name", 1)])
    async for o in cur:
        print(f"  oi={o.get('order_index', 0):>2}  {o['name']}")

    client.close()
    print("\n✅ Borsad migration complete.")


if __name__ == "__main__":
    asyncio.run(main())

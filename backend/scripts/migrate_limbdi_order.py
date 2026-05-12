"""
One-shot migration for Gallops Food Plaza — Limbdi.

Same idempotent pattern as `migrate_fedra_order.py`:
  1. Rename misspelled / inconsistently-named outlets.
  2. Create any outlet missing from the requested list (Subway, Roger).
  3. Assign explicit `order_index` so Limbdi renders in the exact order the
     customer specified.

After this migration runs, Limbdi outlets will appear in this order across
the entire app (Home / Plaza page / Outlet list / Search / Admin preview):
    1.  Gallops Restaurant       (brand priority idx 0)
    2.  Domino's                  (brand priority idx 1)
    3.  Subway                    (brand priority idx 2)
    4.  La Pino'z Pizza           (brand priority idx 3)
    5.  HOCCO Eatery              (order_index 5)
    6.  Burger Farm               (order_index 6)
    7.  Tea Post                  (order_index 7)
    8.  A Gourmesserie Cafe       (order_index 8)
    9.  Sankalp                   (order_index 9)
    10. Jagdish Farsan            (order_index 10)
    11. Khichdi                   (order_index 11)
    12. Jay Bhavani               (order_index 12)
    13. Schmitten                 (order_index 13)
    14. Adil Qadri                (order_index 14)
    15. Roger                     (order_index 15)
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
LIMBDI_PLAZA_ID = "51114145-d24b-47de-b74d-ac7505764577"

# (current_name, canonical_name) — case-insensitive match on current_name.
RENAMES: list[tuple[str, str]] = [
    ("HOCCO Ice Cream & Eatery", "HOCCO Eatery"),
    ("Khichadi", "Khichdi"),
    ("Jay Bhavani Vadapav", "Jay Bhavani"),
    ("Schmiten Chocolate", "Schmitten"),
    ("Adil Qadri Perfume", "Adil Qadri"),
]

# Outlets to delete (none for Limbdi right now).
DELETIONS: list[str] = []

LIMBDI_ORDER: list[tuple[str, int]] = [
    ("Gallops Restaurant", 1),
    ("Domino's", 2),
    ("Subway", 3),
    ("La Pino'z Pizza", 4),
    ("HOCCO Eatery", 5),
    ("Burger Farm", 6),
    ("Tea Post", 7),
    ("A Gourmesserie Cafe", 8),
    ("Sankalp", 9),
    ("Jagdish Farsan", 10),
    ("Khichdi", 11),
    ("Jay Bhavani", 12),
    ("Schmitten", 13),
    ("Adil Qadri", 14),
    ("Roger", 15),
]

# Defaults for outlets we have to create from scratch.
NEW_OUTLETS = {
    "Subway": dict(
        mobile="+919824006262",
        opening_time="09:00",
        closing_time="22:00",
        time_slots=None,
        is_reservation_enabled=False,
        is_offers_enabled=True,
        description="",
        address="Gallops Food Plaza, Limbdi",
    ),
    "Roger": dict(
        mobile="+919824006262",
        opening_time="09:00",
        closing_time="22:00",
        time_slots=None,
        is_reservation_enabled=False,
        is_offers_enabled=True,
        description="",
        address="Gallops Food Plaza, Limbdi",
    ),
}


async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    outlets = db.outlets

    plaza = await db.plazas.find_one({"id": LIMBDI_PLAZA_ID})
    assert plaza, f"Limbdi plaza {LIMBDI_PLAZA_ID} not found"
    print(f"Migrating Limbdi plaza: {plaza['name']}")

    # 1. Rename.
    for old, new in RENAMES:
        res = await outlets.update_one(
            {
                "plaza_id": LIMBDI_PLAZA_ID,
                "name": {"$regex": f"^{old}$", "$options": "i"},
            },
            {"$set": {"name": new}},
        )
        if res.modified_count:
            print(f"  ✏️  renamed '{old}' → '{new}'")
        else:
            print(f"  ✓  '{new}' already canonical (or not present)")

    # 1b. Delete.
    for name in DELETIONS:
        res = await outlets.delete_one(
            {
                "plaza_id": LIMBDI_PLAZA_ID,
                "name": {"$regex": f"^{name}$", "$options": "i"},
            }
        )
        if res.deleted_count:
            print(f"  🗑️  deleted '{name}'")

    # 2. Create missing outlets.
    for name, _idx in LIMBDI_ORDER:
        existing = await outlets.find_one(
            {"plaza_id": LIMBDI_PLAZA_ID, "name": name}
        )
        if existing:
            continue
        defaults = NEW_OUTLETS.get(name)
        if not defaults:
            print(f"  ⚠️  '{name}' missing but no placeholder defaults — skipping")
            continue
        new_doc = {
            "id": str(_uuid.uuid4()),
            "plaza_id": LIMBDI_PLAZA_ID,
            "name": name,
            "logo": "",
            "image2": None,
            "image3": None,
            "order_index": 0,  # set below
            "created_at": datetime.now(timezone.utc),
            **defaults,
        }
        await outlets.insert_one(new_doc)
        print(f"  ✨ created '{name}' with placeholder details")

    # 3. Assign order_index.
    requested = {name: idx for name, idx in LIMBDI_ORDER}
    cur = outlets.find({"plaza_id": LIMBDI_PLAZA_ID})
    async for o in cur:
        new_oi = requested.get(o["name"], 0)
        if o.get("order_index", 0) != new_oi:
            await outlets.update_one(
                {"id": o["id"]}, {"$set": {"order_index": new_oi}}
            )
            print(f"  📍 order_index({o['name']}) = {new_oi}")

    # 4. Read back.
    print("\n--- Final Limbdi outlets ---")
    cur = outlets.find(
        {"plaza_id": LIMBDI_PLAZA_ID},
        {"_id": 0, "name": 1, "order_index": 1},
    ).sort("order_index", 1)
    async for o in cur:
        print(f"  oi={o.get('order_index', 0):>2}  {o['name']}")

    client.close()
    print("\n✅ Limbdi migration complete.")


if __name__ == "__main__":
    asyncio.run(main())

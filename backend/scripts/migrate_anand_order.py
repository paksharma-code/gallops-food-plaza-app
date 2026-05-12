"""
One-shot migration for Gallops Food Plaza — Anand.

Same idempotent pattern as `migrate_fedra_order.py` / `migrate_limbdi_order.py`:
  1. Rename misspelled / inconsistently-named outlets.
  2. Create any outlet missing from the requested list (none for Anand).
  3. Assign explicit `order_index` so Anand renders in the exact order the
     customer specified.

After this migration runs, Anand outlets will appear in this order across
the entire app (Home / Plaza page / Outlet list / Search / Admin preview):
    1.  Gallops Restaurant       (brand priority idx 0)
    2.  HOCCO Eateria            (order_index 2)
    3.  Schmitten                (order_index 3)
    4.  Tea Post                 (order_index 4)
    5.  Jagdish Farsan           (order_index 5)
    6.  South Leaf               (order_index 6)
    7.  Iscon                    (order_index 7)
    8.  Crunch Corner            (order_index 8)
    9.  Flame & Spice            (order_index 9)
    10. Karnavati                (order_index 10)
    11. Paratha & Frankies       (order_index 11)
    12. Poptos                   (order_index 12)
    13. Puffiza                  (order_index 13)
    14. Quick Bites              (order_index 14)
    15. Rajwadi Matka Khichdi    (order_index 15)
    16. Santusti                 (order_index 16)
    17. Satyanarayana Kathiyawadi (order_index 17)
    18. Welcome 36               (order_index 18)
    19+ Any extras (e.g. "Khichdi") sort alphabetically at the bottom.
"""
import asyncio
import os
from datetime import datetime, timezone

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ.get("DB_NAME", "test_database")
ANAND_PLAZA_ID = "930180f4-2f50-4c2d-ae8d-449af08be7bc"

# (current_name, canonical_name) — case-insensitive match on current_name.
RENAMES: list[tuple[str, str]] = [
    ("Hocco", "HOCCO Eateria"),
    ("Tea-Post", "Tea Post"),
    ("Jagdish Farshan", "Jagdish Farsan"),
    ("Quick Bite", "Quick Bites"),
    ("Santusthi", "Santusti"),
    ("WELCOME 36", "Welcome 36"),
]

# No deletions for Anand.
DELETIONS: list[str] = []

ANAND_ORDER: list[tuple[str, int]] = [
    ("Gallops Restaurant", 1),
    ("HOCCO Eateria", 2),
    ("Schmitten", 3),
    ("Tea Post", 4),
    ("Jagdish Farsan", 5),
    ("South Leaf", 6),
    ("Iscon", 7),
    ("Crunch Corner", 8),
    ("Flame & Spice", 9),
    ("Karnavati", 10),
    ("Paratha & Frankies", 11),
    ("Poptos", 12),
    ("Puffiza", 13),
    ("Quick Bites", 14),
    ("Rajwadi Matka Khichdi", 15),
    ("Santusti", 16),
    ("Satyanarayana Kathiyawadi", 17),
    ("Welcome 36", 18),
]

# All requested outlets already exist after renames — nothing to create.
NEW_OUTLETS: dict[str, dict] = {}


async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    outlets = db.outlets

    plaza = await db.plazas.find_one({"id": ANAND_PLAZA_ID})
    assert plaza, f"Anand plaza {ANAND_PLAZA_ID} not found"
    print(f"Migrating Anand plaza: {plaza['name']}")

    # 1. Rename.
    for old, new in RENAMES:
        res = await outlets.update_one(
            {
                "plaza_id": ANAND_PLAZA_ID,
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
                "plaza_id": ANAND_PLAZA_ID,
                "name": {"$regex": f"^{name}$", "$options": "i"},
            }
        )
        if res.deleted_count:
            print(f"  🗑️  deleted '{name}'")

    # 2. Create missing outlets (none expected for Anand).
    import uuid as _uuid
    for name, _idx in ANAND_ORDER:
        existing = await outlets.find_one(
            {"plaza_id": ANAND_PLAZA_ID, "name": name}
        )
        if existing:
            continue
        defaults = NEW_OUTLETS.get(name)
        if not defaults:
            print(f"  ⚠️  '{name}' missing but no placeholder defaults — skipping")
            continue
        new_doc = {
            "id": str(_uuid.uuid4()),
            "plaza_id": ANAND_PLAZA_ID,
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

    # 3. Assign order_index.
    requested = {name: idx for name, idx in ANAND_ORDER}
    cur = outlets.find({"plaza_id": ANAND_PLAZA_ID})
    async for o in cur:
        new_oi = requested.get(o["name"], 0)
        if o.get("order_index", 0) != new_oi:
            await outlets.update_one(
                {"id": o["id"]}, {"$set": {"order_index": new_oi}}
            )
            print(f"  📍 order_index({o['name']}) = {new_oi}")

    # 4. Read back.
    print("\n--- Final Anand outlets ---")
    cur = outlets.find(
        {"plaza_id": ANAND_PLAZA_ID},
        {"_id": 0, "name": 1, "order_index": 1},
    ).sort([("order_index", 1), ("name", 1)])
    async for o in cur:
        print(f"  oi={o.get('order_index', 0):>2}  {o['name']}")

    client.close()
    print("\n✅ Anand migration complete.")


if __name__ == "__main__":
    asyncio.run(main())

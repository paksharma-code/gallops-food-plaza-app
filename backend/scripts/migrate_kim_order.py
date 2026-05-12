"""
One-shot migration for Gallops Food Plaza — Kim.

Idempotent — safe to re-run.

Final order (after migration):
    1. Gallops Restaurant   (brand priority idx 0)
    2. La Pino'z Pizza      (brand priority idx 3)
    3. HOCCO Eatery         (order_index 3)
    4. Sankalp              (order_index 4)
    5. Tea Post             (order_index 5)
    6. MMV                  (order_index 6)
    7. Tigmon               (order_index 7)
    8. Great Indian Waffle  (order_index 8)
    9. Kudrati Kahumbo      (order_index 9)
    10+ Any future-added outlets (order_index 0 → alphabetical at the bottom).
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
KIM_PLAZA_ID = "4b6f9f12-eb1b-472e-a757-8dd90291c146"

RENAMES: list[tuple[str, str]] = [
    ("MMV Vada Pav", "MMV"),
]

DELETIONS: list[str] = []

KIM_ORDER: list[tuple[str, int]] = [
    ("Gallops Restaurant", 1),
    ("La Pino'z Pizza", 2),
    ("HOCCO Eatery", 3),
    ("Sankalp", 4),
    ("Tea Post", 5),
    ("MMV", 6),
    ("Tigmon", 7),
    ("Great Indian Waffle", 8),
    ("Kudrati Kahumbo", 9),
]

NEW_OUTLETS: dict[str, dict] = {}


async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    outlets = db.outlets

    plaza = await db.plazas.find_one({"id": KIM_PLAZA_ID})
    assert plaza, f"Kim plaza {KIM_PLAZA_ID} not found"
    print(f"Migrating Kim plaza: {plaza['name']}")

    for old, new in RENAMES:
        res = await outlets.update_one(
            {"plaza_id": KIM_PLAZA_ID,
             "name": {"$regex": f"^{old}$", "$options": "i"}},
            {"$set": {"name": new}},
        )
        if res.modified_count:
            print(f"  ✏️  renamed '{old}' → '{new}'")
        else:
            print(f"  ✓  '{new}' already canonical (or not present)")

    for name in DELETIONS:
        res = await outlets.delete_one(
            {"plaza_id": KIM_PLAZA_ID,
             "name": {"$regex": f"^{name}$", "$options": "i"}}
        )
        if res.deleted_count:
            print(f"  🗑️  deleted '{name}'")

    for name, _idx in KIM_ORDER:
        existing = await outlets.find_one({"plaza_id": KIM_PLAZA_ID, "name": name})
        if existing:
            continue
        defaults = NEW_OUTLETS.get(name)
        if not defaults:
            print(f"  ⚠️  '{name}' missing but no placeholder defaults — skipping")
            continue
        new_doc = {
            "id": str(_uuid.uuid4()),
            "plaza_id": KIM_PLAZA_ID,
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

    requested = {name: idx for name, idx in KIM_ORDER}
    cur = outlets.find({"plaza_id": KIM_PLAZA_ID})
    async for o in cur:
        new_oi = requested.get(o["name"], 0)
        if o.get("order_index", 0) != new_oi:
            await outlets.update_one(
                {"id": o["id"]}, {"$set": {"order_index": new_oi}}
            )
            print(f"  📍 order_index({o['name']}) = {new_oi}")

    print("\n--- Final Kim outlets ---")
    cur = outlets.find(
        {"plaza_id": KIM_PLAZA_ID},
        {"_id": 0, "name": 1, "order_index": 1},
    ).sort([("order_index", 1), ("name", 1)])
    async for o in cur:
        print(f"  oi={o.get('order_index', 0):>2}  {o['name']}")

    client.close()
    print("\n✅ Kim migration complete.")


if __name__ == "__main__":
    asyncio.run(main())

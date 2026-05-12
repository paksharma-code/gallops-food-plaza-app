"""
One-shot migration for Gallops Food Plaza — Fedra (HQ).

Goals:
  1. Rename misspelled / inconsistently-cased outlets to canonical brand names.
  2. Create any outlet missing from the user-specified Fedra list (currently
     just "Roger").
  3. Assign an explicit `order_index` per outlet so the Fedra plaza renders in
     the exact order requested by the customer, regardless of brand priority
     or alphabetical fallback.

After this migration runs (idempotent — safe to re-run), Fedra outlets will
appear in this order across the app:
    1.  Gallops Restaurant     (brand priority idx 0)
    2.  Domino's               (brand priority idx 1)
    3.  Subway                 (brand priority idx 2)
    4.  La Pino'z Pizza        (brand priority idx 3)
    5.  Lord Petrick           (brand priority idx 4)
    6.  HOCCO Eatery           (order_index 6)
    7.  Tea Post               (order_index 7)
    8.  Sankalp                (order_index 8)
    9.  HOCCO Creamery         (order_index 9)
    10. Iscon Gathiya          (order_index 10)
    11. Karnavati Snacks       (order_index 11)
    12. Khichdi                (order_index 12)
    13. Budhia Juice           (order_index 13)
    14. Chat Pata Hub          (order_index 14)
    15. Kudrati Kahumbo        (order_index 15)
    16. Schmitten              (order_index 16)
    17. Mahindra EV Charging Station (order_index 17)
    18. Roger                  (order_index 18)
    19. Adil Qadri             (order_index 19)
    20+ Anything else (alphabetical fallback — e.g. Sahaj Oil, Waffle).
"""
import asyncio
import os
from datetime import datetime, timezone

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ.get("DB_NAME", "test_database")
FEDRA_PLAZA_ID = "4722073e-e775-47cd-8b78-fcb749ef1f8e"

# (current_name, canonical_name) — match is case-insensitive on current_name.
RENAMES: list[tuple[str, str]] = [
    ("Dominoz", "Domino's"),
    ("Lapinoz", "La Pino'z Pizza"),
    ("Hocco Eatery", "HOCCO Eatery"),
    ("hocco creamery", "HOCCO Creamery"),
    ("Teapost", "Tea Post"),
    ("Schmitten Chocolate", "Schmitten"),
    ("Mahindra E.V Fast Charging Station", "Mahindra EV Charging Station"),
    ("Waffle", "Great Indian Waffle"),
]

# Outlets to DELETE outright from Fedra (already-applied cleanup).
DELETIONS: list[str] = [
    "Sahaj Oil",
]

# Explicit per-outlet ordering for Fedra (positions 6..19).
# Priority-brand outlets (Gallops Restaurant, Domino's, Subway, La Pino'z,
# Lord Petrick) sort first automatically via PRIORITY_BRANDS — we still set
# their order_index for documentation, but it has no effect on their position.
FEDRA_ORDER: list[tuple[str, int]] = [
    ("Gallops Restaurant", 1),
    ("Domino's", 2),
    ("Subway", 3),
    ("La Pino'z Pizza", 4),
    ("Lord Petrick", 5),
    ("HOCCO Eatery", 6),
    ("Tea Post", 7),
    ("Sankalp", 8),
    ("HOCCO Creamery", 9),
    ("Iscon Gathiya", 10),
    ("Karnavati Snacks", 11),
    ("Khichdi", 12),
    ("Budhia Juice", 13),
    ("Chat Pata Hub", 14),
    ("Kudrati Kahumbo", 15),
    ("Schmitten", 16),
    ("Mahindra EV Charging Station", 17),
    ("Roger", 18),
    ("Adil Qadri", 19),
]

# Newly-created outlets (do not exist yet) get sensible placeholder values.
NEW_OUTLETS = {
    "Roger": dict(
        mobile="+919824006262",            # placeholder; admin can update
        opening_time="09:00",
        closing_time="22:00",
        time_slots=None,
        is_reservation_enabled=False,
        is_offers_enabled=True,
        description="",
        address="Gallops Food Plaza, Fedra",
    ),
}


async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    outlets = db.outlets

    plaza = await db.plazas.find_one({"id": FEDRA_PLAZA_ID})
    assert plaza, f"Fedra plaza {FEDRA_PLAZA_ID} not found"
    print(f"Migrating Fedra plaza: {plaza['name']}")

    # 1. Rename misspelled outlets (case-insensitive).
    for old, new in RENAMES:
        res = await outlets.update_one(
            {
                "plaza_id": FEDRA_PLAZA_ID,
                "name": {"$regex": f"^{old}$", "$options": "i"},
            },
            {"$set": {"name": new}},
        )
        if res.modified_count:
            print(f"  ✏️  renamed '{old}' → '{new}'")
        else:
            print(f"  ✓  '{new}' already canonical (or not present)")

    # 1b. Delete outlets that are no longer wanted at Fedra.
    for name in DELETIONS:
        res = await outlets.delete_one(
            {
                "plaza_id": FEDRA_PLAZA_ID,
                "name": {"$regex": f"^{name}$", "$options": "i"},
            }
        )
        if res.deleted_count:
            print(f"  🗑️  deleted '{name}'")

    # 2. Ensure every outlet in FEDRA_ORDER exists; create missing ones with
    #    placeholder defaults from NEW_OUTLETS.
    for name, _idx in FEDRA_ORDER:
        existing = await outlets.find_one(
            {"plaza_id": FEDRA_PLAZA_ID, "name": name}
        )
        if existing:
            continue
        defaults = NEW_OUTLETS.get(name, {})
        if not defaults:
            print(f"  ⚠️  '{name}' missing but no placeholder defaults — skipping")
            continue
        import uuid as _uuid

        new_doc = {
            "id": str(_uuid.uuid4()),
            "plaza_id": FEDRA_PLAZA_ID,
            "name": name,
            "logo": "",
            "image2": None,
            "image3": None,
            "order_index": 0,  # will be set in next loop
            "created_at": datetime.now(timezone.utc),
            **defaults,
        }
        await outlets.insert_one(new_doc)
        print(f"  ✨ created '{name}' with placeholder details")

    # 3. Assign explicit order_index on every Fedra outlet that appears in
    #    the user-specified order. Outlets not in FEDRA_ORDER get
    #    order_index = 0 (so they sort alphabetically AFTER the curated list).
    requested = {name: idx for name, idx in FEDRA_ORDER}

    cur = outlets.find({"plaza_id": FEDRA_PLAZA_ID})
    async for o in cur:
        new_oi = requested.get(o["name"], 0)
        if o.get("order_index", 0) != new_oi:
            await outlets.update_one(
                {"id": o["id"]}, {"$set": {"order_index": new_oi}}
            )
            print(f"  📍 order_index({o['name']}) = {new_oi}")

    # 4. Final readback for sanity.
    print("\n--- Final Fedra outlets ---")
    cur = outlets.find({"plaza_id": FEDRA_PLAZA_ID}, {"_id": 0, "name": 1, "order_index": 1}).sort("order_index", 1)
    async for o in cur:
        print(f"  oi={o.get('order_index', 0):>2}  {o['name']}")

    client.close()
    print("\n✅ Fedra migration complete.")


if __name__ == "__main__":
    asyncio.run(main())

"""
Add "Gallops Restaurant" outlet to every operational plaza + seed its full menu.

Idempotent: re-running will only add missing outlets / menu items.
"""
import os
import uuid
from datetime import datetime
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv('/app/backend/.env')
client = MongoClient(os.getenv('MONGO_URL'))
db = client[os.getenv('DB_NAME')]

# Logo is served by FastAPI static mount — absolute URL so it works on device + web
BACKEND_URL = os.getenv('EXPO_PUBLIC_BACKEND_URL', 'https://gallops-reserve-dine.preview.emergentagent.com').rstrip('/')
GALLOPS_LOGO = f"{BACKEND_URL}/api/static/gallops-restaurant-logo.png"

DEFAULT_TIME_SLOTS = [
    {"open": "11:00", "close": "15:30"},
    {"open": "18:30", "close": "23:00"},
]

# ---------------- MENU ----------------
MENU: list[tuple[str, str, float]] = [
    # (category, name, price)
    # Juices
    ("Juices", "Mix Fruit Juice", 155),
    ("Juices", "Ganga Jamuna Juice", 155),
    ("Juices", "Orange Juice", 150),
    ("Juices", "Pineapple Juice", 150),
    ("Juices", "Sweet Lemon Juice", 150),
    # Beverages
    ("Beverages", "Gallops Special Lassi (250 ml)", 165),
    ("Beverages", "Lassi (250 ml)", 140),
    ("Beverages", "Fresh Lime Soda / Water", 80),
    ("Beverages", "Masala Butter Milk", 60),
    ("Beverages", "Butter Milk", 50),
    # Milk Shakes
    ("Milk Shakes", "Kaju Anjeer Milk Shake", 210),
    ("Milk Shakes", "Kaju Pista Milk Shake", 210),
    # Around the World
    ("Around the World", "Paneer Sizzler (600g)", 350),
    ("Around the World", "Veg. Sizzler (600g)", 330),
    ("Around the World", "Chinese Sizzler (600g)", 330),
    ("Around the World", "Baked Macaroni with Pineapple", 300),
    ("Around the World", "Baked Vegetable with Pineapple", 300),
    ("Around the World", "Baked Macaroni", 300),
    # Soups
    ("Soups", "Veg. Dumpling Soup", 170),
    ("Soups", "Cheese Corn Tomato Soup", 170),
    ("Soups", "Hot-N-Sour Soup / Manchow Soup", 150),
    ("Soups", "Lemon Coriander Soup", 140),
    ("Soups", "Sweet Corn Soup", 130),
    ("Soups", "Cream of Tomato Soup", 130),
    # Tandoor Starters
    ("Tandoor Starters", "Stuffed Tandoori Mushroom Tikka", 350),
    ("Tandoor Starters", "Paneer Taka Tak", 350),
    ("Tandoor Starters", "Gallops Special Tandoori Platter", 350),
    ("Tandoor Starters", "Mushroom Tikka", 320),
    ("Tandoor Starters", "Paneer Tikka Dry", 320),
    ("Tandoor Starters", "Dahi Ka Kabab", 260),
    ("Tandoor Starters", "Hara Bhara Kabab", 260),
    # Chinese Starters
    ("Chinese Starters", "Paneer Chilly (Dry / Gravy)", 320),
    ("Chinese Starters", "Crispy Cottage Cheese Hong Kong Style", 320),
    ("Chinese Starters", "Paneer 65", 320),
    ("Chinese Starters", "Veg. Spring Roll", 280),
    ("Chinese Starters", "Crispy Corn Thai Chilly", 280),
    ("Chinese Starters", "Chinese Bhel", 270),
    ("Chinese Starters", "Crispy Veg.", 250),
    ("Chinese Starters", "Veg. Manchurian (Dry / Gravy)", 250),
    ("Chinese Starters", "Honey Chilly Potato", 250),
    ("Chinese Starters", "Veg 65", 250),
    # Accompaniments
    ("Accompaniments", "Pineapple Raita", 150),
    ("Accompaniments", "Choice Of Raita", 110),
    ("Accompaniments", "Cheese Masala Papad", 100),
    ("Accompaniments", "Curd", 80),
    ("Accompaniments", "Masala Papad", 50),
    ("Accompaniments", "Fried Papad", 40),
    ("Accompaniments", "Roasted Papad", 30),
    # Salads
    ("Salads", "Green Salad", 100),
    ("Salads", "Tomato Salad", 100),
    ("Salads", "Kachumber Salad", 100),
    # Special Combos
    ("Special Combos", "Chinese Combo", 270),
    ("Special Combos", "Biryani with Mixed Veg. Raita", 260),
    ("Special Combos", "Dal Makhani with Lachha Paratha", 230),
    ("Special Combos", "Dahi Tikhari & 4 Bhakhri", 230),
    ("Special Combos", "Sukhi Bhaji & 4 Thepla", 190),
    ("Special Combos", "Masala Khichdi with Curd", 180),
    ("Special Combos", "Aloo Paratha with Curd", 175),
    ("Special Combos", "Vagharelo Rotlo", 170),
    # Fixed Thali
    ("Fixed Thali", "Punjabi Executive Thali", 240),
    ("Fixed Thali", "Kathiyawadi Executive Thali", 220),
    # Punjabi Palette
    ("Punjabi Palette", "Kaju Curry", 340),
    ("Punjabi Palette", "Kaju Masala", 340),
    ("Punjabi Palette", "Kaju Paneer Masala", 340),
    ("Punjabi Palette", "Cheese Kaju Masala", 340),
    ("Punjabi Palette", "Cheese Angoori Kofta", 340),
    ("Punjabi Palette", "Gallops Special Vegetable", 330),
    ("Punjabi Palette", "Cheese Butter Masala", 320),
    ("Punjabi Palette", "Khoya Kaju", 310),
    # Paneer Preparation
    ("Paneer Preparation", "Paneer Chatpatta", 350),
    ("Paneer Preparation", "Paneer Angara / Toofani", 350),
    ("Paneer Preparation", "Paneer Hara Pyaz", 330),
    ("Paneer Preparation", "Paneer Bhurji", 330),
    ("Paneer Preparation", "Paneer Butter Masala", 330),
    ("Paneer Preparation", "Paneer Lababdar", 330),
    ("Paneer Preparation", "Paneer Mushroom Masala", 330),
    ("Paneer Preparation", "Paneer Pasanda", 330),
    ("Paneer Preparation", "Paneer Tawa Masala", 330),
    ("Paneer Preparation", "Paneer Tikka Masala", 330),
    ("Paneer Preparation", "Kadai / Handi Paneer", 330),
    ("Paneer Preparation", "Your Choice of Kofta Preparation", 320),
    # Veg. Preparation
    ("Veg. Preparation", "Mushroom Masala", 310),
    ("Veg. Preparation", "Mutter Methi Malai", 310),
    ("Veg. Preparation", "Navratan Korma", 310),
    ("Veg. Preparation", "Veg. Toofani / Angara", 310),
    ("Veg. Preparation", "Veg. Tawa Masala", 310),
    ("Veg. Preparation", "Veg. Makhanwala", 310),
    ("Veg. Preparation", "Bhindi do Pyaza", 310),
    ("Veg. Preparation", "Veg. Jaipuri / Kolhapuri", 310),
    ("Veg. Preparation", "Veg. Kadai / Handi", 310),
    ("Veg. Preparation", "Mixed Vegetable", 270),
    ("Veg. Preparation", "Your Choice of Palak Preparation", 270),
    ("Veg. Preparation", "Chana Masala", 260),
    ("Veg. Preparation", "Bhindi Masala", 260),
    ("Veg. Preparation", "Your Choice of Potato Preparation", 260),
    # Dal Delights
    ("Dal Delights", "Dal Makhani", 285),
    ("Dal Delights", "Dal Tadka", 220),
    ("Dal Delights", "Dhaba Dal", 220),
    ("Dal Delights", "Dal Fry", 200),
    # Tandoori Dough Delights (Breads)
    ("Breads", "Cheese Naan / Kulcha", 150),
    ("Breads", "Garlic Naan / Kulcha", 150),
    ("Breads", "Stuffed Naan / Kulcha", 120),
    ("Breads", "Butter Naan / Kulcha", 90),
    ("Breads", "Lachhedar Paratha", 70),
    ("Breads", "Plain Naan / Kulcha", 70),
    ("Breads", "Methi Butter Paratha", 65),
    ("Breads", "Methi Paratha", 60),
    ("Breads", "Butter Roti", 38),
    ("Breads", "Plain Roti", 33),
    # Rice & Noodles
    ("Rice & Noodles", "Veg. Manchurian Noodles / Rice", 260),
    ("Rice & Noodles", "Veg. Schezwan Noodles", 250),
    ("Rice & Noodles", "Veg. Schezwan / Garlic Fried Rice", 250),
    ("Rice & Noodles", "Paneer Handi Dum Biryani", 250),
    ("Rice & Noodles", "Veg. Hyderabadi Biryani", 230),
    ("Rice & Noodles", "Veg. Pulao", 200),
    ("Rice & Noodles", "Kashmiri Pulao", 200),
    ("Rice & Noodles", "Peas Pulao", 200),
    ("Rice & Noodles", "Jeera Rice", 190),
    ("Rice & Noodles", "Steamed Rice", 155),
    # Kathiyawadi Cuisine
    ("Kathiyawadi Cuisine", "Kaju Gathiya", 250),
    ("Kathiyawadi Cuisine", "Akhi Dungri", 195),
    ("Kathiyawadi Cuisine", "Bharela Batata Dungri", 195),
    ("Kathiyawadi Cuisine", "Bharela Ringna", 195),
    ("Kathiyawadi Cuisine", "Kathiyawadi Bhindi", 195),
    ("Kathiyawadi Cuisine", "Lasaniya Batata", 195),
    ("Kathiyawadi Cuisine", "Gallops Special Dhokli", 195),
    ("Kathiyawadi Cuisine", "Ringna No Olo (Seasonal)", 195),
    ("Kathiyawadi Cuisine", "Sev Dungli Masala", 190),
    ("Kathiyawadi Cuisine", "Dahi Tikhari Dhokli", 190),
    ("Kathiyawadi Cuisine", "Bharela Karela", 190),
    ("Kathiyawadi Cuisine", "Kathol", 170),
    ("Kathiyawadi Cuisine", "Sev Masala", 170),
    ("Kathiyawadi Cuisine", "Aloo Rasawala", 165),
    ("Kathiyawadi Cuisine", "Seasonal Veg.", 165),
    ("Kathiyawadi Cuisine", "Sev Tomato", 165),
    ("Kathiyawadi Cuisine", "Dahi Tikhari", 155),
    ("Kathiyawadi Cuisine", "Bhat", 110),
    ("Kathiyawadi Cuisine", "Dal", 110),
    # Kathiyawadi Rotis/Rotla
    ("Kathiyawadi Rotis", "Garlic / Methi Butter Rotla", 80),
    ("Kathiyawadi Rotis", "Garlic / Methi Rotla", 70),
    ("Kathiyawadi Rotis", "Butter Rotla", 70),
    ("Kathiyawadi Rotis", "Tawa Butter Paratha", 70),
    ("Kathiyawadi Rotis", "Tawa Lachha Paratha", 70),
    ("Kathiyawadi Rotis", "Plain Rotla", 60),
    ("Kathiyawadi Rotis", "Tawa Butter Roti", 27),
    ("Kathiyawadi Rotis", "Tawa Roti", 25),
    # Special Khichdi
    ("Special Khichdi", "Hara Pyaaz aur Lahsan ki Khichdi", 190),
    ("Special Khichdi", "Dal Khichdi with Curd", 185),
    ("Special Khichdi", "Masala Khichdi with Curd", 180),
    ("Special Khichdi", "Mixed Veg. Khichdi", 180),
    ("Special Khichdi", "Palak Corn Khichdi", 180),
    ("Special Khichdi", "Vaghareli Khichdi", 175),
    ("Special Khichdi", "Plain Khichdi (Dinner)", 140),
    ("Special Khichdi", "Kadhi (Dinner)", 120),
    # Desserts
    ("Desserts", "Sizzling Brownie", 160),
    ("Desserts", "Brownie with Ice cream", 130),
    ("Desserts", "Brownie", 110),
    ("Desserts", "Gulab Jamun", 110),
    ("Desserts", "Moong Dal Halwa", 110),
    ("Desserts", "Lachko Mohanthal", 110),
    ("Desserts", "Gajar Ka Halwa", 110),
    # South Indian
    ("South Indian", "South Indian Platter", 220),
    ("South Indian", "Cheese Uttapam", 190),
    ("South Indian", "Gallops Special Masala Idli", 190),
    ("South Indian", "Mix / Masala / Tomato / Onion Uttapam", 175),
    ("South Indian", "Dahi Vada", 150),
    ("South Indian", "Idli Vada Mix", 130),
    ("South Indian", "Medu Vada", 130),
    ("South Indian", "Idli Sambar", 120),
    ("South Indian", "Upma", 120),
    # Dosa
    ("Dosa", "Gallops Special Dosa", 215),
    ("Dosa", "Cheese Masala Dosa", 195),
    ("Dosa", "Rava Masala Dosa", 180),
    ("Dosa", "Mysore Masala Dosa", 180),
    ("Dosa", "Paper Masala Dosa", 180),
    ("Dosa", "Spring Dosa", 175),
    ("Dosa", "Onion Rava Masala Dosa", 175),
    ("Dosa", "Butter Masala Dosa", 170),
    ("Dosa", "Rava Sada Dosa", 160),
    ("Dosa", "Mysore Sada Dosa", 170),
    ("Dosa", "Paper Sada Dosa", 170),
    ("Dosa", "Onion Rava Sada Dosa", 165),
    ("Dosa", "Masala Dosa", 160),
    ("Dosa", "Butter Sada Dosa", 150),
    ("Dosa", "Onion Sada Dosa", 145),
    ("Dosa", "Plain Dosa", 140),
]

# Optional per-category representative image (Unsplash/Pexels)
CATEGORY_IMAGE = {
    "Juices": "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=500&auto=format&fit=crop&q=60",
    "Beverages": "https://images.unsplash.com/photo-1558160074-4d7d8bdf4256?w=500&auto=format&fit=crop&q=60",
    "Milk Shakes": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&auto=format&fit=crop&q=60",
    "Around the World": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&auto=format&fit=crop&q=60",
    "Soups": "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=500&auto=format&fit=crop&q=60",
    "Tandoor Starters": "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60",
    "Chinese Starters": "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=500&auto=format&fit=crop&q=60",
    "Accompaniments": "https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?w=500&auto=format&fit=crop&q=60",
    "Salads": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&auto=format&fit=crop&q=60",
    "Special Combos": "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=500&auto=format&fit=crop&q=60",
    "Fixed Thali": "https://images.pexels.com/photos/29148133/pexels-photo-29148133.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    "Punjabi Palette": "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=60",
    "Paneer Preparation": "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&auto=format&fit=crop&q=60",
    "Veg. Preparation": "https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=500&auto=format&fit=crop&q=60",
    "Dal Delights": "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop&q=60",
    "Breads": "https://images.unsplash.com/photo-1626500155770-694f08a34e62?w=500&auto=format&fit=crop&q=60",
    "Rice & Noodles": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=60",
    "Kathiyawadi Cuisine": "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=500&auto=format&fit=crop&q=60",
    "Kathiyawadi Rotis": "https://images.unsplash.com/photo-1626500155770-694f08a34e62?w=500&auto=format&fit=crop&q=60",
    "Special Khichdi": "https://images.unsplash.com/photo-1625398407796-82650a8c135f?w=500&auto=format&fit=crop&q=60",
    "Desserts": "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=60",
    "South Indian": "https://images.pexels.com/photos/32229637/pexels-photo-32229637.png?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    "Dosa": "https://images.unsplash.com/photo-1630383249896-424e482df921?w=500&auto=format&fit=crop&q=60",
}


def ensure_gallops_outlet(plaza: dict) -> str:
    """Return outlet id, creating/refreshing the Gallops Restaurant record."""
    existing = db.outlets.find_one({"plaza_id": plaza["id"], "name": "Gallops Restaurant"})
    now = datetime.utcnow().isoformat()
    if existing:
        db.outlets.update_one(
            {"id": existing["id"]},
            {"$set": {
                "logo": GALLOPS_LOGO,
                "is_reservation_enabled": True,
                "time_slots": DEFAULT_TIME_SLOTS,
                "opening_time": DEFAULT_TIME_SLOTS[0]["open"],
                "closing_time": DEFAULT_TIME_SLOTS[-1]["close"],
                "description": "Premium multi-cuisine restaurant & banquet at Gallops Food Plaza — the flagship of our highway experience.",
                "updated_at": now,
            }},
        )
        return existing["id"]
    doc = {
        "id": str(uuid.uuid4()),
        "plaza_id": plaza["id"],
        "name": "Gallops Restaurant",
        "description": "Premium multi-cuisine restaurant & banquet at Gallops Food Plaza — the flagship of our highway experience.",
        "mobile": "+919157917777",
        "opening_time": DEFAULT_TIME_SLOTS[0]["open"],
        "closing_time": DEFAULT_TIME_SLOTS[-1]["close"],
        "time_slots": DEFAULT_TIME_SLOTS,
        "logo": GALLOPS_LOGO,
        "address": plaza.get("address", ""),
        "is_reservation_enabled": True,
        "created_at": now,
        "updated_at": now,
    }
    db.outlets.insert_one(doc)
    return doc["id"]


def seed_menu(outlet_id: str) -> tuple[int, int]:
    """Insert menu items that are missing for the outlet. Returns (inserted, skipped)."""
    inserted = 0
    skipped = 0
    for cat, name, price in MENU:
        exists = db.menu_items.find_one({"outlet_id": outlet_id, "name": name})
        if exists:
            skipped += 1
            continue
        now = datetime.utcnow().isoformat()
        db.menu_items.insert_one({
            "id": str(uuid.uuid4()),
            "outlet_id": outlet_id,
            "category": cat,
            "name": name,
            "price": float(price),
            "image": CATEGORY_IMAGE.get(cat, ""),
            "created_at": now,
        })
        inserted += 1
    return inserted, skipped


def run():
    operational = list(db.plazas.find({"status": "operational"}))
    print(f"[INFO] Operational plazas: {len(operational)}")

    total_new_outlets = 0
    total_inserted = 0
    total_skipped = 0

    for p in operational:
        print(f"\n-> {p['name']} ({p['id']})")
        outlet_id = ensure_gallops_outlet(p)
        print(f"   Gallops Restaurant outlet id: {outlet_id}")
        ins, skp = seed_menu(outlet_id)
        total_inserted += ins
        total_skipped += skp
        print(f"   Menu: +{ins} new, {skp} already present")

    print(f"\n✔ Gallops Restaurant ensured in {len(operational)} operational plazas.")
    print(f"✔ Menu items inserted: {total_inserted}, skipped (already present): {total_skipped}")


if __name__ == "__main__":
    run()

"""Seed the About page with Gallops' real content + imagery scraped from the public site."""
import os
from pymongo import MongoClient
from dotenv import load_dotenv
from datetime import datetime, timezone

load_dotenv('/app/backend/.env')
client = MongoClient(os.getenv('MONGO_URL'))
db = client[os.getenv('DB_NAME')]

BACKEND_URL = os.getenv('EXPO_PUBLIC_BACKEND_URL', 'https://gallops-reserve-dine.preview.emergentagent.com').rstrip('/')

doc = {
    "id": "about",
    "title": "About Gallops Food Plaza",
    "body": (
        "At Gallops Food Plaza, our journey began with a simple yet powerful idea — to "
        "redefine the highway dining experience. What started as a single destination has "
        "now grown into a network of dynamic food plazas across key highways, each offering "
        "a blend of quality, variety, hygiene, and hospitality.\n\n"
        "We've built more than just food courts. We've created culinary hubs that bring "
        "together leading brands, family-friendly spaces, and consistent cleanliness standards "
        "to offer travellers a break that's both memorable and refreshing.\n\n"
        "Every plaza reflects our passion for food, people, and excellence. From authentic "
        "Indian flavours to modern fusion fare, every bite is crafted with care, served with "
        "warmth, and backed by the highest food safety standards in the industry.\n\n"
        "Gallops isn't just where you stop to eat — it's where the journey becomes delicious."
    ),
    "hero_banner": f"{BACKEND_URL}/api/static/about-hero-banner.jpg",
    "hero_image": f"{BACKEND_URL}/api/static/about-hero.jpg",
    "leadership": [
        {
            "name": "Mr. Jayveersinh M. Chudasama",
            "role": "Managing Director",
            "photo": f"{BACKEND_URL}/api/static/jayveersinh-chudasama.jpg",
            "bio": (
                "When you take a break at Gallops, it's more than just a stop on the highway — "
                "it's a moment of comfort, taste, and care. That's exactly what Mr. Jayveersinh "
                "Chudasama set out to create.\n\n"
                "Raised in a family deeply rooted in hospitality, he was inspired early on by the "
                "joy that great food and heartfelt service can bring. With that passion, he "
                "founded Gallops Hospitality — not just as a business, but as a space where "
                "travellers and families could pause, refresh, and enjoy wholesome food in a "
                "clean, welcoming setting.\n\n"
                "His vision has always been clear:\n"
                "• Uphold the highest standards of hygiene\n"
                "• Deliver consistent quality\n"
                "• Create genuine, memorable experiences for every guest\n\n"
                "Under Mr. Chudasama's leadership, Gallops has grown into one of Gujarat's most "
                "trusted names in highway dining — admired not just for its quality, but for its "
                "commitment to hospitality that truly cares."
            ),
        },
        {
            "name": "Mr. Abhishek Palande",
            "role": "Chief Executive Officer",
            "photo": f"{BACKEND_URL}/api/static/abhishek-palande.jpg",
            "bio": (
                "At Gallops Food Plaza, we envision becoming the fastest growing highway food "
                "plaza chain in India — a destination known for culinary excellence, innovation, "
                "and guest delight. Every stop at Gallops is built to offer not just great food, "
                "but a meaningful experience where every meal tells a story and every guest feels "
                "valued.\n\n"
                "Committed to quality, sustainability, and hospitality, Mr. Palande leads with a "
                "passion for creating spaces that reflect warmth, efficiency, and impeccable "
                "standards. His vision is to expand the Gallops footprint, while staying true to "
                "the values of trust, taste, and transparency.\n\n"
                "Under his leadership, Gallops continues to evolve — blending innovation with "
                "tradition, scaling with sustainability, and celebrating the universal love for "
                "great food."
            ),
        },
    ],
    "why_choose": [
        "Fresh & Hygienic Food",
        "Multi-Cuisine Options",
        "EV Charging Stations",
        "Family-Friendly Spaces",
        "Convenient Highway Locations",
        "Clean Restrooms",
    ],
    "franchise_title": "Franchise Enquiry",
    "franchise_description": (
        "Partner with one of Gujarat's fastest-growing highway food plaza chains. "
        "Tap below to reach our franchise team."
    ),
    "franchise_phone": "+918779515804",
    "franchise_email": "",
    "updated_at": datetime.now(timezone.utc).isoformat(),
}

db.settings.update_one({"id": "about"}, {"$set": doc}, upsert=True)
print("✔ Seeded about content with leadership + imagery")

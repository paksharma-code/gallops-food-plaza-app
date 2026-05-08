# Gallops Food Plaza Anand – PRD

## Overview
A single Expo React Native mobile app serving both the customer-facing experience for **Gallops Food Plaza Anand** and an in-app **Admin Panel** for outlet staff to manage all data dynamically. Replaces Google Sheets with a FastAPI + MongoDB backend.

## Tech Stack
- **Frontend**: Expo SDK 54, expo-router (file-based), React Native 0.81, TypeScript, AsyncStorage, expo-image-picker
- **Backend**: FastAPI, Motor (MongoDB async), bcrypt + PyJWT for JWT auth, Pydantic models
- **Database**: MongoDB (`gallops_food_plaza` DB) with collections: users, outlets, menu_items, offers, reservations

## User Features
- **Home** (`/`): Warm earth-tone branded header, horizontal "Offers of the Day" carousel, vertical list of outlet cards (logo, name, open/closed status, hours, description, Call / WhatsApp / Menu CTAs). Pull-to-refresh. Admin shortcut pill.
- **Outlet Detail** (`/outlet/[id]`): Edge-to-edge hero image, floating info card with status/hours/address/description, Call + WhatsApp actions, "Reserve a Table" button only shown when outlet has `is_reservation_enabled=true`, outlet-specific offers, menu filtered by outlet with category chips and item cards (image, name, description, ₹ price).
- **Reservation** (`/reservation/[id]`): Gated to reservation-enabled outlets. Form fields: Name, Mobile, Date (YYYY-MM-DD), Time (HH:MM), Guests (counter 1–50), Notes. Validation + success screen.

## Admin Panel
- **Login** (`/admin/login`): Email + password. Seeded account `admin@gallops.com` / `admin123`. JWT stored in AsyncStorage.
- **Dashboard** (`/admin`): 4 tabs
  - **Outlets**: list, add, edit, delete (cascades menu + offers). Fields: name, mobile, opening/closing time, logo, description, address, reservations toggle.
  - **Menu**: list, add, edit, delete. Assign to outlet, category, name, price, description, image.
  - **Offers**: list, add, edit, delete. Assign to single outlet or all (global). Title, description, image, valid_until, active toggle.
  - **Reservations**: list, filter by outlet + date, update status (pending / confirmed / cancelled), delete.
- Image input supports URL paste or device gallery pick (base64 inline).

## API Surface
### Public
`GET /api/outlets`, `GET /api/outlets/{id}`, `GET /api/menu?outlet_id=`, `GET /api/offers`, `POST /api/reservations`

### Auth
`POST /api/auth/login`, `GET /api/auth/me`

### Admin (Bearer)
CRUD on outlets, menu, offers + list/update-status/delete reservations.

## Data Flow
- `OutletID` is the foreign key linking menu items, offers, and reservations to outlets.
- Deleting an outlet cascades to its menu and outlet-scoped offers.
- Reservations rejected if the outlet does not have `is_reservation_enabled=true` (enforced on backend).
- Offer list returned to app home includes global offers (`outlet_id: null`) and per-outlet offers when `outlet_id` filter is provided.

## Seed Data
5 outlets (Gallops Restaurant [reservations on], Cafe, Fast Food, Juice Bar, Ice Cream), 24 menu items across them, 3 offers (1 global, 2 outlet-specific). Admin user.

## Design
Light-mode earthy palette per /app/design_guidelines.json: primary `#C84B31`, background `#F9F6F0`, text `#2D2825`. Generous radii (24px user app) contrasted with denser admin panel (10px radii, flat surfaces). Ionicons for icons.

## Business Enhancement Opportunities
1. SMS/WhatsApp auto-confirmation for reservations (plug Twilio or similar)
2. Table-specific QR menu (link to /outlet/{id}) printed per table
3. Happy Hour push notifications based on active plaza-wide offers

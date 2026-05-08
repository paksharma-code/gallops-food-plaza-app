# Auth Testing Playbook – Gallops Food Plaza

## MongoDB Verification
```
mongosh
use gallops_food_plaza
db.users.find({role: "admin"}).pretty()
```
Verify: bcrypt hash starts with `$2b$`, unique index exists on users.email.

## API Testing
```
# Login
curl -s -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gallops.com","password":"admin123"}'

# Me (replace TOKEN)
curl -s http://localhost:8001/api/auth/me -H "Authorization: Bearer TOKEN"
```

## Admin Protected Endpoints (all require Bearer token)
- POST /api/outlets
- PUT  /api/outlets/{id}
- DELETE /api/outlets/{id}
- POST /api/menu, PUT /api/menu/{id}, DELETE /api/menu/{id}
- POST /api/offers, PUT /api/offers/{id}, DELETE /api/offers/{id}
- GET  /api/reservations
- PUT  /api/reservations/{id}/status
- DELETE /api/reservations/{id}

## Public Endpoints
- GET /api/outlets
- GET /api/outlets/{id}
- GET /api/menu?outlet_id=...
- GET /api/offers
- POST /api/reservations  (only for outlets with is_reservation_enabled=true)

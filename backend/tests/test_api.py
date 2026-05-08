"""Comprehensive API tests for Gallops Food Plaza

Tests cover:
- Public endpoints (outlets, menu, offers, reservations)
- Auth endpoints (login, me)
- Admin CRUD operations (outlets, menu, offers, reservations)
- Cascade delete
- Filters and edge cases
"""
import pytest
import requests


class TestPublicEndpoints:
    """Test public API endpoints"""

    def test_get_outlets_returns_5_seeded(self, base_url, api_client):
        """GET /api/outlets should return 5 seeded outlets"""
        response = api_client.get(f"{base_url}/api/auth/login")
        assert response.status_code == 405, "Login endpoint should not accept GET"
        
        response = api_client.get(f"{base_url}/api/outlets")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        outlets = response.json()
        assert isinstance(outlets, list), "Response should be a list"
        assert len(outlets) == 5, f"Expected 5 outlets, got {len(outlets)}"
        
        # Verify Gallops Restaurant has is_reservation_enabled=true
        gallops_restaurant = next((o for o in outlets if o['name'] == 'Gallops Restaurant'), None)
        assert gallops_restaurant is not None, "Gallops Restaurant not found"
        assert gallops_restaurant['is_reservation_enabled'] is True, "Gallops Restaurant should have reservations enabled"
        
        # Verify other outlets have is_reservation_enabled=false
        other_outlets = [o for o in outlets if o['name'] != 'Gallops Restaurant']
        for outlet in other_outlets:
            assert outlet['is_reservation_enabled'] is False, f"{outlet['name']} should not have reservations enabled"

    def test_get_offers_returns_3_including_global(self, base_url, api_client):
        """GET /api/offers should return 3 offers including one global"""
        response = api_client.get(f"{base_url}/api/offers")
        assert response.status_code == 200
        
        offers = response.json()
        assert len(offers) == 3, f"Expected 3 offers, got {len(offers)}"
        
        # Check for global offer (outlet_id=null)
        global_offers = [o for o in offers if o.get('outlet_id') is None]
        assert len(global_offers) >= 1, "Should have at least one global offer"

    def test_get_menu_filtered_by_outlet(self, base_url, api_client):
        """GET /api/menu?outlet_id=<id> should return only that outlet's menu"""
        # First get outlets
        outlets_response = api_client.get(f"{base_url}/api/outlets")
        outlets = outlets_response.json()
        
        # Test menu for first outlet
        outlet_id = outlets[0]['id']
        response = api_client.get(f"{base_url}/api/menu?outlet_id={outlet_id}")
        assert response.status_code == 200
        
        menu_items = response.json()
        assert isinstance(menu_items, list)
        
        # Verify all items belong to this outlet
        for item in menu_items:
            assert item['outlet_id'] == outlet_id, f"Menu item {item['id']} has wrong outlet_id"

    def test_get_individual_outlet(self, base_url, api_client):
        """GET /api/outlets/{id} should return individual outlet"""
        # Get all outlets first
        outlets_response = api_client.get(f"{base_url}/api/outlets")
        outlets = outlets_response.json()
        outlet_id = outlets[0]['id']
        
        # Get individual outlet
        response = api_client.get(f"{base_url}/api/outlets/{outlet_id}")
        assert response.status_code == 200
        
        outlet = response.json()
        assert outlet['id'] == outlet_id
        assert 'name' in outlet
        assert 'mobile' in outlet

    def test_get_nonexistent_outlet_returns_404(self, base_url, api_client):
        """GET /api/outlets/{invalid_id} should return 404"""
        response = api_client.get(f"{base_url}/api/outlets/nonexistent-id-12345")
        assert response.status_code == 404


class TestAuthEndpoints:
    """Test authentication endpoints"""

    def test_login_success_with_correct_credentials(self, base_url, api_client):
        """POST /api/auth/login with correct credentials should return token and user"""
        response = api_client.post(
            f"{base_url}/api/auth/login",
            json={"email": "admin@gallops.com", "password": "admin123"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert 'token' in data, "Response should contain token"
        assert 'user' in data, "Response should contain user"
        assert data['user']['email'] == 'admin@gallops.com'
        assert data['user']['role'] == 'admin'

    def test_login_fails_with_wrong_password(self, base_url, api_client):
        """POST /api/auth/login with wrong password should return 401"""
        response = api_client.post(
            f"{base_url}/api/auth/login",
            json={"email": "admin@gallops.com", "password": "wrongpassword"}
        )
        assert response.status_code == 401

    def test_login_fails_with_nonexistent_email(self, base_url, api_client):
        """POST /api/auth/login with nonexistent email should return 401"""
        response = api_client.post(
            f"{base_url}/api/auth/login",
            json={"email": "nonexistent@example.com", "password": "password"}
        )
        assert response.status_code == 401

    def test_me_requires_authorization_header(self, base_url, api_client):
        """GET /api/auth/me without Authorization should return 401"""
        response = api_client.get(f"{base_url}/api/auth/me")
        assert response.status_code == 401

    def test_me_with_valid_token_returns_user(self, base_url, api_client, auth_headers):
        """GET /api/auth/me with valid token should return user data"""
        response = api_client.get(f"{base_url}/api/auth/me", headers=auth_headers)
        assert response.status_code == 200
        
        user = response.json()
        assert user['email'] == 'admin@gallops.com'
        assert user['role'] == 'admin'


class TestAdminOutletCRUD:
    """Test admin outlet CRUD operations"""

    def test_create_outlet_requires_auth(self, base_url, api_client):
        """POST /api/outlets without token should return 401"""
        response = api_client.post(
            f"{base_url}/api/outlets",
            json={"name": "Test Outlet", "mobile": "+919999999999", "opening_time": "09:00", "closing_time": "22:00"}
        )
        assert response.status_code == 401

    def test_create_and_verify_outlet(self, base_url, api_client, auth_headers):
        """POST /api/outlets with auth should create outlet and verify persistence"""
        outlet_data = {
            "name": "TEST_New Outlet",
            "mobile": "+919876543299",
            "opening_time": "10:00",
            "closing_time": "23:00",
            "description": "Test outlet",
            "address": "Test address",
            "is_reservation_enabled": False
        }
        
        # Create outlet
        response = api_client.post(
            f"{base_url}/api/outlets",
            json=outlet_data,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        created = response.json()
        assert created['name'] == outlet_data['name']
        outlet_id = created['id']
        
        # Verify persistence with GET
        get_response = api_client.get(f"{base_url}/api/outlets/{outlet_id}")
        assert get_response.status_code == 200
        
        fetched = get_response.json()
        assert fetched['name'] == outlet_data['name']
        assert fetched['mobile'] == outlet_data['mobile']

    def test_update_outlet_requires_auth(self, base_url, api_client):
        """PUT /api/outlets/{id} without token should return 401"""
        response = api_client.put(
            f"{base_url}/api/outlets/some-id",
            json={"name": "Updated", "mobile": "+919999999999", "opening_time": "09:00", "closing_time": "22:00"}
        )
        assert response.status_code == 401

    def test_delete_outlet_requires_auth(self, base_url, api_client):
        """DELETE /api/outlets/{id} without token should return 401"""
        response = api_client.delete(f"{base_url}/api/outlets/some-id")
        assert response.status_code == 401


class TestAdminMenuCRUD:
    """Test admin menu CRUD operations"""

    def test_create_menu_requires_auth(self, base_url, api_client):
        """POST /api/menu without token should return 401"""
        response = api_client.post(
            f"{base_url}/api/menu",
            json={"outlet_id": "test", "category": "Test", "name": "Test Item", "price": 100}
        )
        assert response.status_code == 401

    def test_create_and_verify_menu_item(self, base_url, api_client, auth_headers):
        """POST /api/menu with auth should create menu item"""
        # Get an outlet first
        outlets_response = api_client.get(f"{base_url}/api/outlets")
        outlets = outlets_response.json()
        outlet_id = outlets[0]['id']
        
        menu_data = {
            "outlet_id": outlet_id,
            "category": "TEST_Category",
            "name": "TEST_Menu Item",
            "price": 250.0,
            "description": "Test description"
        }
        
        # Create menu item
        response = api_client.post(
            f"{base_url}/api/menu",
            json=menu_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        
        created = response.json()
        assert created['name'] == menu_data['name']
        assert created['price'] == menu_data['price']
        menu_id = created['id']
        
        # Verify persistence
        get_response = api_client.get(f"{base_url}/api/menu?outlet_id={outlet_id}")
        menu_items = get_response.json()
        assert any(item['id'] == menu_id for item in menu_items)

    def test_update_menu_requires_auth(self, base_url, api_client):
        """PUT /api/menu/{id} without token should return 401"""
        response = api_client.put(
            f"{base_url}/api/menu/some-id",
            json={"outlet_id": "test", "category": "Test", "name": "Test", "price": 100}
        )
        assert response.status_code == 401

    def test_delete_menu_requires_auth(self, base_url, api_client):
        """DELETE /api/menu/{id} without token should return 401"""
        response = api_client.delete(f"{base_url}/api/menu/some-id")
        assert response.status_code == 401


class TestAdminOffersCRUD:
    """Test admin offers CRUD operations"""

    def test_create_offer_requires_auth(self, base_url, api_client):
        """POST /api/offers without token should return 401"""
        response = api_client.post(
            f"{base_url}/api/offers",
            json={"title": "Test Offer", "description": "Test"}
        )
        assert response.status_code == 401

    def test_create_and_verify_offer(self, base_url, api_client, auth_headers):
        """POST /api/offers with auth should create offer"""
        offer_data = {
            "title": "TEST_Special Offer",
            "description": "Test offer description",
            "outlet_id": None,  # Global offer
            "is_active": True
        }
        
        # Create offer
        response = api_client.post(
            f"{base_url}/api/offers",
            json=offer_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        
        created = response.json()
        assert created['title'] == offer_data['title']
        offer_id = created['id']
        
        # Verify persistence
        get_response = api_client.get(f"{base_url}/api/offers")
        offers = get_response.json()
        assert any(offer['id'] == offer_id for offer in offers)

    def test_update_offer_requires_auth(self, base_url, api_client):
        """PUT /api/offers/{id} without token should return 401"""
        response = api_client.put(
            f"{base_url}/api/offers/some-id",
            json={"title": "Updated", "description": "Test"}
        )
        assert response.status_code == 401

    def test_delete_offer_requires_auth(self, base_url, api_client):
        """DELETE /api/offers/{id} without token should return 401"""
        response = api_client.delete(f"{base_url}/api/offers/some-id")
        assert response.status_code == 401


class TestReservations:
    """Test reservation endpoints"""

    def test_create_reservation_for_enabled_outlet_succeeds(self, base_url, api_client):
        """POST /api/reservations for outlet with is_reservation_enabled=true should succeed"""
        # Get Gallops Restaurant (has reservations enabled)
        outlets_response = api_client.get(f"{base_url}/api/outlets")
        outlets = outlets_response.json()
        gallops = next((o for o in outlets if o['name'] == 'Gallops Restaurant'), None)
        assert gallops is not None
        
        reservation_data = {
            "outlet_id": gallops['id'],
            "name": "TEST_John Doe",
            "mobile": "+919876543210",
            "date": "2026-05-15",
            "time": "19:30",
            "guests": 4,
            "notes": "Window seat preferred"
        }
        
        response = api_client.post(
            f"{base_url}/api/reservations",
            json=reservation_data
        )
        assert response.status_code == 200, f"Reservation failed: {response.text}"
        
        created = response.json()
        assert created['name'] == reservation_data['name']
        assert created['status'] == 'pending'

    def test_create_reservation_for_disabled_outlet_fails(self, base_url, api_client):
        """POST /api/reservations for outlet with is_reservation_enabled=false should return 400"""
        # Get an outlet without reservations enabled
        outlets_response = api_client.get(f"{base_url}/api/outlets")
        outlets = outlets_response.json()
        non_reservation_outlet = next((o for o in outlets if not o['is_reservation_enabled']), None)
        assert non_reservation_outlet is not None
        
        reservation_data = {
            "outlet_id": non_reservation_outlet['id'],
            "name": "TEST_Jane Doe",
            "mobile": "+919876543211",
            "date": "2026-05-15",
            "time": "19:30",
            "guests": 2
        }
        
        response = api_client.post(
            f"{base_url}/api/reservations",
            json=reservation_data
        )
        assert response.status_code == 400

    def test_list_reservations_requires_auth(self, base_url, api_client):
        """GET /api/reservations without token should return 401"""
        response = api_client.get(f"{base_url}/api/reservations")
        assert response.status_code == 401

    def test_list_reservations_with_auth(self, base_url, api_client, auth_headers):
        """GET /api/reservations with auth should list reservations"""
        response = api_client.get(f"{base_url}/api/reservations", headers=auth_headers)
        assert response.status_code == 200
        
        reservations = response.json()
        assert isinstance(reservations, list)

    def test_list_reservations_with_outlet_filter(self, base_url, api_client, auth_headers):
        """GET /api/reservations?outlet_id=<id> should filter by outlet"""
        outlets_response = api_client.get(f"{base_url}/api/outlets")
        outlets = outlets_response.json()
        gallops = next((o for o in outlets if o['name'] == 'Gallops Restaurant'), None)
        
        response = api_client.get(
            f"{base_url}/api/reservations?outlet_id={gallops['id']}",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        reservations = response.json()
        for res in reservations:
            assert res['outlet_id'] == gallops['id']

    def test_list_reservations_with_date_filter(self, base_url, api_client, auth_headers):
        """GET /api/reservations?date=<date> should filter by date"""
        response = api_client.get(
            f"{base_url}/api/reservations?date=2026-05-15",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        reservations = response.json()
        for res in reservations:
            assert res['date'] == '2026-05-15'

    def test_update_reservation_status_requires_auth(self, base_url, api_client):
        """PUT /api/reservations/{id}/status without token should return 401"""
        response = api_client.put(
            f"{base_url}/api/reservations/some-id/status",
            json={"status": "confirmed"}
        )
        assert response.status_code == 401

    def test_update_reservation_status_with_auth(self, base_url, api_client, auth_headers):
        """PUT /api/reservations/{id}/status with auth should update status"""
        # First create a reservation
        outlets_response = api_client.get(f"{base_url}/api/outlets")
        outlets = outlets_response.json()
        gallops = next((o for o in outlets if o['name'] == 'Gallops Restaurant'), None)
        
        create_response = api_client.post(
            f"{base_url}/api/reservations",
            json={
                "outlet_id": gallops['id'],
                "name": "TEST_Status Update",
                "mobile": "+919876543299",
                "date": "2026-06-01",
                "time": "20:00",
                "guests": 3
            }
        )
        reservation_id = create_response.json()['id']
        
        # Update status
        update_response = api_client.put(
            f"{base_url}/api/reservations/{reservation_id}/status",
            json={"status": "confirmed"},
            headers=auth_headers
        )
        assert update_response.status_code == 200
        
        updated = update_response.json()
        assert updated['status'] == 'confirmed'


class TestCascadeDelete:
    """Test cascade delete functionality"""

    def test_delete_outlet_cascades_menu_and_offers(self, base_url, api_client, auth_headers):
        """DELETE /api/outlets/{id} should remove associated menu items and offers"""
        # Create a test outlet
        outlet_response = api_client.post(
            f"{base_url}/api/outlets",
            json={
                "name": "TEST_Cascade Outlet",
                "mobile": "+919999999999",
                "opening_time": "09:00",
                "closing_time": "22:00"
            },
            headers=auth_headers
        )
        outlet_id = outlet_response.json()['id']
        
        # Create a menu item for this outlet
        menu_response = api_client.post(
            f"{base_url}/api/menu",
            json={
                "outlet_id": outlet_id,
                "category": "TEST_Cat",
                "name": "TEST_Item",
                "price": 100
            },
            headers=auth_headers
        )
        menu_id = menu_response.json()['id']
        
        # Create an offer for this outlet
        offer_response = api_client.post(
            f"{base_url}/api/offers",
            json={
                "title": "TEST_Offer",
                "outlet_id": outlet_id
            },
            headers=auth_headers
        )
        offer_id = offer_response.json()['id']
        
        # Delete the outlet
        delete_response = api_client.delete(
            f"{base_url}/api/outlets/{outlet_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200
        
        # Verify outlet is gone
        get_outlet = api_client.get(f"{base_url}/api/outlets/{outlet_id}")
        assert get_outlet.status_code == 404
        
        # Verify menu item is gone
        menu_list = api_client.get(f"{base_url}/api/menu?outlet_id={outlet_id}")
        menu_items = menu_list.json()
        assert len(menu_items) == 0, "Menu items should be deleted"
        
        # Verify offer is gone (check all offers, filter by outlet_id)
        offers_list = api_client.get(f"{base_url}/api/offers?only_active=false")
        offers = offers_list.json()
        outlet_offers = [o for o in offers if o.get('outlet_id') == outlet_id]
        assert len(outlet_offers) == 0, "Offers should be deleted"

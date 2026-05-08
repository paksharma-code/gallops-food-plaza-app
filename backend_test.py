"""
Backend regression test harness — Session 2026-04-28 Batch C
(bootstrap endpoint, lite=true outlets, GZip middleware, smoke regression).

Run:  python /app/backend_test.py
"""
import json
import gzip
import os
import sys
import time
import requests

BASE_URL = "https://gallops-reserve-dine.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@gallops.com"
ADMIN_PASSWORD = "admin123"

GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
RESET = "\033[0m"

PASS = 0
FAIL = 0
FAILURES: list[str] = []


def check(label: str, cond: bool, detail: str = ""):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  {GREEN}PASS{RESET}  {label}")
    else:
        FAIL += 1
        FAILURES.append(f"{label} :: {detail}")
        print(f"  {RED}FAIL{RESET}  {label}  {detail}")


def header(title):
    print(f"\n{YELLOW}=== {title} ==={RESET}")


def main():
    session = requests.Session()

    # ---------- F: Admin login ----------
    header("F. POST /api/auth/login (admin)")
    r = session.post(f"{BASE_URL}/auth/login",
                     json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
                     timeout=30)
    check("login 200", r.status_code == 200, f"status={r.status_code} body={r.text[:200]}")
    token = None
    if r.status_code == 200:
        j = r.json()
        token = j.get("token")
        check("login returns token", bool(token) and isinstance(token, str) and token.count(".") == 2,
              f"token={token!r}")
    if not token:
        print(f"{RED}Cannot proceed without admin token.{RESET}")
        sys.exit(1)
    auth_headers = {"Authorization": f"Bearer {token}"}

    # ---------- A: GET /api/bootstrap (no auth) ----------
    header("A. GET /api/bootstrap (no auth) — projection check")
    r = session.get(f"{BASE_URL}/bootstrap", timeout=30)
    check("bootstrap 200", r.status_code == 200, f"status={r.status_code}")
    plazas = outlets = offers = []
    if r.status_code == 200:
        j = r.json()
        check("body is dict with plazas/outlets/offers keys",
              isinstance(j, dict) and set(["plazas", "outlets", "offers"]).issubset(j.keys()),
              f"keys={list(j.keys()) if isinstance(j, dict) else type(j)}")
        plazas = j.get("plazas", [])
        outlets = j.get("outlets", [])
        offers = j.get("offers", [])
        check("plazas is list", isinstance(plazas, list))
        check("outlets is list", isinstance(outlets, list))
        check("offers is list", isinstance(offers, list))
        check("len(plazas) > 0", len(plazas) > 0, f"len={len(plazas)}")
        check("len(outlets) > 0", len(outlets) > 0, f"len={len(outlets)}")

        # Lite projection: logo/image2/image3/description MUST be missing
        missing_logo = all("logo" not in o for o in outlets)
        missing_img2 = all("image2" not in o for o in outlets)
        missing_img3 = all("image3" not in o for o in outlets)
        missing_desc = all("description" not in o for o in outlets)
        # find offending outlet for debug
        def _with_field(field):
            for o in outlets:
                if field in o:
                    return o.get("id") or o.get("name")
            return None
        check("bootstrap outlets: NO 'logo'", missing_logo,
              f"sample offender={_with_field('logo')}")
        check("bootstrap outlets: NO 'image2'", missing_img2,
              f"sample offender={_with_field('image2')}")
        check("bootstrap outlets: NO 'image3'", missing_img3,
              f"sample offender={_with_field('image3')}")
        check("bootstrap outlets: NO 'description'", missing_desc,
              f"sample offender={_with_field('description')}")

        required_fields = ["id", "plaza_id", "name", "mobile",
                           "opening_time", "closing_time", "time_slots",
                           "is_reservation_enabled", "is_offers_enabled"]
        missing_map = {}
        for f in required_fields:
            bad = [o.get("id") for o in outlets if f not in o]
            if bad:
                missing_map[f] = bad[:3]
        check("bootstrap outlets: required fields all present", not missing_map,
              f"missing={missing_map}")

        # offers must be active-only
        all_active = all(o.get("is_active") is True for o in offers) if offers else True
        check("bootstrap offers: is_active == true for all",
              all_active, f"non_active_count={sum(1 for o in offers if o.get('is_active') is not True)}")

    # ---------- B: GET /api/outlets?lite=true ----------
    header("B. GET /api/outlets?lite=true")
    r = session.get(f"{BASE_URL}/outlets", params={"lite": "true"}, timeout=30)
    check("outlets?lite=true 200", r.status_code == 200, f"status={r.status_code}")
    lite_outlets = []
    if r.status_code == 200:
        lite_outlets = r.json()
        check("lite outlets is list", isinstance(lite_outlets, list), f"type={type(lite_outlets)}")
        check("lite outlets: NO 'logo'",
              all("logo" not in o for o in lite_outlets))
        check("lite outlets: NO 'image2'",
              all("image2" not in o for o in lite_outlets))
        check("lite outlets: NO 'image3'",
              all("image3" not in o for o in lite_outlets))
        check("lite outlets: NO 'description'",
              all("description" not in o for o in lite_outlets))
        check("lite outlets len > 0", len(lite_outlets) > 0, f"len={len(lite_outlets)}")

    # ---------- C: GET /api/outlets?lite=true&plaza_id={id} ----------
    header("C. GET /api/outlets?lite=true&plaza_id={existing}")
    # pick a plaza id that we know has outlets
    plaza_id_target = None
    if plazas and lite_outlets:
        # find a plaza that has >=1 outlet
        plaza_outlet_ids = {o.get("plaza_id") for o in lite_outlets if o.get("plaza_id")}
        for p in plazas:
            if p.get("id") in plaza_outlet_ids:
                plaza_id_target = p.get("id")
                break
    if plaza_id_target:
        r = session.get(f"{BASE_URL}/outlets",
                        params={"lite": "true", "plaza_id": plaza_id_target},
                        timeout=30)
        check("outlets?lite=true&plaza_id=... 200",
              r.status_code == 200, f"status={r.status_code}")
        if r.status_code == 200:
            filtered = r.json()
            check(f"filter returns >=1 outlet for plaza {plaza_id_target[:8]}",
                  len(filtered) > 0, f"len={len(filtered)}")
            check("all outlets match plaza_id filter",
                  all(o.get("plaza_id") == plaza_id_target for o in filtered),
                  f"mismatches={[o.get('plaza_id') for o in filtered if o.get('plaza_id') != plaza_id_target][:3]}")
            check("filtered outlets: NO 'logo'",
                  all("logo" not in o for o in filtered))
            check("filtered outlets: NO 'description'",
                  all("description" not in o for o in filtered))
    else:
        check("found a plaza with outlets to filter on", False,
              "could not pick a plaza_id target")

    # ---------- D: GET /api/outlets (no lite) — MUST include logo ----------
    header("D. GET /api/outlets (no lite) — full payload includes logo")
    r = session.get(f"{BASE_URL}/outlets", timeout=60)
    check("outlets (no lite) 200", r.status_code == 200, f"status={r.status_code}")
    if r.status_code == 200:
        full = r.json()
        check("full outlets len > 0", len(full) > 0)
        has_logo_key = all("logo" in o for o in full)
        check("all outlets include 'logo' key (even if null/empty)", has_logo_key,
              f"missing sample={[o.get('name') for o in full if 'logo' not in o][:3]}")
        non_null_logo = [o for o in full
                         if o.get("logo") not in (None, "", False)]
        check("at least one outlet has a non-null logo",
              len(non_null_logo) >= 1,
              f"non_null_logo_count={len(non_null_logo)}")
        # also confirm description included in full mode
        has_desc_key = all("description" in o for o in full)
        check("all outlets include 'description' key in full mode",
              has_desc_key)

    # ---------- E: GZip on /api/bootstrap ----------
    header("E. GET /api/bootstrap with Accept-Encoding: gzip")
    # Use a fresh session with stream=True + raw body to inspect Content-Encoding
    # (requests auto-decompresses gzip but exposes the raw header.)
    r = requests.get(f"{BASE_URL}/bootstrap",
                     headers={"Accept-Encoding": "gzip"}, timeout=30)
    check("bootstrap w/gzip 200", r.status_code == 200, f"status={r.status_code}")
    ce = r.headers.get("Content-Encoding", "")
    check("Content-Encoding: gzip header present",
          ce.lower() == "gzip", f"Content-Encoding={ce!r}")
    # r.json() should still work — requests decompresses under the hood
    try:
        j = r.json()
        check("decoded body is valid JSON with plazas/outlets/offers",
              isinstance(j, dict) and {"plazas", "outlets", "offers"}.issubset(j.keys()))
    except Exception as e:
        check("decoded body is valid JSON with plazas/outlets/offers",
              False, f"json parse error: {e}")

    # Also confirm the compressed bytes are actually smaller than uncompressed
    try:
        compressed_len = int(r.headers.get("Content-Length", "0"))
        raw_len = len(r.content)  # requests already decoded it
        # compressed content length (if provided) should be <= raw length
        if compressed_len:
            print(f"  info  Content-Length (compressed) = {compressed_len}, "
                  f"decoded len = {raw_len}")
    except Exception:
        pass

    # ---------- G: smoke regression on prior endpoints ----------
    header("G. Smoke regression")
    smoke_specs = [
        ("GET /plazas", "GET", f"{BASE_URL}/plazas", {}, None),
        ("GET /offers", "GET", f"{BASE_URL}/offers", {}, None),
        ("GET /menu", "GET", f"{BASE_URL}/menu", {}, None),
        ("GET /admin/analytics", "GET", f"{BASE_URL}/admin/analytics", auth_headers, None),
        ("GET /admin/feedback", "GET", f"{BASE_URL}/admin/feedback", auth_headers, None),
        ("GET /admin/notify-requests", "GET", f"{BASE_URL}/admin/notify-requests",
         auth_headers, None),
        ("GET /admin/offer-claims", "GET", f"{BASE_URL}/admin/offer-claims", auth_headers, None),
        ("GET /admin/offer-claims/export", "GET",
         f"{BASE_URL}/admin/offer-claims/export", auth_headers, None),
    ]
    for label, method, url, headers, body in smoke_specs:
        r = requests.request(method, url, headers=headers, json=body, timeout=60)
        check(f"{label} 200", r.status_code == 200, f"status={r.status_code} body={r.text[:200]}")
        if label.endswith("export"):
            ct = r.headers.get("Content-Type", "")
            check("export content-type is xlsx",
                  "spreadsheetml.sheet" in ct, f"ct={ct}")

    # ---------- H: one-mobile-per-day guard ----------
    header("H. POST /api/offer-claims one-mobile-per-day soft guard (9812345670)")
    # first call
    r1 = requests.post(f"{BASE_URL}/offer-claims",
                       json={"name": "Ramesh Patel", "mobile": "9812345670"},
                       timeout=30)
    check("first claim 200", r1.status_code == 200,
          f"status={r1.status_code} body={r1.text[:200]}")
    claim1 = r1.json() if r1.status_code == 200 else {}
    first_token = claim1.get("token", "")
    first_id = claim1.get("id", "")
    check("first claim has 8-char token", len(first_token) == 8, f"token={first_token}")
    check("first claim already_claimed not true",
          not claim1.get("already_claimed"), f"val={claim1.get('already_claimed')}")

    # second call same mobile
    r2 = requests.post(f"{BASE_URL}/offer-claims",
                       json={"name": "Ramesh P", "mobile": "9812345670"},
                       timeout=30)
    check("second claim 200", r2.status_code == 200, f"status={r2.status_code}")
    claim2 = r2.json() if r2.status_code == 200 else {}
    check("second claim already_claimed == true",
          claim2.get("already_claimed") is True, f"val={claim2.get('already_claimed')}")
    check("second claim token == first token",
          claim2.get("token") == first_token,
          f"t1={first_token} t2={claim2.get('token')}")
    check("second claim id == first id",
          claim2.get("id") == first_id, f"id1={first_id} id2={claim2.get('id')}")

    # cleanup
    if first_id:
        rd = requests.delete(f"{BASE_URL}/admin/offer-claims/{first_id}",
                             headers=auth_headers, timeout=30)
        check("cleanup: DELETE throwaway claim 200",
              rd.status_code == 200, f"status={rd.status_code}")

    # ---------- I: Image fields — PUT with image2/image3 set then null ----------
    header("I. PUT /api/plazas/{id} image2/image3 round-trip")
    plist = requests.get(f"{BASE_URL}/plazas", timeout=30).json()
    if not plist:
        check("at least one plaza exists", False, "empty plaza list")
    else:
        # Pick one (prefer a Chavan or any — keep original payload)
        target = plist[0]
        pid = target["id"]
        original_image2 = target.get("image2")
        original_image3 = target.get("image3")
        print(f"  using plaza {target.get('name')} ({pid[:8]}), "
              f"original image2={original_image2!r} image3={original_image3!r}")

        def build_put_body(plaza_doc, image2, image3):
            # PlazaCreate fields only
            keep = ["name", "city", "status", "is_head_office", "description",
                    "address", "image", "gallery", "google_maps_url",
                    "contact_phone", "whatsapp_number", "expected_opening",
                    "order_index", "is_offers_enabled"]
            body = {k: plaza_doc.get(k) for k in keep if k in plaza_doc}
            body["image2"] = image2
            body["image3"] = image3
            return body

        test_img2 = "https://example.com/qa-img2.jpg"
        test_img3 = "https://example.com/qa-img3.jpg"

        # SET
        body = build_put_body(target, test_img2, test_img3)
        r = requests.put(f"{BASE_URL}/plazas/{pid}",
                         headers=auth_headers, json=body, timeout=30)
        check("PUT plaza image2/image3 200", r.status_code == 200,
              f"status={r.status_code} body={r.text[:200]}")
        if r.status_code == 200:
            echoed = r.json()
            check("response echoes image2", echoed.get("image2") == test_img2,
                  f"got={echoed.get('image2')}")
            check("response echoes image3", echoed.get("image3") == test_img3,
                  f"got={echoed.get('image3')}")

        # GET re-read
        g = requests.get(f"{BASE_URL}/plazas/{pid}", timeout=30)
        check("GET plaza 200", g.status_code == 200)
        if g.status_code == 200:
            back = g.json()
            check("GET image2 persisted", back.get("image2") == test_img2,
                  f"got={back.get('image2')}")
            check("GET image3 persisted", back.get("image3") == test_img3,
                  f"got={back.get('image3')}")

        # Now set to null
        body_null = build_put_body(target, None, None)
        r = requests.put(f"{BASE_URL}/plazas/{pid}",
                         headers=auth_headers, json=body_null, timeout=30)
        check("PUT plaza image2=null/image3=null 200", r.status_code == 200,
              f"status={r.status_code}")
        g = requests.get(f"{BASE_URL}/plazas/{pid}", timeout=30)
        if g.status_code == 200:
            back = g.json()
            check("GET image2 is None after null PUT",
                  back.get("image2") is None, f"got={back.get('image2')}")
            check("GET image3 is None after null PUT",
                  back.get("image3") is None, f"got={back.get('image3')}")

        # Restore original
        body_restore = build_put_body(target, original_image2, original_image3)
        r = requests.put(f"{BASE_URL}/plazas/{pid}",
                         headers=auth_headers, json=body_restore, timeout=30)
        check("PUT plaza RESTORE original payload 200",
              r.status_code == 200, f"status={r.status_code}")

    # ---------- Summary ----------
    print("")
    print(f"{YELLOW}============================================={RESET}")
    print(f"TOTAL: {PASS+FAIL}  {GREEN}PASS={PASS}{RESET}  {RED}FAIL={FAIL}{RESET}")
    print(f"{YELLOW}============================================={RESET}")
    if FAILURES:
        print(f"\n{RED}FAILURES:{RESET}")
        for f in FAILURES:
            print(f"  - {f}")
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()

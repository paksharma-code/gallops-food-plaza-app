"""Quick re-test of the brand-priority sort fix.

Targets: https://gallops-reserve-dine.preview.emergentagent.com/api
Fix verified: `(o.get("created_at") or "")` -> `str(o.get("created_at") or "")`
in _sorted_outlets, which previously crashed with TypeError when sorting
mixed datetime/str created_at values across the global outlets collection.
"""

from __future__ import annotations

import re
import sys
import requests

BASE = "https://gallops-reserve-dine.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@gallops.com"
ADMIN_PASSWORD = "gfp@1234"

PASS = "\033[92mPASS\033[0m"
FAIL = "\033[91mFAIL\033[0m"
RESULTS: list[tuple[bool, str]] = []


def expect(cond: bool, label: str) -> bool:
    RESULTS.append((cond, label))
    print(f"  [{PASS if cond else FAIL}] {label}")
    return cond


# ----- helpers --------------------------------------------------------------

PRIORITY_REGEX = [
    ("Gallops Restaurant", re.compile(r"\bgallops\b.*\brestaurant\b|\brestaurant\b.*\bgallops\b|^gallops$")),
    ("Domino's", re.compile(r"\bdomino")),
    ("Subway", re.compile(r"\bsubway\b")),
    ("La Pino'z Pizza", re.compile(r"\blapinoz\b|\bla\s*pino")),
    ("Lord Petrick", re.compile(r"\blord\s*petrick\b")),
    ("MMC", re.compile(r"\bmmc\b")),
]


def brand_idx(name: str) -> int:
    n = re.sub(r"\s+", " ", (name or "").strip().lower())
    for i, (_label, pat) in enumerate(PRIORITY_REGEX):
        if pat.search(n):
            return i
    return len(PRIORITY_REGEX) + 100


def assert_brand_priority_order(outlets: list[dict], label: str) -> None:
    """Verify outlets are sorted by brand priority then alphabetical."""
    if not outlets:
        expect(False, f"{label}: empty outlets list")
        return
    keys = [(brand_idx(o.get("name", "")), (o.get("name") or "").strip().lower())
            for o in outlets]
    sorted_keys = sorted(keys)
    ok = keys == sorted_keys
    if not ok:
        # find first mismatch
        for i, (k, sk) in enumerate(zip(keys, sorted_keys)):
            if k != sk:
                print(f"      Mismatch at index {i}: got {keys[i]} expected {sorted_keys[i]}")
                break
    expect(ok, f"{label}: brand-priority order")


# ----- A. /api/bootstrap ----------------------------------------------------

def test_bootstrap():
    print("\n=== A. GET /api/bootstrap ===")
    r = requests.get(f"{BASE}/bootstrap", timeout=30)
    expect(r.status_code == 200, f"GET /api/bootstrap returns 200 (got {r.status_code})")
    if r.status_code != 200:
        print(f"      Body: {r.text[:500]}")
        return
    body = r.json()
    expect(isinstance(body, dict), "Response is a dict")
    for key in ("plazas", "outlets", "offers"):
        expect(key in body, f"Response has key '{key}'")

    plazas = body.get("plazas", [])
    outlets = body.get("outlets", [])
    offers = body.get("offers", [])
    print(f"      plazas={len(plazas)} outlets={len(outlets)} offers={len(offers)}")

    # Lite check: heavy fields stripped
    heavy = ("logo", "image2", "image3", "description")
    bad = [o for o in outlets if any(k in o for k in heavy)]
    expect(len(bad) == 0,
           f"All outlets stripped of logo/image2/image3/description ({len(bad)} bad)")

    # Active offers only
    inactive = [o for o in offers if not o.get("is_active", False)]
    expect(len(inactive) == 0, f"All offers are is_active=true ({len(inactive)} inactive)")

    # Group outlets by plaza_id and verify per-plaza brand priority
    from collections import defaultdict
    by_plaza: dict[str, list[dict]] = defaultdict(list)
    for o in outlets:
        by_plaza[o.get("plaza_id", "")].append(o)

    print(f"      Verifying per-plaza brand-priority order across {len(by_plaza)} plazas...")
    all_ok = True
    bad_plazas = []
    for pid, lst in by_plaza.items():
        keys = [(brand_idx(o.get("name", "")), (o.get("name") or "").strip().lower())
                for o in lst]
        if keys != sorted(keys):
            all_ok = False
            bad_plazas.append((pid, lst[0].get("name", ""), [o.get("name") for o in lst[:5]]))
    expect(all_ok, f"Every plaza's outlets follow brand-priority order")
    if bad_plazas:
        for pid, first_name, names in bad_plazas[:3]:
            print(f"      [BAD plaza_id={pid}] first-5 names={names}")


# ----- B. /api/outlets?lite=true (no plaza_id) ------------------------------

def test_outlets_lite_global():
    print("\n=== B. GET /api/outlets?lite=true (no plaza_id) ===")
    r = requests.get(f"{BASE}/outlets", params={"lite": "true"}, timeout=30)
    expect(r.status_code == 200, f"GET /api/outlets?lite=true returns 200 (got {r.status_code})")
    if r.status_code != 200:
        print(f"      Body: {r.text[:500]}")
        return
    outlets = r.json()
    expect(isinstance(outlets, list), "Response is a list")
    print(f"      total outlets: {len(outlets)}")

    # Lite check
    heavy = ("logo", "image2", "image3", "description")
    bad = [o for o in outlets if any(k in o for k in heavy)]
    expect(len(bad) == 0, f"Lite mode strips heavy fields ({len(bad)} bad)")

    # Per-plaza brand priority
    from collections import defaultdict
    by_plaza: dict[str, list[dict]] = defaultdict(list)
    for o in outlets:
        by_plaza[o.get("plaza_id", "")].append(o)
    all_ok = True
    bad_plazas = []
    for pid, lst in by_plaza.items():
        keys = [(brand_idx(o.get("name", "")), (o.get("name") or "").strip().lower())
                for o in lst]
        if keys != sorted(keys):
            all_ok = False
            bad_plazas.append((pid, [o.get("name") for o in lst[:5]]))
    expect(all_ok, "Every plaza's outlets follow brand-priority order")
    if bad_plazas:
        for pid, names in bad_plazas[:3]:
            print(f"      [BAD plaza_id={pid}] first-5 names={names}")


# ----- C. Smoke confirmations -----------------------------------------------

def test_smoke_fedra():
    print("\n=== C1. /api/outlets?lite=true&plaza_id=<Fedra> first-5 ===")
    pr = requests.get(f"{BASE}/plazas", timeout=30)
    expect(pr.status_code == 200, "GET /api/plazas 200")
    if pr.status_code != 200:
        return
    plazas = pr.json()
    fedra = next((p for p in plazas if "fedra" in (p.get("name") or "").lower()), None)
    if not fedra:
        expect(False, "Fedra plaza found")
        return
    fid = fedra["id"]
    r = requests.get(f"{BASE}/outlets", params={"lite": "true", "plaza_id": fid}, timeout=30)
    expect(r.status_code == 200, f"GET ?lite=true&plaza_id=Fedra 200 (got {r.status_code})")
    if r.status_code != 200:
        return
    outlets = r.json()
    names = [o.get("name", "") for o in outlets]
    print(f"      Fedra outlets ({len(names)}); first 5: {names[:5]}")
    expected_brands = ["gallops restaurant", "domino", "subway", "lapinoz|la pino", "lord petrick"]
    actual_lower = [n.lower() for n in names[:5]]
    ok = (
        re.search(r"gallops", actual_lower[0]) and "restaurant" in actual_lower[0]
        and "domino" in actual_lower[1]
        and "subway" in actual_lower[2]
        and (re.search(r"lapinoz|la\s*pino", actual_lower[3]) is not None)
        and "lord petrick" in actual_lower[4]
    )
    expect(bool(ok), "Fedra first-5 = Gallops, Domino's, Subway, La Pino'z, Lord Petrick")


def test_admin_login() -> str | None:
    print("\n=== C2. POST /api/auth/login ===")
    r = requests.post(
        f"{BASE}/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=30,
    )
    expect(r.status_code == 200, f"Login admin@gallops.com / gfp@1234 (got {r.status_code})")
    if r.status_code != 200:
        print(f"      Body: {r.text[:300]}")
        return None
    body = r.json()
    token = body.get("access_token") or body.get("token")
    parts = (token or "").split(".")
    expect(bool(token) and len(parts) == 3, f"3-part JWT returned ({len(parts)} parts)")
    return token


def test_one_mobile_per_day(token: str | None):
    print("\n=== C3. one-mobile-per-day soft guard ===")
    test_mobile = "9876541230"
    cleanup_ids: list[str] = []
    try:
        r1 = requests.post(
            f"{BASE}/offer-claims",
            json={"name": "Anjali Sharma", "mobile": test_mobile},
            timeout=30,
        )
        expect(r1.status_code == 200, f"1st POST /offer-claims (got {r1.status_code})")
        if r1.status_code != 200:
            print(f"      Body: {r1.text[:300]}")
            return
        c1 = r1.json()
        token1 = c1.get("token")
        id1 = c1.get("id")
        cleanup_ids.append(id1)
        expect(bool(token1) and len(token1) == 8, f"1st token 8-char (got {token1!r})")
        expect(c1.get("already_claimed") is not True, "1st already_claimed not true")

        r2 = requests.post(
            f"{BASE}/offer-claims",
            json={"name": "Anjali Sharma", "mobile": test_mobile},
            timeout=30,
        )
        expect(r2.status_code == 200, f"2nd POST /offer-claims (got {r2.status_code})")
        if r2.status_code == 200:
            c2 = r2.json()
            expect(c2.get("token") == token1, f"2nd token == 1st token ({c2.get('token')} vs {token1})")
            expect(c2.get("id") == id1, "2nd id == 1st id")
            expect(c2.get("already_claimed") is True, "already_claimed=true on 2nd call")
            expect(c2.get("routed_tier") == "existing", f"routed_tier='existing' (got {c2.get('routed_tier')!r})")
            expect(bool(c2.get("whatsapp_link")), "whatsapp_link rebuilt non-empty")
    finally:
        if token:
            for cid in cleanup_ids:
                if not cid:
                    continue
                d = requests.delete(
                    f"{BASE}/admin/offer-claims/{cid}",
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=30,
                )
                if d.status_code == 200:
                    print(f"      Cleanup: deleted claim {cid}")
                else:
                    print(f"      Cleanup WARN: delete {cid} -> {d.status_code}")


def test_privacy_terms():
    print("\n=== C4. /api/privacy + /api/terms ===")
    for path in ("/privacy", "/terms"):
        r = requests.get(f"{BASE}{path}", timeout=30)
        expect(r.status_code == 200, f"GET {path} 200 (got {r.status_code})")
        ct = r.headers.get("content-type", "")
        expect("text/html" in ct.lower(), f"{path} Content-Type text/html (got {ct})")


# ----- main -----------------------------------------------------------------

def main():
    print(f"\nTarget: {BASE}\n")
    test_bootstrap()
    test_outlets_lite_global()
    test_smoke_fedra()
    token = test_admin_login()
    test_one_mobile_per_day(token)
    test_privacy_terms()

    total = len(RESULTS)
    passed = sum(1 for ok, _ in RESULTS if ok)
    failed = total - passed
    print("\n" + "=" * 60)
    print(f"  RESULT: {passed}/{total} PASS, {failed} FAIL")
    print("=" * 60)
    if failed:
        print("\nFailed assertions:")
        for ok, label in RESULTS:
            if not ok:
                print(f"  - {label}")
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()

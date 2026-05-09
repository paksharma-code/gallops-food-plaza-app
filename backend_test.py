"""
Backend regression for Gallops Food Plaza — brand-priority outlet sort.

Target API base: derived from /app/frontend/.env (EXPO_PUBLIC_BACKEND_URL) + /api.
"""
import os
import re
import sys
import json
import time
import requests

# --- Resolve API base from frontend/.env (production URL) ---------------------
def _api_base() -> str:
    env_path = "/app/frontend/.env"
    base = None
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
                base = line.split("=", 1)[1].strip().strip('"').strip("'")
                break
    assert base, "EXPO_PUBLIC_BACKEND_URL not set in /app/frontend/.env"
    return base.rstrip("/") + "/api"


API = _api_base()
print(f"API base: {API}")

ADMIN_EMAIL = "admin@gallops.com"
ADMIN_PASSWORD = "gfp@1234"

results = []  # list of (label, ok, detail)


def record(label: str, ok: bool, detail: str = ""):
    status = "PASS" if ok else "FAIL"
    print(f"[{status}] {label}" + (f" — {detail}" if detail else ""))
    results.append((label, ok, detail))


def expect(label: str, cond: bool, detail: str = ""):
    record(label, bool(cond), detail)
    return bool(cond)


# --- Auth (used by H + cleanup) ----------------------------------------------
def login_admin() -> str:
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    expect("H1: POST /auth/login admin@gallops.com / gfp@1234 → 200",
           r.status_code == 200, f"status={r.status_code} body={r.text[:200]}")
    if r.status_code != 200:
        return ""
    body = r.json()
    token = body.get("token") or body.get("access_token") or ""
    expect("H1b: login response includes a token (3-part JWT)",
           bool(token) and token.count(".") == 2,
           f"token_present={bool(token)} parts={token.count('.') if token else 0}")
    return token


# --- Helpers ------------------------------------------------------------------
PRIORITY_LABELS = ["Gallops Restaurant", "Domino's", "Subway", "La Pino'z Pizza", "Lord Petrick", "MMC"]
PRIORITY_PATTERNS = [
    (r"^gallops\s+restaurant$|^gallops$", "Gallops Restaurant"),
    (r"^domino[s'\u2019z]*\b", "Domino's"),
    (r"^subway\b", "Subway"),
    (r"^la\s*pino[\u2019'z]*\b|^lapino[\u2019'z]*\b", "La Pino'z Pizza"),
    (r"^lord\s+petrick\b", "Lord Petrick"),
    (r"^mmc\b", "MMC"),
]


def brand_priority_index(name: str) -> int:
    n = re.sub(r"\s+", " ", (name or "").strip().lower())
    for idx, (pat, _label) in enumerate(PRIORITY_PATTERNS):
        if re.search(pat, n, re.IGNORECASE):
            return idx
    return len(PRIORITY_PATTERNS) + 100


def assert_priority_then_alpha(label_prefix: str, names: list[str]) -> bool:
    """Verify that priority brands appear in correct relative order at the
    start (whichever priority brands are present) and the rest is sorted
    case-insensitive alphabetically."""
    prio_indices = [brand_priority_index(n) for n in names]
    # Priority brands should form a non-decreasing prefix
    last_p = -1
    transition_at = None
    for i, p in enumerate(prio_indices):
        if p < len(PRIORITY_PATTERNS):
            if p < last_p:
                expect(f"{label_prefix}: priority order non-decreasing at idx {i}", False,
                       f"name='{names[i]}' p={p} prev={last_p} all={names}")
                return False
            last_p = p
        else:
            transition_at = i
            break
    # After transition, every entry must be non-priority and alphabetical
    if transition_at is not None:
        rest = names[transition_at:]
        for r in rest:
            if brand_priority_index(r) < len(PRIORITY_PATTERNS):
                expect(f"{label_prefix}: priority brand appears AFTER non-priority", False,
                       f"name='{r}' rest={rest}")
                return False
        rest_lower = [n.lower() for n in rest]
        if rest_lower != sorted(rest_lower):
            expect(f"{label_prefix}: tail is alphabetical (case-insensitive)", False,
                   f"got={rest_lower} expected={sorted(rest_lower)}")
            return False
    return True


# --- Fetch plazas once --------------------------------------------------------
plazas_resp = requests.get(f"{API}/plazas", timeout=30)
expect("Setup: GET /plazas 200", plazas_resp.status_code == 200, f"status={plazas_resp.status_code}")
plazas = plazas_resp.json() if plazas_resp.status_code == 200 else []
plazas_by_id = {p["id"]: p for p in plazas}
plazas_by_name = {p["name"]: p for p in plazas}

FEDRA_ID = "4722073e-e775-47cd-8b78-fcb749ef1f8e"
LIMBDI_ID = "51114145-d24b-47de-b74d-ac7505764577"
MAHUVA_ID = "ee40ae35-aaae-480b-8c27-094f1440b6b6"
TANSA_ID = (plazas_by_name.get("Tansa") or {}).get("id")
ANAND_ID = (plazas_by_name.get("Anand") or {}).get("id")

print(f"\nPlazas resolved: Fedra={FEDRA_ID}, Limbdi={LIMBDI_ID}, Mahuva={MAHUVA_ID}, Tansa={TANSA_ID}, Anand={ANAND_ID}")
print(f"Plaza names found: {sorted([p['name'] for p in plazas])}\n")


# --- A. Fedra plaza (lite) ---------------------------------------------------
print("=" * 60)
print("A. Fedra plaza (lite=true)")
r = requests.get(f"{API}/outlets", params={"lite": "true", "plaza_id": FEDRA_ID}, timeout=30)
expect("A1: GET /outlets?lite=true&plaza_id=Fedra → 200", r.status_code == 200, f"status={r.status_code}")
fedra = r.json() if r.status_code == 200 else []
fedra_names = [o.get("name", "") for o in fedra]
print(f"   Fedra outlet names ({len(fedra_names)}): {fedra_names}")

if len(fedra_names) >= 5:
    first5 = fedra_names[:5]
    expect("A2: Fedra[0] == 'Gallops Restaurant'", first5[0] == "Gallops Restaurant", f"got='{first5[0]}'")
    # Variant Domino's: "Dominoz" expected
    expect("A3: Fedra[1] is a Domino's variant", brand_priority_index(first5[1]) == 1, f"got='{first5[1]}'")
    expect("A4: Fedra[2] == 'Subway'", brand_priority_index(first5[2]) == 2, f"got='{first5[2]}'")
    expect("A5: Fedra[3] is a La Pino'z variant", brand_priority_index(first5[3]) == 3, f"got='{first5[3]}'")
    expect("A6: Fedra[4] == 'Lord Petrick'", brand_priority_index(first5[4]) == 4, f"got='{first5[4]}'")
else:
    expect("A2-6: Fedra has at least 5 outlets", False, f"got={len(fedra_names)}")

# A7: tail alphabetical & priority prefix correct
assert_priority_then_alpha("A7 Fedra", fedra_names)


# --- B. Limbdi plaza (lite) --------------------------------------------------
print("=" * 60)
print("B. Limbdi plaza (lite=true)")
r = requests.get(f"{API}/outlets", params={"lite": "true", "plaza_id": LIMBDI_ID}, timeout=30)
expect("B1: GET /outlets?lite=true&plaza_id=Limbdi → 200", r.status_code == 200, f"status={r.status_code}")
limbdi = r.json() if r.status_code == 200 else []
limbdi_names = [o.get("name", "") for o in limbdi]
print(f"   Limbdi outlet names ({len(limbdi_names)}): {limbdi_names}")

if len(limbdi_names) >= 3:
    expect("B2: Limbdi[0] == 'Gallops Restaurant'", limbdi_names[0] == "Gallops Restaurant", f"got='{limbdi_names[0]}'")
    expect("B3: Limbdi[1] is a Domino's variant", brand_priority_index(limbdi_names[1]) == 1, f"got='{limbdi_names[1]}'")
    expect("B4: Limbdi[2] is a La Pino'z variant", brand_priority_index(limbdi_names[2]) == 3, f"got='{limbdi_names[2]}'")
else:
    expect("B2-4: Limbdi has at least 3 outlets", False, f"got={len(limbdi_names)}")

assert_priority_then_alpha("B5 Limbdi", limbdi_names)


# --- C. Mahuva plaza ---------------------------------------------------------
print("=" * 60)
print("C. Mahuva plaza (single-outlet)")
r = requests.get(f"{API}/outlets", params={"lite": "true", "plaza_id": MAHUVA_ID}, timeout=30)
expect("C1: GET /outlets?lite=true&plaza_id=Mahuva → 200", r.status_code == 200, f"status={r.status_code}")
mahuva = r.json() if r.status_code == 200 else []
mahuva_names = [o.get("name", "") for o in mahuva]
print(f"   Mahuva outlet names ({len(mahuva_names)}): {mahuva_names}")
expect("C2: Mahuva has exactly one outlet", len(mahuva_names) == 1, f"got={len(mahuva_names)}")
expect("C3: Mahuva outlet is 'Gallops Restaurant'",
       len(mahuva_names) == 1 and mahuva_names[0] == "Gallops Restaurant",
       f"names={mahuva_names}")


# --- D. Tansa plaza ----------------------------------------------------------
print("=" * 60)
print("D. Tansa plaza")
if not TANSA_ID:
    expect("D1: Tansa plaza found via /api/plazas", False, "no plaza named 'Tansa' in response")
else:
    r = requests.get(f"{API}/outlets", params={"lite": "true", "plaza_id": TANSA_ID}, timeout=30)
    expect("D1: GET /outlets?lite=true&plaza_id=Tansa → 200", r.status_code == 200, f"status={r.status_code}")
    tansa = r.json() if r.status_code == 200 else []
    tansa_names = [o.get("name", "") for o in tansa]
    print(f"   Tansa outlet names ({len(tansa_names)}): {tansa_names}")
    if len(tansa_names) >= 2:
        expect("D2: Tansa[0] == 'Gallops Restaurant'", tansa_names[0] == "Gallops Restaurant", f"got='{tansa_names[0]}'")
        expect("D3: Tansa[1] is a La Pino'z variant", brand_priority_index(tansa_names[1]) == 3, f"got='{tansa_names[1]}'")
    else:
        expect("D2-3: Tansa has at least 2 outlets", False, f"got={len(tansa_names)}")
    assert_priority_then_alpha("D4 Tansa", tansa_names)


# --- E. Anand plaza ----------------------------------------------------------
print("=" * 60)
print("E. Anand plaza")
if not ANAND_ID:
    expect("E1: Anand plaza found via /api/plazas", False, "no plaza named 'Anand' in response")
else:
    r = requests.get(f"{API}/outlets", params={"lite": "true", "plaza_id": ANAND_ID}, timeout=30)
    expect("E1: GET /outlets?lite=true&plaza_id=Anand → 200", r.status_code == 200, f"status={r.status_code}")
    anand = r.json() if r.status_code == 200 else []
    anand_names = [o.get("name", "") for o in anand]
    print(f"   Anand outlet names ({len(anand_names)}): {anand_names}")
    if anand_names:
        expect("E2: Anand[0] == 'Gallops Restaurant'", anand_names[0] == "Gallops Restaurant", f"got='{anand_names[0]}'")
    # Only priority brand should be Gallops Restaurant
    other_priority = [n for n in anand_names[1:] if brand_priority_index(n) < len(PRIORITY_PATTERNS)]
    expect("E3: No other priority brand present in Anand", len(other_priority) == 0, f"others={other_priority}")
    # Tail alphabetical
    tail = anand_names[1:] if anand_names else []
    tail_lower = [n.lower() for n in tail]
    expect("E4: Anand tail is alphabetical (case-insensitive)",
           tail_lower == sorted(tail_lower), f"got={tail_lower} expected={sorted(tail_lower)}")


# --- F. Full mode (no lite) on Limbdi ----------------------------------------
print("=" * 60)
print("F. Full mode on Limbdi")
r = requests.get(f"{API}/outlets", params={"plaza_id": LIMBDI_ID}, timeout=60)
expect("F1: GET /outlets?plaza_id=Limbdi (full) → 200", r.status_code == 200, f"status={r.status_code}")
full_limbdi = r.json() if r.status_code == 200 else []
full_names = [o.get("name", "") for o in full_limbdi]
print(f"   Full Limbdi names ({len(full_names)}): {full_names}")

if len(full_names) >= 3:
    expect("F2: Full Limbdi[0] == 'Gallops Restaurant'", full_names[0] == "Gallops Restaurant", f"got='{full_names[0]}'")
    expect("F3: Full Limbdi[1] is Domino's", brand_priority_index(full_names[1]) == 1, f"got='{full_names[1]}'")
    expect("F4: Full Limbdi[2] is La Pino'z", brand_priority_index(full_names[2]) == 3, f"got='{full_names[2]}'")
assert_priority_then_alpha("F5 Full Limbdi", full_names)

# F6: full mode includes logo/image2/image3/description keys
if full_limbdi:
    sample = full_limbdi[0]
    keys_present = [k for k in ("logo", "image2", "image3", "description") if k in sample]
    expect("F6: Full-mode outlet includes logo/image2/image3/description keys",
           set(keys_present) == {"logo", "image2", "image3", "description"},
           f"present={keys_present} sample_keys={sorted(sample.keys())}")
    # Verify on every outlet, not just the first
    all_have = all(all(k in o for k in ("logo", "image2", "image3", "description")) for o in full_limbdi)
    expect("F7: Every full-mode Limbdi outlet has logo/image2/image3/description keys",
           all_have, f"missing on at least one outlet" if not all_have else "")


# --- G. Bootstrap ------------------------------------------------------------
print("=" * 60)
print("G. Bootstrap brand-priority sort")
r = requests.get(f"{API}/bootstrap", timeout=60)
expect("G1: GET /bootstrap → 200", r.status_code == 200, f"status={r.status_code}")
boot = r.json() if r.status_code == 200 else {}
boot_outlets = boot.get("outlets", [])
expect("G2: Bootstrap has outlets array", isinstance(boot_outlets, list) and len(boot_outlets) > 0,
       f"len={len(boot_outlets) if isinstance(boot_outlets, list) else 'n/a'}")

# Per-plaza ordering check
groups = {}
for o in boot_outlets:
    groups.setdefault(o.get("plaza_id"), []).append(o.get("name", ""))

# Each plaza's outlets must be in priority->alphabetical order WITHIN the global stream
# But globally sorted means: across all outlets in the array, they are in (priority, name) order.
# Stronger: verify each plaza group is brand-sorted internally.
all_groups_ok = True
for pid, names in groups.items():
    if pid is None:
        continue
    # The order is the order in the bootstrap response; we just check internal ordering.
    if not assert_priority_then_alpha(f"G3 plaza={pid[:8]}", names):
        all_groups_ok = False
expect("G3 (overall): Every plaza in /bootstrap is brand-sorted internally", all_groups_ok)

# Lite check: verify Bootstrap outlets do NOT contain logo/image2/image3/description
heavy_present = []
for o in boot_outlets:
    for k in ("logo", "image2", "image3", "description"):
        if k in o:
            heavy_present.append((o.get("id"), k))
            break
expect("G4: Bootstrap outlets are LITE (no logo/image2/image3/description keys)",
       len(heavy_present) == 0, f"violations={heavy_present[:5]}")


# --- H. Smoke regression -----------------------------------------------------
print("=" * 60)
print("H. Smoke regression")
token = login_admin()
auth_headers = {"Authorization": f"Bearer {token}"} if token else {}

# H2: privacy
r = requests.get(f"{API}/privacy", timeout=30)
ctype = r.headers.get("content-type", "")
expect("H2: GET /privacy → 200 + HTML",
       r.status_code == 200 and ("text/html" in ctype or r.text.lstrip().lower().startswith("<!doctype") or "<html" in r.text.lower()),
       f"status={r.status_code} ctype={ctype}")

# H3: terms
r = requests.get(f"{API}/terms", timeout=30)
ctype = r.headers.get("content-type", "")
expect("H3: GET /terms → 200 + HTML",
       r.status_code == 200 and ("text/html" in ctype or r.text.lstrip().lower().startswith("<!doctype") or "<html" in r.text.lower()),
       f"status={r.status_code} ctype={ctype}")

# H4: xlsx export
if token:
    r = requests.get(f"{API}/admin/offer-claims/export", headers=auth_headers, timeout=60)
    ctype = r.headers.get("content-type", "")
    expect("H4: GET /admin/offer-claims/export with admin auth → 200",
           r.status_code == 200, f"status={r.status_code}")
    expect("H4b: xlsx Content-Type",
           "spreadsheetml.sheet" in ctype or "officedocument" in ctype,
           f"ctype={ctype}")

# H5: one-mobile-per-day soft guard on /offer-claims (cleanup after)
test_mobile = "9812340099"
created_ids = []
try:
    payload = {"name": "QA Smoke Tester", "mobile": test_mobile}
    r1 = requests.post(f"{API}/offer-claims", json=payload, timeout=30)
    expect("H5a: POST /offer-claims first call → 200",
           r1.status_code == 200, f"status={r1.status_code} body={r1.text[:200]}")
    body1 = r1.json() if r1.status_code == 200 else {}
    token1 = body1.get("token")
    id1 = body1.get("id")
    if id1:
        created_ids.append(id1)
    expect("H5b: First claim returns 8-char token, no already_claimed flag",
           bool(token1) and len(token1) == 8 and not body1.get("already_claimed"),
           f"token={token1} already_claimed={body1.get('already_claimed')}")

    # Retry same mobile
    r2 = requests.post(f"{API}/offer-claims", json=payload, timeout=30)
    expect("H5c: POST /offer-claims same mobile (retry) → 200",
           r2.status_code == 200, f"status={r2.status_code}")
    body2 = r2.json() if r2.status_code == 200 else {}
    token2 = body2.get("token")
    id2 = body2.get("id")
    expect("H5d: Soft guard returns SAME token + already_claimed=true",
           token2 == token1 and id2 == id1 and body2.get("already_claimed") is True,
           f"token1={token1} token2={token2} same_id={id1==id2} already={body2.get('already_claimed')}")
finally:
    # Cleanup: delete created claim(s)
    if token and created_ids:
        for cid in set(created_ids):
            dr = requests.delete(f"{API}/admin/offer-claims/{cid}", headers=auth_headers, timeout=30)
            print(f"   Cleanup DELETE /admin/offer-claims/{cid} → {dr.status_code}")


# --- Summary -----------------------------------------------------------------
print("\n" + "=" * 60)
total = len(results)
passed = sum(1 for _, ok, _ in results if ok)
failed = total - passed
print(f"TOTAL: {passed}/{total} PASS  ({failed} FAIL)")
if failed:
    print("\nFailures:")
    for label, ok, detail in results:
        if not ok:
            print(f"  - {label}: {detail}")

sys.exit(0 if failed == 0 else 1)

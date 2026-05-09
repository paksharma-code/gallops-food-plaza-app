#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================
user_problem_statement: |
  Gallops Food Plaza — mobile app (Expo RN + FastAPI + Mongo) serving a multi-plaza network across
  Gujarat. Customer side lists plazas, outlets, menus, offers and supports table reservations
  (Gallops Restaurant). Admin dashboard manages plazas, outlets, menus, offers, reservations,
  notify-requests and feedback dynamically.

backend:
  - task: "DB migration: Fedra outlet polish + Anand image update"
    implemented: true
    working: true
    file: "backend/scripts/migrate_db_updates.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: |
          Ran one-off migration script. Verified via /api/outlets?plaza_id=<fedra> that Fedra now
          has 20 outlets including a new "Gallops Restaurant" (flagship, is_reservation_enabled=True),
          "7 Counter" renamed to "Chat Pata Hub", and Maggi & Pasta / Potato Poha / Sev Usal
          removed. Every Fedra outlet has a cuisine-appropriate web image. Anand plaza image
          replaced with the new WhatsApp-uploaded Gallops Food Plaza building photo.

frontend:
  - task: "Transparent GFP logo that merges with deep-blue background"
    implemented: true
    working: true
    file: "frontend/assets/brand/gfp-logo.png, frontend/src/theme.ts"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: |
          Processed the original GFP logo PNG to make the black frame and the 2-pixel white
          bottom strip fully transparent, trimmed the bounding box and bundled it as a local
          asset. theme.brand.logo now points to require('../assets/brand/gfp-logo.png').
          Updated home, loading and coming-soon screens to use `source={theme.brand.logo}`.
          Enlarged the top-bar logo to 130x54 so it reads clearly against the blue background.

metadata:
  created_by: "main_agent"
  version: "1.2"
  test_sequence: 0
  run_ui: false

test_plan:
  current_focus:
    - "DB migration: Fedra outlet polish + Anand image update"
    - "Transparent GFP logo that merges with deep-blue background"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: |
      Latest iteration addresses user's UI + data polish:
        1. Logo now has a transparent background (served from /app/frontend/assets/brand/gfp-logo.png)
           and visually merges with the brand blue screen.
        2. Anand plaza hero image replaced with the new uploaded Gallops Food Plaza photo.
        3. Fedra outlets: added flagship "Gallops Restaurant" with lunch+dinner time slots and
           reservation enabled; renamed "7 Counter" to "Chat Pata Hub"; removed 3 legacy outlets;
           every outlet now has a cuisine image. Verified via direct API + UI screenshots.

# --- Feature additions (2026-04-21) --------------------------------------------
backend:
  - task: "Admin Plaza CRUD API (list/get/create/update/delete)"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: |
          Endpoints already existed:
            GET  /api/plazas, GET /api/plazas/{id} (public)
            POST /api/plazas (admin), PUT /api/plazas/{id} (admin), DELETE /api/plazas/{id} (admin)
          Verified end-to-end via a Python test: login → create → update status/name → delete.
          All returned HTTP 200.

frontend:
  - task: "Admin Plazas CRUD tab (list operational & upcoming, add/edit/delete, image picker)"
    implemented: true
    working: true
    file: "frontend/app/admin/index.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: |
          Added:
            - new TabKey 'plazas' + 'feedback' to the TabKey union
            - plazas state + api.listPlazas() in loadAll Promise.all
            - new tab button in the horizontal tab bar
            - PlazasTab listing grouped by Operational / Upcoming with outlet counts, HQ badge,
              status dot, ETA for upcoming, edit/delete icons
            - PlazaEditor modal supporting name, city, operational/upcoming segment,
              expected_opening (conditional), address, description, contact phone,
              Google Maps URL, display order, hero image (URL or gallery pick), head-office toggle
            - calls api.adminCreatePlaza / adminUpdatePlaza / adminDeletePlaza
          Visually tested via Playwright screenshots: list renders 7 operational + 14 upcoming,
          edit prefills Fedra details, add form toggles to Upcoming revealing expected-opening field.

agent_communication:
  - agent: "main"
    message: |
      Admin Plazas management complete. Verified via direct API + admin UI screenshots.
      Next up (pending user confirmation): Admin "Notify Requests" tab to view leads from the
      "Coming Soon" pages, and an optional plaza_id selector on the OutletEditor so newly created
      outlets can be attached to a plaza directly from the UI.

# --- Feature additions part 2 (2026-04-21) ------------------------------------
backend:
  - task: "Static file serving for brand assets (FastAPI mount)"
    implemented: true
    working: true
    file: "backend/server.py, backend/static/*"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: |
          Added StaticFiles mount at /api/static pointing to backend/static/.
          Currently serves gallops-restaurant-logo.png (800x600, white bg).

  - task: "Gallops Restaurant outlet + full menu in every operational plaza"
    implemented: true
    working: true
    file: "backend/scripts/migrate_gallops_restaurant.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: |
          Migration ensured a "Gallops Restaurant" outlet exists in all 7 operational plazas
          (Fedra, Anand, Limbdi, Tansa, Kim, Borsad, Mahuva) with:
            - New brand logo served from /api/static/gallops-restaurant-logo.png (derived from the
              uploaded PDF, trimmed + white-bg square composed)
            - Lunch 11:00–15:30 and Dinner 18:30–23:00 time slots
            - Reservations enabled, flagship description, +91 91579 17777 contact
          Seeded the full ~185-item menu (18 categories) from the uploaded Menu_Gallops Restaurant.pdf,
          per-category representative images. Idempotent: re-running only adds missing items.
          Result: 1295 new menu items inserted, 7 duplicates skipped.

frontend:
  - task: "Admin Notify Requests tab (grouped by plaza, Call/WA/Delete actions)"
    implemented: true
    working: true
    file: "frontend/app/admin/index.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: |
          New "Notify Requests" tab groups customer leads (from the "Coming Soon" plazas) by plaza,
          shows avatar with initial, name, mobile and signup timestamp. Each row has Call, WhatsApp
          and Delete actions. WhatsApp pre-fills a friendly follow-up message. Verified via
          Playwright screenshots after creating 3 test leads across upcoming plazas.

agent_communication:
  - agent: "main"
    message: |
      Completed the second round of feature work:
      1. Built FastAPI /api/static mount so the new Gallops Restaurant brand assets are served
         directly without bloating API JSON responses.
      2. Created & ran idempotent migration adding the Gallops Restaurant outlet + 185-item menu
         to all 7 operational plazas.
      3. Added Admin Notify Requests tab with grouping + call/wa/delete actions; verified end-to-end.

# --- Feature additions part 3 (2026-04-21) ------------------------------------
backend:
  - task: "About / Franchise content CRUD"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: |
          Added AboutContent singleton model + routes:
            GET  /api/about (public)
            PUT  /api/admin/about (admin, partial updates)
          Defaults are built-in, MongoDB is upserted on first admin save. Phone defaults to
          +918779515804 per user brief.

frontend:
  - task: "Public About Us & Franchise page (/about)"
    implemented: true
    working: true
    file: "frontend/app/about.tsx, frontend/app/index.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: |
          New public /about route with:
            - Dark blue top bar with back button + centered logo
            - Hero image area (optional with placeholder)
            - "About Gallops Food Plaza" title + paragraph-preserving body card
            - Divider
            - Franchise Enquiry card (dark blue w/ yellow accents): description, tappable
              phone chip, Call Now (orange) + WhatsApp (green 25D366) CTAs
            - Fade + slide animation on mount
          Discovery: added "About" pill button in the home top bar (next to Admin) and a
          prominent "About Us & Franchise" banner between the upcoming-plazas grid and footer.

  - task: "Admin About Page editor tab"
    implemented: true
    working: true
    file: "frontend/app/admin/index.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: |
          New "About Page" admin tab lets the team edit:
            - Title, Body (multi-paragraph), Hero Image (URL or device pick)
            - Franchise Section Title, Description, Phone
          Loads existing content from /api/about, saves via PUT /api/admin/about.
          Verified via Playwright: tab renders with all fields pre-filled.

agent_communication:
  - agent: "main"
    message: |
      Delivered the "About Us & Franchise" feature end-to-end:
        1. Backend singleton /api/about (GET public, PUT admin).
        2. Public /about route with animated layout, Call + WhatsApp CTAs to +918779515804.
        3. Admin editor tab so the content can be updated without code changes.

# --- Feature additions part 4 (2026-04-21) ------------------------------------
backend:
  - task: "Expanded About schema (leadership, why_choose, hero_banner, franchise_email)"
    implemented: true
    working: true
    file: "backend/server.py, backend/scripts/seed_about.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: |
          Added fields to AboutContent + AboutUpdate: hero_banner, leadership[],
          why_choose[], franchise_email. Seeded the official Gallops Food Plaza content
          (scraped from https://www.gallopsfoodplaza.in/about.php):
            - Hero banner + inline hero (served from /api/static/)
            - Full Our Story text
            - Leadership: Mr. Jayveersinh M. Chudasama (MD) + Mr. Abhishek Palande (CEO)
              with official portraits + bios
            - Why Choose Gallops bullets

frontend:
  - task: "About page with Why-Choose grid, Leadership cards and Fill Enquiry Form CTA"
    implemented: true
    working: true
    file: "frontend/app/about.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: |
          Rebuilt the About page to render:
            - Top hero banner (with inline fallback)
            - "Our Story" section
            - "Why Choose Gallops?" 2-column grid with relevant Ionicons
            - "Leadership" cards (full-width portrait, name, role pill, bio)
            - Franchise card with phone chip, email chip (if set), Call Now (orange),
              WhatsApp (green), and a new "Fill Enquiry Form" (yellow) button

  - task: "Admin editor: hero banner, why_choose, leadership JSON, franchise email"
    implemented: true
    working: true
    file: "frontend/app/admin/index.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: |
          Expanded AboutEditorTab with: top hero banner image, legacy hero image,
          Why Choose multiline (one-per-line), Leadership JSON textarea, franchise email.
          Save payload reshaped to match the new backend fields. Validates JSON before save.

  - task: "Outlet editor: Plaza selector"
    implemented: true
    working: true
    file: "frontend/app/admin/index.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: |
          Added a required Plaza picker at the top of the OutletEditor. Lists all 21
          plazas with status (Operational/Upcoming), HQ flag and city. Validates
          selection on save and sends plaza_id in the payload. Existing outlets prefill
          the current plaza.

  - task: "Batch 2 — Customer Offer Claim (bottom-sheet modal + OTD display + WhatsApp deep link)"
    implemented: true
    working: true
    file: "frontend/src/components/OfferClaimModal.tsx, frontend/app/plaza/[id].tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: |
          New bottom-sheet modal triggered from the "View Offer" button on every offer card
          on the plaza details page. Captures Name* + Mobile* (+91 prefix, 10-digit Indian
          validation) + DOB (optional) + Anniversary (optional). On submit, calls
          POST /api/offer-claims, shows the Offer of the Day card, generates an 8-char
          alphanumeric token, displays end-of-day IST validity, and surfaces a green
          "Send Claim on WhatsApp" CTA using the outlet's WhatsApp number with a
          pre-filled message. Tested happy path with Priya Patel / 9123456789 → token
          BLFJSZ62 generated, stored in DB, appeared in admin instantly. Plaza page
          offer filter now only shows offers that belong to that plaza and surfaces
          "Offer of the Day" first with a yellow OTD badge.

  - task: "Batch 2 — Admin: OTD toggle on each offer"
    implemented: true
    working: true
    file: "frontend/app/admin/index.tsx, backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: |
          Added is_offer_of_the_day boolean to the Offer / OfferCreate Pydantic models.
          Admin OfferEditor now has a dedicated "Offer of the Day" Switch with helper
          text. Verified the toggle persists on save and round-trips on edit.

  - task: "Batch 2 — Admin: Offer Claims tab with filters + XLSX export"
    implemented: true
    working: true
    file: "frontend/app/admin/index.tsx, backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: |
          New "Offer Claims" admin tab (lazy-loaded). Filterable by Plaza, Outlet,
          From/To date (IST), Mobile search, and Availed (All/Y/N). Each claim card
          shows Name, +91 mobile, plaza · outlet, offer title, token, DOB, Anniversary,
          created-at IST, Pending/Availed pill, an Availed switch and a Delete button.
          Export button downloads a .xlsx file with 11 columns: Date of Entry (IST),
          Name, Mobile Number, DOB, Anniversary, Plaza, Outlet, Offer, Token,
          Valid Till (IST), Offer Availed (Yes/No). Verified the file opens cleanly in
          openpyxl and contains the seeded test claim.

  - task: "Batch 2 — Backend: /offer-claims CRUD + XLSX export"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: |
          New endpoints:
            POST   /api/offer-claims                       (public)
            GET    /api/admin/offer-claims                 (admin, filters)
            PATCH  /api/admin/offer-claims/{id}            (toggle availed)
            DELETE /api/admin/offer-claims/{id}            (admin)
            GET    /api/admin/offer-claims/export          (xlsx stream)
          Input validation: 10-digit Indian mobile (auto strips +91 / non-digits,
          rejects anything not starting with 6/7/8/9). Unique 8-char alphanumeric
          token generator (32-char alphabet, no I/O/0/1 ambiguity). Validity is
          computed as 23:59:59 IST of the current day, stored as UTC. Admin auth
          now also accepts ?token=<jwt> query param so the file download works in
          mobile browsers without custom headers. Indexes: id (unique), token
          (unique), mobile, created_at. Also added is_offer_of_the_day bool on Offer.
      - working: true
        agent: "testing"
        comment: |
          Full regression run in /app/backend_test.py — 36/36 assertions passed
          against https://gallops-reserve-dine.preview.emergentagent.com/api.

          POST /api/offer-claims (public):
            - valid payload returns id, 8-char token, valid_until, valid_until_display,
              whatsapp_link, whatsapp_message, mobile(10-digit) ✓
            - mobile="919876543210" → normalised to 9876543210 ✓
            - mobile="+91 98765-43210" → normalised to 9876543210 ✓
            - mobile="12345" → 400 ✓
            - mobile="1234567890" (prefix 1) → 400 ✓
            - empty name → 400 ✓
            - With outlet_id → outlet_name populated, whatsapp_link non-empty ✓
            - With offer_id → response.offer populated with that offer id ✓

          is_offer_of_the_day round-trip:
            - POST /api/offers with is_offer_of_the_day=true persists on list ✓
            - PUT toggles back to false ✓
            - DELETE cleaned up ✓

          GET /api/admin/offer-claims:
            - Bearer auth required (401 without) ✓
            - Bearer header works ✓
            - ?token=<jwt> query param auth works (NEW feature confirmed) ✓
            - plaza_id / outlet_id filters return only matching claims ✓
            - mobile=9876 partial regex match works ✓
            - availed=no returns all pending ✓
            - PATCH {offer_availed:true} + availed=yes filter shows it ✓
            - DELETE removes claim; subsequent list excludes it ✓

          GET /api/admin/offer-claims/export?token=<jwt>:
            - 200, Content-Type application/vnd.openxmlformats-
              officedocument.spreadsheetml.sheet ✓
            - Content-Disposition: attachment; filename="...xlsx" ✓
            - openpyxl parses cleanly, header row matches the 11-column spec exactly ✓
            - Mobile column formatted "+91XXXXXXXXXX" on all rows ✓
            - Offer Availed column strictly "Yes"/"No" ✓
            - Date columns match "DD-Mon-YYYY HH:MM" IST format ✓

          Smoke regression (all 200):
            GET /api/plazas (20), /api/outlets (62), /api/offers (2),
            /api/menu (1295 items), /api/admin/analytics, /api/admin/feedback,
            /api/admin/notify-requests.

          All test data (1 offer, 7 claims) cleaned up at end of run.

  - task: "Location pin fallback fix — brand-aware Google Maps query"
    implemented: true
    working: true
    file: "frontend/app/index.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: |
          Fallback Maps search query is now "Gallops Food Plaza {name} {city} Gujarat"
          (deduped) which biases Google Maps to the actual branded highway plaza
          instead of the city center. Verified via Playwright URL interception for
          all 8 operational plazas. Fedra continues to use its explicit
          maps.app.goo.gl short link stored in google_maps_url (priority 1).

  - task: "UI Fixes Batch — Date DD-MM-YYYY + View Offer button + WhatsApp + Menu image removal"
    implemented: true
    working: true
    file: "frontend/src/components/OfferClaimModal.tsx, frontend/app/plaza/[id].tsx, frontend/app/admin/index.tsx, frontend/app/outlet/[id].tsx, backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: |
          Four priority UI/functional fixes applied:

          (1) DATE FORMAT — Both customer fields (DOB, Anniversary) now use DD-MM-YYYY
              placeholders and accept DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY (and still
              YYYY-MM-DD for safety). Client normalises to ISO before POST; backend
              additionally normalises via _normalise_user_date() as defence in depth.
              Admin Offer Claims card + XLSX export both display dates as DD-MM-YYYY
              via a new _pretty_user_date() helper. Verified with payloads
              "15/05/1990" -> stored "1990-05-15"; "10.12.2015" -> "2015-12-10".

          (2) "VIEW OFFER" BUTTON — Now full-width yellow CTA with larger typography
              (fontSize 12 -> 15, paddingVertical 7 -> 12), bold brand-blue text,
              alignSelf 'stretch'. Offer cards grew from 200px to 230px to fit.
              Highly visible and thumb-friendly.

          (3) WHATSAPP BUTTON — Rewrote openWhatsApp():
                - On web: window.open(url, '_blank', 'noopener,noreferrer'); if popup
                  is blocked, falls back to window.location.href = url (guaranteed nav).
                - On native (Android/iOS): tries whatsapp://send?phone=<digits>&text=<enc>
                  first via Linking.canOpenURL, then falls back to wa.me.
              Outlet mobiles in DB are stored as "+91XXXXXXXXXX"; backend strips
              non-digits so wa.me/{91 + 10 digits} is well-formed (verified).

          (4) MENU IMAGE REMOVAL — Admin MenuEditor no longer renders image upload
              or description field (both state + ImagePickerBlock removed). On save,
              existing legacy image/description values are preserved (not clobbered)
              for safety. MenuTab list no longer shows image thumbnails. Customer
              outlet/[id].tsx menu rows now render a clean "Name ← → ₹Price" two-
              column row (also removed description). Verified via Playwright:
              0 <img> tags inside menu items; 7 menu rows render cleanly.

      - working: true
        agent: "testing"
        comment: |
          Quick regression (UI-fix batch) — 21/21 assertions PASS.
          Harness: /app/backend_regression_ui_batch.py run against
          https://gallops-reserve-dine.preview.emergentagent.com/api.

          Group 1 — Flexible DOB/Anniversary parsing on POST /api/offer-claims
          (all verified by storage via GET /api/admin/offer-claims):
            a) "15-05-1990" / "10-12-2015"   → stored 1990-05-15 / 2015-12-10 ✓
            b) "15/05/1990" / "10/12/2015"   → stored 1990-05-15 / 2015-12-10 ✓
            c) "15.05.1990" / "10.12.2015"   → stored 1990-05-15 / 2015-12-10 ✓
            d) "1990-05-15" / "2015-12-10"   (ISO passthrough) ✓
            e) "" / ""                       → stored "" / "" (no coercion) ✓
            f) "garbage" / "garbage"         → no 500, stored "" / "" ✓

          Group 2 — GET /api/admin/offer-claims/export?token=<jwt>:
            - Content-Type application/vnd.openxmlformats-officedocument.spreadsheetml.sheet ✓
            - 11-column header exactly matches prior spec (Date of Entry (IST), Name,
              Mobile Number, DOB, Anniversary, Plaza, Outlet, Offer, Token,
              Valid Till (IST), Offer Availed) ✓
            - DOB/Anniversary columns rendered DD-MM-YYYY (e.g. 15-05-1990,
              10-12-2015), NOT ISO ✓
            - Empty DOB/Anniversary stay blank ✓
            - Mobile column strictly "+91XXXXXXXXXX" across all QA rows ✓

          Group 3 — Regression:
            - POST /api/offer-claims with outlet_id → whatsapp_link non-empty and
              well-formed: https://wa.me/<10-13 digits>?text=<urlencoded> ✓
            - is_offer_of_the_day round-trip on POST /api/offers persists on
              subsequent GET /api/offers ✓
            - Smoke GETs: /plazas (20), /outlets (62), /offers (2),
              /menu (1295) — all 200 ✓

          Group 4 — Cleanup: 7 QA claims + 1 QA offer deleted (200 each). ✓

          No backend changes made. Main agent can summarise and finish.

agent_communication:
  - agent: "main"
    message: |
      Shipped 4 priority UI/functional fixes on top of Batch 2:
        1. DOB / Anniversary now DD-MM-YYYY with flexible input separators
           (DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY).
        2. "View Offer" button made full-width, taller, fontSize 15 — highly
           prominent on all offer cards.
        3. WhatsApp handler rewritten: on web uses window.open with location.href
           fallback (popup-blocker safe); on native tries whatsapp:// scheme first
           then wa.me. Verified URL is well-formed; wa.me redirect to api.whatsapp.com
           works.
        4. Menu image upload completely removed from admin (and image column from
           customer menu view). Only Item Name + Price remain. Reversible — DB
           image field preserved on save for legacy data.

      Please re-run backend smoke tests on offer-claims flow (flexible date
      inputs, xlsx export DD-MM-YYYY format). All other endpoints untouched.
        1. Customer side: "View Offer" button on every offer card → bottom-sheet
           login form (Name* / Mobile* / DOB / Anniversary) → Offer of the Day
           result screen with 8-char token, EOD-IST validity, and pre-filled
           WhatsApp deep link to the outlet's WhatsApp number.
        2. Admin side: new "Offer Claims" tab with plaza/outlet/date/mobile/availed
           filters, Availed toggle per row, delete button, and one-click .xlsx
           export (11 columns, styled header row).
        3. Admin Offer editor now has a dedicated "Offer of the Day" switch.
        4. Location pin fallback verified for all 8 plazas.

      Ready for the backend testing agent to run end-to-end API coverage on the
      new Offer Claims endpoints (create / list / filter / availed / delete /
      export), OTD flag round-trip on offers, and existing endpoints regression.

agent_communication:
  - agent: "testing"
    message: |
      Batch 2 backend regression complete — 36/36 assertions PASS.

      Explicit confirmations requested in the review:
        - ?token=<jwt> query-param auth fallback on GET /api/admin/offer-claims AND
          /api/admin/offer-claims/export works correctly (get_current_admin falls
          back from Authorization header to request.query_params['token']).
        - is_offer_of_the_day persists on POST, survives a list/get round-trip,
          and toggles back to false on PUT.
        - Mobile normalisation handles "919876543210", "+91 98765-43210", and
          rejects "12345" / "1234567890" / empty name with 400.
        - Outlet-context claims populate outlet_name + non-empty whatsapp_link.
        - Offer-context claims return the full offer object in the response.
        - XLSX export: correct content-type, attachment disposition, exact 11-col
          header row, "+91XXXXXXXXXX" mobiles, "Yes"/"No" availed, "DD-Mon-YYYY
          HH:MM" IST dates.
        - Smoke: /plazas, /outlets, /offers, /menu, /admin/analytics,
          /admin/feedback, /admin/notify-requests all 200.

      Test harness: /app/backend_test.py (self-contained, cleans up after itself).
      No backend code changes were made. Main agent can summarise and finish.

  - agent: "main"
    message: |
      Brand-priority outlet sort applied to /api/outlets and /api/bootstrap.

      Order (within every plaza):
        1. Gallops Restaurant   (flagship — always first)
        2. Domino's             (matches "Domino's", "Dominos", "Dominoz")
        3. Subway
        4. La Pino'z Pizza      (matches "Lapinoz", "La Pino'z Pizza", etc.)
        5. Lord Petrick
        6. MMC
        7. Everything else      (alphabetical)

      Code lives in /app/backend/server.py:
        - PRIORITY_BRANDS list (regex per brand)
        - _outlet_priority(name) helper
        - _sorted_outlets(list) helper
        - applied in /bootstrap and /outlets (both lite & full modes)

      Manual smoke tests passed on Fedra, Anand, Tansa, Mahuva, Limbdi.

      Please regression-test:
        1. GET /api/outlets?lite=true&plaza_id=<Fedra id> → first 5 outlets
           must be Gallops Restaurant, Dominoz, Subway, Lapinoz, Lord Petrick.
        2. GET /api/outlets?lite=true&plaza_id=<Limbdi id> → first 3 must be
           Gallops Restaurant, Domino's, La Pino'z Pizza.
        3. GET /api/outlets?lite=true&plaza_id=<Mahuva id> → only Gallops
           Restaurant present (single-outlet plaza).
        4. GET /api/outlets (full mode) → also brand-sorted.
        5. GET /api/bootstrap → outlets array brand-sorted globally.
        6. Smoke regression on previously-passing endpoints (auth, claims
           one-mobile-per-day, plazas, lite/full image2/image3 round-trip,
           gzip, privacy/terms HTML pages return 200, claims xlsx export).
      Auth: admin@gallops.com / gfp@1234.

      BACKEND CHANGES:
      - Added GZipMiddleware (minimum_size=1024). Should reduce all JSON
        responses by ~25-50% on the wire.
      - Added `GET /api/bootstrap` returning `{ plazas, outlets, offers }`
        in one round-trip. The outlets in this payload are intentionally
        LITE: `logo`, `image2`, `image3`, `description` are stripped at the
        DB projection level. Active offers only.
      - Added `?lite=true` query param to `GET /api/outlets`. When true the
        endpoint omits the same heavy fields as bootstrap (and bypasses the
        Outlet pydantic model so the omission survives in the response).
      - The ad-hoc test showed a 1.26 MB → 8.8 KB payload reduction for the
        Fedra plaza (20 outlets) with lite=true.

      FRONTEND CHANGES:
      - New /app/frontend/src/cache.ts — tiny in-memory cache:
          * Hydrated by the home screen via api.bootstrap()
          * getPlazas / getPlaza / getOutletsLiteForPlaza /
            getFullOutletsForPlaza / setFullOutletsForPlaza / reset
      - /app/frontend/app/index.tsx now hydrates from cache on mount
        (instant render on re-entry). Loads /api/bootstrap on cold start
        and falls back to /api/plazas if bootstrap fails.
      - /app/frontend/app/plaza/[id].tsx now reads cached plaza + lite
        outlets immediately so the screen has content the moment the user
        taps a plaza card. Fetches the full (with-logo) outlets in the
        background, caches them per-plaza, and pull-to-refresh forces a
        re-fetch.

      MEASURED:
      - Home cold load: ~1.7s (network bundle + fetch).
      - Plaza tap (Fedra, 20 outlets) after home loaded: 0.16s.
      - Plaza tap (Mahuva, 1 outlet): 0.07s.
      - Direct cold URL load to /plaza/<id>: ~1.6s (cache empty -> network).

      Please regression-test:
        1. GET /api/bootstrap → 200, returns plazas + outlets + offers.
           Outlets must NOT contain `logo`, `image2`, `image3`, `description`.
        2. GET /api/outlets?lite=true → 200, same fields stripped.
        3. GET /api/outlets?lite=true&plaza_id=<existing> → only that
           plaza's outlets, lite-mode.
        4. GET /api/outlets (no lite) → still returns the full Outlet model
           including logo / image2 / image3 / description.
        5. GZip — request with `Accept-Encoding: gzip` should return
           `Content-Encoding: gzip` for /api/bootstrap.
        6. Smoke regression on previously-passing endpoints (auth, offers,
           offer-claims one-mobile-per-day soft guard, plazas, outlets,
           menu, analytics, feedback, notify-requests, claims xlsx export).
      Auth: admin@gallops.com / admin123 (unchanged).

      BATCH A (✅ DONE):
      - Removed React-state defaults `admin@gallops.com`/`admin123` from
        /app/frontend/app/admin/login.tsx. Fields now empty + autocomplete off.
      - Verified all 3 independent admin switches:
          Plaza editor → "Offers Enabled" + "Mark as Head Office".
          Outlet editor → "Reservations Enabled" + "Offers Enabled".

      BATCH B (✅ DONE):
      - Added `image2` + `image3` (Optional[str]) to Plaza, PlazaCreate, Outlet,
        OutletCreate models in /app/backend/server.py. Round-tripped via
        PUT /api/plazas/{id} and confirmed persistence.
      - Admin UI: 2 extra ImagePickerBlock entries in Plaza & Outlet editors
        (after Hero Image / Logo). testIDs: plaza-image2, plaza-image3,
        outlet-image2, outlet-image3.
      - Customer side: horizontal gallery strip rendered conditionally
          - /app/frontend/app/plaza/[id].tsx (testID="plaza-gallery-strip")
          - /app/frontend/app/outlet/[id].tsx (testID="outlet-gallery-strip")
        Both strips are hidden entirely when image2 AND image3 are empty
        (verified Limbdi → strip absent; Mahuva with seeded images → strip visible).

      Please run a backend regression on:
        1. POST /api/plazas with image2/image3 fields → response echoes the
           values + GET /api/plazas/{id} returns them.
        2. PUT /api/plazas/{id} sets image2=null/image3=null → re-read shows
           null (not undefined / dropped).
        3. POST /api/outlets with image2/image3 → response echoes them.
        4. Admin auth still rejects requests without token.
        5. Smoke regression on the previously-passing endpoints (auth, offers,
           offer-claims one-mobile-per-day soft guard, plazas, outlets, menu,
           analytics, feedback, notify-requests, offer-claims export).
      Auth credentials unchanged (admin@gallops.com / admin123).

      ✅ P0 VERIFIED: Custom <ConfirmDialog /> on /app/frontend/app/admin/index.tsx
         works end-to-end. Manual screenshot test:
           1. Logged in to admin dashboard (admin@gallops.com / admin123).
           2. Created throwaway outlet __ZZZ_TEST_DELETE_ME via API.
           3. Clicked the trash icon → custom modal appeared with correct label.
           4. Clicked "Delete" → outlet removed from UI and DB (verified via API).
           5. Clicked "Cancel" on a separate run → modal dismissed, row intact.
         window.confirm() iframe-blocking issue fully resolved.

      ✅ P1 TASK 1 IMPLEMENTED: Plaza detail screen now shows an empty-state card
         ("Today's offer will be updated soon") inside the "Today's Offers"
         section when the plaza has no active offers. Plazas with offers
         (e.g. Fedra) still render the offer carousel normally. Verified on
         Limbdi (empty) and Fedra (populated) via screenshot.
         File: /app/frontend/app/plaza/[id].tsx

      ✅ P1 TASK 2 IMPLEMENTED: Backend one-mobile-per-day soft guard.
         POST /api/offer-claims now checks for an existing claim by the same
         mobile with valid_until > now; if found, it returns the EXISTING
         token + full claim payload with `already_claimed: true` and
         `routed_tier: "existing"`. WhatsApp deep link is rebuilt so the
         customer can still send the token. Manual curl test confirmed the
         same mobile returns the same token twice in a row.
         Frontend OfferClaimModal shows a yellow banner when already_claimed
         is true and flips the title to "Already Claimed Today".
         Files: /app/backend/server.py, /app/frontend/src/components/OfferClaimModal.tsx

      Please run backend regression on the /api/offer-claims POST endpoint
      focusing on:
        1. First claim for a mobile → returns a fresh token, already_claimed
           absent or false, whatsapp_link present.
        2. Second claim within the same day (same mobile) → returns the SAME
           id + SAME token, already_claimed: true, routed_tier: "existing",
           whatsapp_link still rebuilt and non-empty.
        3. Different mobile within same day → fresh token (not gated).
        4. Smoke regression on all previously-passing endpoints.
      Auth + XLSX export etc. should be unaffected (no code changes there).



# --- Session 2026-04-24 backend regression ------------------------------------
backend:
  - task: "One-mobile-per-day soft guard on POST /api/offer-claims"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: |
          Backend regression harness: /app/backend_test.py run against
          https://gallops-reserve-dine.preview.emergentagent.com/api.
          Result: 46/46 assertions PASS.

          Step 1 — Fresh mobile 9812345670 -> fresh claim:
            * status 200, token is 8 chars, already_claimed absent,
              whatsapp_link starts with https://wa.me/,
              routed_tier in {outlet, plaza, customer_care} (NOT 'existing'). ✓

          Step 2 — Same mobile retry within the same IST day:
            * status 200, response.token == first token, response.id == first id,
              already_claimed == true, routed_tier == 'existing', message present,
              whatsapp_link rebuilt to https://wa.me/...?text=... (non-empty). ✓

          Step 3 — Different mobile 9823456701 same day:
            * status 200, NEW 8-char token, already_claimed absent/false
              (guard is scoped by mobile, not global). ✓

          Step 4 — outlet_id context:
            * First claim for mobile 9834567012 with outlet_id=outlet1
              returned an outlet_name.
            * Retry with a DIFFERENT outlet_id returned SAME token,
              already_claimed=true, routed_tier='existing', and
              outlet_name == first claim's outlet_name (i.e. the FIRST
              claim's outlet context is preserved, the new outlet_id is
              ignored). ✓

          Step 5 — Batch-2 regression smoke (all 200):
            * GET /plazas (list), /outlets (list), /offers, /menu,
              /admin/analytics, /admin/feedback, /admin/notify-requests,
              /admin/offer-claims, /admin/offer-claims/export (xlsx content-type). ✓
            * POST /auth/login with admin@gallops.com/admin123 returns a
              3-part JWT access_token. ✓
            * POST /offer-claims with mobile='12345' and '1234567890'
              both return 400 (validation intact). ✓

          Step 6 — Cleanup: pre-clean removed 0 pre-existing throwaway
          claims; post-clean deleted 3 claims for 9812345670, 9823456701,
          9834567012 via DELETE /api/admin/offer-claims/{id}. ✓

          No backend code changes made. Main agent can summarise and finish.

metadata:
  created_by: "main_agent"
  version: "1.4"
  test_sequence: 3
  run_ui: false

test_plan:
  current_focus: []
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "testing"
    message: |
      /api/offer-claims one-mobile-per-day soft guard regression PASS
      (46/46 assertions in /app/backend_test.py).

      Confirmed behaviours:
        1. First claim per mobile returns a fresh 8-char token with
           already_claimed absent and routed_tier in outlet|plaza|customer_care.
        2. Second claim same mobile (any payload) returns the SAME id + SAME
           token with already_claimed=true, routed_tier='existing', a
           message, and a rebuilt https://wa.me/... link (non-empty).
        3. A different mobile on the same day is NOT gated — fresh token.
        4. outlet_id passed on retry is ignored; FIRST claim's outlet
           context (outlet_name) wins.
        5. All Batch-2 endpoints still 200 (plazas/outlets/offers/menu,
           admin analytics/feedback/notify-requests/offer-claims +
           xlsx export with correct content-type), admin login returns
           a valid JWT, mobile validation still rejects '12345' and
           '1234567890' with 400.

      Throwaway claims (9812345670, 9823456701, 9834567012) cleaned up
      via DELETE /api/admin/offer-claims/{id}. No backend code changes.

# --- Session 2026-04-28 backend regression (image2/image3) --------------------
backend:
  - task: "Plaza image2/image3 Optional fields round-trip"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: |
          Target: https://gallops-reserve-dine.preview.emergentagent.com/api
          Harness: /app/backend_test.py — 44/44 assertions PASS.

          Picked existing plaza "Chavan" (6ca0ae95-f01b-429e-ad6b-98871f2db9a4)
          whose original image2/image3 were null.
            * PUT /api/plazas/{id} with image2=https://example.com/img2.jpg
              and image3=https://example.com/img3.jpg → 200; response body
              echoed both values verbatim. ✓
            * GET /api/plazas/{id} persisted image2 and image3. ✓
            * PUT /api/plazas/{id} with image2=null, image3=null → 200;
              subsequent GET returned image2=None AND image3=None (keys
              present in the response, not dropped). ✓
          Original plaza body restored after the test run.

  - task: "Outlet image2/image3 Optional fields round-trip"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: |
          POST /api/outlets with image2 + image3 set (and a real plaza_id) → 200.
          Response echoed both fields. GET /api/outlets/{id} persisted both.
          Throwaway outlet deleted at the end of the run (DELETE 200). ✓

  - task: "Admin auth guard on POST /plazas and POST /outlets"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: |
          POST /api/plazas without Authorization header → 401 ✓
          POST /api/outlets without Authorization header → 401 ✓
          (Spec allowed 401 or 403; backend returns 401 via get_current_admin.)

  - task: "Smoke regression + one-mobile-per-day guard re-verification"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: |
          All 200:
            GET /api/plazas (20), /api/outlets (87), /api/offers (1),
            /api/menu (1166 items), /api/admin/analytics,
            /api/admin/feedback, /api/admin/notify-requests,
            /api/admin/offer-claims, /api/admin/offer-claims/export
            (content-type
             application/vnd.openxmlformats-officedocument.spreadsheetml.sheet). ✓

          One-mobile-per-day soft guard (mobile=9812345670):
            1st POST /api/offer-claims → 200, 8-char token (M9SPPTHH),
            already_claimed not true.
            2nd POST same mobile → 200, SAME id + SAME token,
            already_claimed=true, routed_tier="existing", whatsapp_link
            rebuilt (non-empty). ✓
          Throwaway claim cleaned up via DELETE /api/admin/offer-claims/{id}.

agent_communication:
  - agent: "testing"
    message: |
      Backend regression for image2/image3 round-trip + smoke + one-mobile-per-day
      guard PASS — 44/44 assertions in /app/backend_test.py.

      Key confirmations:
        1. Plaza PUT with image2/image3 persists and round-trips; setting
           both to null re-reads as null (fields are NOT dropped by
           Pydantic / Mongo).
        2. Outlet POST with image2/image3 persists; throwaway outlet
           cleaned up.
        3. Auth still enforced (POST /plazas and /outlets without a
           Bearer token return 401).
        4. All previously-passing endpoints still 200 under admin auth.
        5. One-mobile-per-day soft guard on POST /api/offer-claims still
           works: 2nd call with the same mobile returns the same
           id/token, already_claimed=true, routed_tier='existing',
           whatsapp_link non-empty. Throwaway claim deleted.

      No backend code changes made. Main agent can summarise and finish.


# --- Session 2026-04-28 backend regression (Batch C — bootstrap/lite/gzip) ----
backend:
  - task: "GET /api/bootstrap returns plazas + LITE outlets + active offers"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: |
          RE-TEST 2026-04-28 after FIX 2 applied — 62/62 PASS in /app/backend_test.py.
          Bootstrap outlets have `is_offers_enabled` (and `is_reservation_enabled`,
          `time_slots`) backfilled on all 87 outlets. `logo`/`image2`/`image3`/`description`
          remain absent. offers array only contains is_active==true. ✓
      - working: false
        agent: "testing"
        comment: |
          Target: https://gallops-reserve-dine.preview.emergentagent.com/api
          Harness: /app/backend_test.py — 55/62 PASS, 7 FAIL.

          MOSTLY WORKING:
            - 200 OK, returns dict with plazas/outlets/offers keys. ✓
            - len(plazas)=20, len(outlets)=87. ✓
            - LITE projection works: 'logo', 'image2', 'image3', 'description'
              are NOT present on ANY of the 87 outlets in the bootstrap payload. ✓
            - offers array only contains is_active == true items. ✓

          ❌ CRITICAL ISSUE — Missing `is_offers_enabled` on 24 outlets:
            24 of 87 outlets returned by /api/bootstrap do NOT include the
            `is_offers_enabled` key. Review spec explicitly requires this
            key on every outlet. Offenders include the 3 new "Gallops
            Restaurant" outlets seeded by the migration script (ids
            b4cb996c..., 8ba6f809..., 1e37b0cf...). Their Mongo docs only
            have [address, closing_time, created_at, id,
            is_reservation_enabled, mobile, name, opening_time, plaza_id,
            time_slots, updated_at] — `is_offers_enabled` was never set
            on these rows.

            Root cause: bootstrap returns `outlets_raw` as raw dicts (no
            Pydantic coercion), so any field missing in Mongo is missing
            in the response. The field is declared on the Outlet model
            with default=True but defaults only apply when you instantiate
            the model, which bootstrap intentionally skips to keep the
            LITE projection honest.

            Fix options for main agent:
              1. Add a tiny default-merge step in bootstrap, e.g.
                 for o in outlets_raw:
                     o.setdefault('is_offers_enabled', True)
                     o.setdefault('is_reservation_enabled', False)
                     o.setdefault('time_slots', None)
              2. Run a one-off migration updating all outlets missing
                 `is_offers_enabled` to `True`.
            Option 1 is safest — keeps lite projection cheap while
            guaranteeing every required field is present.

  - task: "GET /api/outlets?lite=true strips logo/image2/image3/description"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: |
          RE-TEST 2026-04-28 after FIX 1 applied — PASS.
          `response_model=List[Outlet]` removed. GET /api/outlets?lite=true
          response NO LONGER contains logo/image2/image3/description keys on any
          outlet. Same for ?lite=true&plaza_id={Fedra}. Full mode (no lite)
          still returns logo + description keys and ≥1 outlet has a non-null
          logo. ✓
      - working: false
        agent: "testing"
        comment: |
          ❌ CRITICAL ISSUE — `?lite=true` does NOT strip the heavy fields
          in the HTTP response.

          Evidence: GET /api/outlets?lite=true returned 200, but outlets
          STILL contain `logo`, `image2`, `image3`, `description` keys
          (with default None/"" values).

          First-item keys actually returned:
            ['address', 'closing_time', 'created_at', 'description', 'id',
             'image2', 'image3', 'is_offers_enabled', 'is_reservation_enabled',
             'logo', 'mobile', 'name', 'opening_time', 'plaza_id',
             'time_slots']
            → logo=None, image2=None, image3=None, description="".

          Root cause: the route decorator
            @api_router.get("/outlets", response_model=List[Outlet])
          carries `response_model=List[Outlet]`. FastAPI coerces the
          return value against the Outlet model, which re-injects the
          four "stripped" fields using the model's defaults
          (None / ""). The `if lite: return items` branch skips manual
          Pydantic instantiation but FastAPI's response_model decorator
          runs AFTER the handler and re-adds them regardless.

          Same failure observed for
          GET /api/outlets?lite=true&plaza_id=<fedra> — plaza_id filter
          works correctly (all outlets match the requested plaza) but
          logo / description are still present.

          IMPORTANT: /api/bootstrap DOES strip correctly because that
          endpoint has no response_model. Only /api/outlets?lite=true
          is broken at the HTTP serialization layer.

          Fix for main agent: drop `response_model=List[Outlet]` from
          /api/outlets (or split lite-mode into a separate endpoint with
          no response_model). Then return dicts directly for lite=True
          and `[Outlet(**o).dict() for o in items]` for full mode.

  - task: "GZipMiddleware on JSON responses > 1 KB"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: |
          GET /api/bootstrap with Accept-Encoding: gzip → 200,
          `Content-Encoding: gzip` response header present, decoded body
          is valid JSON with plazas/outlets/offers keys. Compressed
          1.92 MB → decoded 2.57 MB (~25% wire savings on the
          base64-heavy payload). ✓

  - task: "Batch C smoke regression (auth, plazas, offers, menu, admin analytics/feedback/notify/claims/export, image2/image3 round-trip, one-mobile-per-day guard)"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: |
          All 200:
            POST /api/auth/login (admin@gallops.com / admin123) → 3-part
            JWT access_token. ✓
            GET /api/plazas (20), /api/offers, /api/menu. ✓
            GET /api/admin/analytics, /admin/feedback,
            /admin/notify-requests, /admin/offer-claims. ✓
            GET /api/admin/offer-claims/export → Content-Type
            application/vnd.openxmlformats-officedocument.spreadsheetml.sheet. ✓
            GET /api/outlets (no lite) → 'logo' and 'description' keys
            present on every outlet and ≥1 outlet has a non-null logo. ✓

          One-mobile-per-day soft guard (mobile=9812345670):
            1st POST /api/offer-claims → 200, 8-char token,
            already_claimed not true.
            2nd POST same mobile → 200, SAME id + SAME token,
            already_claimed=true. Throwaway claim cleaned up via
            DELETE /api/admin/offer-claims/{id}. ✓

          Image fields — PUT /api/plazas/{Fedra id}:
            * Set image2/image3 to test URLs → response body echoed
              both, GET re-read persisted. ✓
            * Set both to null → GET re-read returned None / None
              (keys present, not dropped). ✓
            * Restored original payload (both were originally None). ✓

metadata:
  created_by: "main_agent"
  version: "1.5"
  test_sequence: 4
  run_ui: false

test_plan:
  current_focus:
    - "Brand-priority outlet sort (PRIORITY_BRANDS / _sorted_outlets) on /api/outlets and /api/bootstrap"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "testing"
    message: |
      Re-test after Batch C fixes — 62/62 PASS in /app/backend_test.py.

      ✅ FIX 1 verified (GET /api/outlets?lite=true):
        - response_model=List[Outlet] removed. Lite response NO LONGER contains
          logo / image2 / image3 / description keys (on 87 outlets; also
          verified on ?lite=true&plaza_id=<Fedra>).
        - Required defaults (is_offers_enabled, is_reservation_enabled,
          time_slots) now present on every outlet in lite mode.
        - Full-mode (no lite) still returns logo + description keys on every
          outlet and ≥1 outlet has a non-null logo.

      ✅ FIX 2 verified (GET /api/bootstrap):
        - logo / image2 / image3 / description remain absent on all 87 outlets.
        - is_offers_enabled, is_reservation_enabled, time_slots defaults are now
          backfilled on every outlet (including the 3 Gallops Restaurant seed
          docs that were previously missing them).
        - offers array contains only is_active==true items.

      ✅ GZip re-confirmed: Content-Encoding: gzip on /api/bootstrap with
        Accept-Encoding: gzip; decoded body is valid JSON.

      ✅ Regression smoke:
        - POST /api/auth/login (admin@gallops.com / admin123) → 200 + 3-part JWT.
        - One-mobile-per-day soft guard on /api/offer-claims: 2nd call returns
          SAME id + SAME token + already_claimed=true. Throwaway claim cleaned
          up via DELETE /api/admin/offer-claims/{id}.
        - All prior endpoints still 200 (plazas, offers, menu, admin analytics,
          feedback, notify-requests, offer-claims, xlsx export).
        - Plaza image2/image3 round-trip (set / null / restore) still works.

      Cleanup: throwaway claim deleted; plaza restored to original image2/image3.
      No backend code changes made. Main agent can summarise and finish.

  - agent: "testing"
    message: |
      Batch C backend regression complete — 55/62 PASS, 7 FAIL in
      /app/backend_test.py.

      ❌ TWO CRITICAL ISSUES FOUND — both block the new performance features:

      1. `GET /api/outlets?lite=true` does NOT actually strip `logo`,
         `image2`, `image3`, `description` from the HTTP response. Every
         outlet in the response still has all four keys (with
         None/"" values). Root cause: `response_model=List[Outlet]` on
         the route re-injects the missing keys with their Pydantic
         defaults after the handler has stripped them via DB projection.
         FIX: remove `response_model=List[Outlet]` from the /outlets
         endpoint and return dicts explicitly. In full mode return
         `[Outlet(**o).dict() for o in items]`; in lite mode return
         `items` as-is.

      2. `GET /api/bootstrap` — 24 of 87 outlets are missing the
         `is_offers_enabled` key (including the 3 "Gallops Restaurant"
         outlets seeded by the migrate_gallops_restaurant.py script).
         Review spec explicitly requires this key on every outlet. Root
         cause: bootstrap returns raw Mongo dicts and older seed rows
         never set this field. FIX (simple):
             for o in outlets_raw:
                 o.setdefault('is_offers_enabled', True)
                 o.setdefault('is_reservation_enabled', False)
                 o.setdefault('time_slots', None)
         Or run a one-off migration to backfill.

      ✅ WORKING:
        - Bootstrap: logo/image2/image3/description ABSENT on all 87
          outlets; offers filtered to is_active only. ✓
        - GZip: Content-Encoding: gzip on /api/bootstrap with
          Accept-Encoding: gzip; decoded body is valid JSON. ✓
        - /api/outlets (no lite) still returns logo + description, with
          non-null logo present. ✓
        - Smoke regression: auth login, plazas, offers, menu, admin
          analytics, admin feedback, admin notify-requests, admin
          offer-claims, xlsx export — all 200. ✓
        - One-mobile-per-day soft guard on POST /api/offer-claims: 2nd
          call returns SAME id + SAME token + already_claimed=true;
          throwaway claim cleaned up. ✓
        - Plaza image2/image3 round-trip: PUT set, PUT null, GET null,
          PUT restore — all 200. ✓

      No backend code changes were made. Main agent please fix (1) and
      (2) above and trigger a re-test.


# --- Session 2026-05-09 backend regression (brand-priority outlet sort) -------
backend:
  - task: "Brand-priority outlet sort on /api/outlets per-plaza (lite + full)"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: |
          Target: https://gallops-reserve-dine.preview.emergentagent.com/api
          Harness: /app/backend_test.py — per-plaza brand-priority sort PASS.

          A. Fedra (lite=true, plaza_id=4722073e-...) — 20 outlets returned.
             Top-5 names exactly match the spec:
               1. Gallops Restaurant
               2. Dominoz             (Domino's variant)
               3. Subway
               4. Lapinoz             (La Pino'z Pizza variant)
               5. Lord Petrick
             Tail (Adil Qadri … Waffle) is sorted alphabetical (case-insensitive). ✓

          B. Limbdi (lite=true, plaza_id=51114145-...) — 13 outlets.
             Top-3 = Gallops Restaurant, Domino's, La Pino'z Pizza.
             Tail alphabetical. ✓

          C. Mahuva (lite=true, plaza_id=ee40ae35-...) — exactly 1 outlet
             ("Gallops Restaurant"). ✓

          D. Tansa (lite=true, plaza_id=26f89939-...) — 9 outlets.
             Top-2 = Gallops Restaurant, La Pino'z Pizza.
             Tail alphabetical (Coffee Culture … Tea Post). ✓

          E. Anand (lite=true, plaza_id=930180f4-...) — 19 outlets.
             [0] = Gallops Restaurant; no other priority brand present;
             tail strictly alphabetical (Crunch Corner … WELCOME 36). ✓

          F. Full mode (no lite, plaza_id=Limbdi) — 13 outlets in same
             brand-priority order. Each outlet still includes
             `logo` / `image2` / `image3` / `description` keys (verified on
             every outlet, not just the first). ✓

  - task: "Brand-priority outlet sort on /api/bootstrap (CRITICAL FAIL — 500)"
    implemented: true
    working: false
    file: "backend/server.py"
    stuck_count: 1
    priority: "high"
    needs_retesting: true
    status_history:
      - working: false
        agent: "testing"
        comment: |
          ❌ CRITICAL: GET /api/bootstrap returns 500 Internal Server Error.

          Backend traceback (/var/log/supervisor/backend.err.log):
            File "/app/backend/server.py", line 508, in bootstrap
              outlets_raw = _sorted_outlets(outlets_raw)
            File "/app/backend/server.py", line 472, in _sorted_outlets
              return sorted(
            TypeError: '<' not supported between instances of
                       'datetime.datetime' and 'str'

          Root cause: the new tie-breaker `(o.get("created_at") or "")` in
          _sorted_outlets compares values across the whole outlets
          collection. Mongo stores `created_at` as a mix of native
          `datetime` (recent inserts via Pydantic `datetime.now(timezone.utc)`)
          and ISO `str` (older seed-script inserts). When two outlets share
          (priority, name) — or even just adjacent items during merge sort —
          Python attempts to compare these mixed types and crashes.

          Reproduction:
            GET /api/bootstrap                      → 500 (always)
            GET /api/outlets?lite=true (NO plaza)   → 500
            GET /api/outlets?plaza_id=<single plaza>&lite=true → 200
              (works only because per-plaza subsets happen to have
              consistent created_at types).
            GET /api/outlets (no lite, no plaza)    → 200
              (works because Outlet(**o) coerces created_at to datetime
              BEFORE _sorted_outlets is called.)

          Suggested fix for main agent (one-line):
            Replace
              (o.get("created_at") or "")
            with
              str(o.get("created_at") or "")
            in _sorted_outlets — strings sort consistently and the value
            is only a tie-breaker. OR coerce to datetime via
              isinstance(v, datetime) and v or datetime.fromisoformat(v).
            OR drop the created_at tie-breaker entirely (priority + name
            already produce a stable order).

          Impact: every cold-start of the customer app calls /bootstrap.
          With this 500 the home screen falls back to /api/plazas only and
          every plaza tap re-fetches outlets individually — defeats the
          performance optimisation. Must be fixed before release.

  - task: "Smoke regression (auth, privacy, terms, xlsx export, one-mobile-per-day)"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: |
          All 200 / behaviour intact:
            POST /api/auth/login admin@gallops.com / gfp@1234 → 200,
              3-part JWT in `token`. ✓
            GET  /api/privacy → 200, Content-Type text/html. ✓
            GET  /api/terms   → 200, Content-Type text/html. ✓
            GET  /api/admin/offer-claims/export with admin Bearer token
              → 200, Content-Type
              application/vnd.openxmlformats-officedocument.spreadsheetml.sheet. ✓
            POST /api/offer-claims (mobile=9812340099):
              1st call → 200, fresh 8-char token (H3DH373S),
                already_claimed absent.
              2nd call same mobile → 200, SAME id + SAME token,
                already_claimed=true (soft guard intact). ✓
            DELETE /api/admin/offer-claims/{id} → 200 (cleanup). ✓

agent_communication:
  - agent: "testing"
    message: |
      Brand-priority outlet sort regression — partial PASS, ONE CRITICAL FAIL.

      ✅ PASS (per-plaza ordering, both lite & full modes):
        A. Fedra lite top-5 = Gallops Restaurant, Dominoz, Subway, Lapinoz,
           Lord Petrick; tail alphabetical (20 outlets total).
        B. Limbdi lite top-3 = Gallops Restaurant, Domino's, La Pino'z Pizza;
           tail alphabetical.
        C. Mahuva lite = single outlet (Gallops Restaurant).
        D. Tansa lite top-2 = Gallops Restaurant, La Pino'z Pizza; tail
           alphabetical.
        E. Anand lite [0] = Gallops Restaurant; no other priority brand
           present; tail strictly alphabetical.
        F. Full /api/outlets?plaza_id=<Limbdi> returns the same brand-priority
           order AND every outlet still has logo/image2/image3/description keys.

      ❌ FAIL — G. /api/bootstrap returns 500.
        TypeError: '<' not supported between instances of 'datetime.datetime'
        and 'str' inside _sorted_outlets when sorting the GLOBAL outlets list
        (87 outlets across all plazas). Mongo stores `created_at` as a mix of
        native datetime objects and ISO strings depending on the writer
        (Pydantic insert vs. seed-script insert). The new tie-breaker
        `(o.get("created_at") or "")` compares mixed types and crashes.
        Same crash also affects GET /api/outlets?lite=true with NO plaza_id
        (works only when filtered to a single plaza).

      ✅ PASS — H. Smoke regression:
        - POST /api/auth/login admin@gallops.com / gfp@1234 → 200 + JWT.
        - GET /api/privacy & /api/terms → 200 HTML.
        - GET /api/admin/offer-claims/export → 200 xlsx content-type.
        - POST /api/offer-claims one-mobile-per-day soft guard intact;
          throwaway claim cleaned up via DELETE.

      Recommended one-line fix in /app/backend/server.py
      `_sorted_outlets`:
          (o.get("created_at") or "")   →   str(o.get("created_at") or "")
      Or drop created_at as a tie-breaker entirely (priority + name is already
      deterministic).

      No backend code was modified by testing. Cleanup complete.

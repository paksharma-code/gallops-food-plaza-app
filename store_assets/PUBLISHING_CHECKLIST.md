# 🚀 Gallops Food Plaza — Publishing Checklist

This is the **end-to-end** step-by-step playbook for publishing your app on **Google Play Store** + **Apple App Store**. Follow it top-to-bottom; everything is copy-paste-able.

> Estimated active time: **4–5 hours** spread across 2–3 days  
> One-time cost: **$25 (Google) + $99/year (Apple) = ~₹10,300**

---

## 0️⃣ One-time prerequisites (before anything else)

- [ ] **GitHub account** — free at https://github.com
- [ ] **Expo account** — free at https://expo.dev (sign up with the same email you'll use for the developer accounts)
- [ ] **Node.js 18+** installed on your local laptop
- [ ] **EAS CLI** installed:
  ```bash
  npm install -g eas-cli
  eas login
  ```
- [ ] **Google Play Developer Account** — $25 one-time at https://play.google.com/console/signup
- [ ] **Apple Developer Program** — $99/year at https://developer.apple.com/programs/enroll/  *(Apple manually verifies, can take 1–2 days)*

---

## 1️⃣ Export the code from Emergent → GitHub

In Emergent, click **"Save to GitHub"** in the top toolbar. Choose a new private repo, e.g. `gallops-food-plaza`. Once pushed, clone locally:

```bash
git clone https://github.com/<your-user>/gallops-food-plaza.git
cd gallops-food-plaza/frontend
yarn install
```

---

## 2️⃣ Configure EAS for the project

```bash
cd frontend
eas init           # binds the project to your Expo account, generates projectId
```

Verify `app.json` already has:
```json
"ios": { "bundleIdentifier": "com.gallops.foodplaza", "buildNumber": "1" },
"android": { "package": "com.gallops.foodplaza", "versionCode": 1 }
```

---

## 3️⃣ Build the apps in the cloud (EAS)

### Android — Internal testing AAB
```bash
eas build --platform android --profile production
```
This runs in EAS cloud (~15–20 min). When done, EAS gives you a download link to the **`.aab`** file.

### iOS — Production IPA
```bash
eas build --platform ios --profile production
```
First time, EAS will ask you to log in with your Apple ID and will auto-generate certificates / provisioning profiles for you. (~20–25 min). When done, EAS gives you a download link to the **`.ipa`** file.

---

## 4️⃣ Set up Google Play Console (Android)

1. Go to https://play.google.com/console → **Create app**
2. Fill:
   - **App name:** `Gallops Food Plaza`
   - **Default language:** English (India)
   - **App or game:** App
   - **Free or paid:** Free
   - Accept declarations → **Create**
3. Left menu → **App content** — fill out every section that has a red dot:
   - Privacy Policy URL: `https://gallops-reserve-dine.preview.emergentagent.com/api/privacy`
   - Ads: "No, my app does not contain ads"
   - App access: All functionality available without restricted access
   - Content rating: complete the questionnaire (everyone, no violence, no gambling, etc.)
   - Target audience: 18+ (or 13+ — your call; both work for restaurant content)
   - News app: No
   - COVID-19 contact tracing: No
   - Data safety: copy answers from `store_assets/play-store/data-safety-answers.txt` (auto-generated)
   - Government app: No
   - Financial features: No
4. Left menu → **Main store listing** — paste content from `store_assets/play-store/`:
   - **App name:** `Gallops Food Plaza`
   - **Short description:** copy from `short-description.txt`
   - **Full description:** copy from `full-description.txt`
   - **App icon:** upload `store_assets/icons/icon-1024.png`
   - **Feature graphic:** upload `store_assets/play-store/feature-graphic-1024x500.png`
   - **Phone screenshots:** upload all PNGs in `store_assets/screenshots/` (need at least 2, max 8)
   - **Category:** Food & Drink
5. Left menu → **Production → Releases → Create new release**
   - Upload your `.aab` from EAS
   - Release name: `1.0.0`
   - Release notes: "Initial release of Gallops Food Plaza app — discover plazas, claim daily offers, and book reservations across our highway food plazas."
   - **Save → Review release → Start rollout**

Review takes typically **2–6 hours** for a first release.

---

## 5️⃣ Set up App Store Connect (iOS)

1. Go to https://appstoreconnect.apple.com → **My Apps → +** → New App
2. Fill:
   - **Platform:** iOS
   - **Name:** `Gallops Food Plaza`
   - **Primary Language:** English (India)
   - **Bundle ID:** `com.gallops.foodplaza` (must match what EAS built)
   - **SKU:** `gallops-food-plaza-ios`
   - **User Access:** Full Access
3. **App Information** tab:
   - Category: Primary = Food & Drink, Secondary = Travel
   - Privacy Policy URL: `https://gallops-reserve-dine.preview.emergentagent.com/api/privacy`
4. **Pricing & Availability** → Free, all countries (or just India initially).
5. **Version 1.0** (left side) → fill from `store_assets/app-store/`:
   - **Promotional Text** → from `promotional-text.txt`
   - **Description** → from `description.txt`
   - **Keywords** → from `keywords.txt`
   - **Support URL** → e.g. `https://gallopsfoodplaza.com` or `mailto:Fedra@gallopsfoodplaza.in`
   - **App Store Icon** → upload `store_assets/icons/icon-1024.png`
   - **Screenshots** (6.5" iPhone — 1290x2796) → upload everything from `store_assets/screenshots/`
   - **App Review Information** → contact name, phone, email (in case Apple has questions)
   - **Sign-In Information** → if Apple needs to test admin features, you may want to give them dummy admin credentials. We recommend NOT linking the admin panel from the customer app for App Store; if asked, mention "This is a customer-only app — no login is required."
6. **Build** section → click + → select the build EAS uploaded → save.
7. Submit for review.

Review takes typically **24–48 hours** for a first iOS release.

---

## 6️⃣ After your apps are live

- [ ] Install both apps on real devices, smoke-test the full user flow.
- [ ] Share the Play Store + App Store links with your plaza managers and on social media.
- [ ] Plan ahead for **app updates**: any code change requires a new EAS build + a new submission. Re-use the same flow above (just bump `version` and `versionCode`/`buildNumber` in `app.json`).

---

## 7️⃣ Tracking downloads (after go-live)

- **Android:** https://play.google.com/console → Statistics → Installs by user
- **iOS:** https://appstoreconnect.apple.com → Analytics → Acquisition → App Units
- *(Optional — wire up Firebase Analytics later for unified dashboards.)*

---

## 🆘 Troubleshooting

| Symptom | Fix |
|--------|-----|
| EAS build fails with credentials error on iOS | Run `eas credentials` and re-generate the iOS distribution certificate |
| Play Console says "Privacy policy URL is not reachable" | Open the URL in incognito; ensure backend is up and `/privacy` returns HTML |
| App crashes on first open | Check `EXPO_PUBLIC_BACKEND_URL` in the built app — it must point at the production backend, not localhost |
| Apple rejects for "insufficient functionality" | Add 1–2 more screenshots showing different screens (offer flow, menu, reservation form) |

---

*Generated by AI dev agent on 28 April 2026.*  
*Update this file as you progress.*

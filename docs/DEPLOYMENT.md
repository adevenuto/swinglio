# Swinglio — Deployment Next Steps

## How It Works

Apple and Google never see your source code. EAS Build compiles your app on Expo's servers and produces binaries (`.ipa` for iOS, `.aab` for Android). You submit those binaries to the stores. Your Git repo is just for your own version control.

You **should** keep this in a private GitHub repo for backup, but it's not required by the stores.

---

## Pre-Flight Checklist (Code Readiness)

Before building, make sure the app is production-ready:

- [x] Remove debug `console.log` statements (keep `console.error` for diagnostics)
- [x] Add global `ErrorBoundary` wrapping the app (prevents white-screen crashes)
- [ ] Verify app icon and splash screen look correct on device
- [ ] Test full user flow end-to-end on a real device (not just Expo Go)
- [ ] Ensure no hardcoded localhost/dev URLs remain in code

---

## Step 1: Developer Accounts (Start Now — Takes Days)

These have approval wait times, so do them first.

- [ ] **Apple Developer Program** — [developer.apple.com/programs](https://developer.apple.com/programs/)
  - $99/year
  - Sign in with your Apple ID, complete identity verification
  - Approval takes 24-48 hours (sometimes longer)
  - Gives you access to App Store Connect + Certificates portal

- [ ] **Google Play Console** — [play.google.com/console/signup](https://play.google.com/console/signup)
  - One-time $25 fee
  - Complete identity verification (can take up to 48 hours)
  - Gives you access to create app listings

---

## Step 2: Install & Configure EAS

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Log in with your Expo account (create at expo.dev if needed)
eas login

# Link this project to your Expo account
eas init
```

### Set EAS Secrets (keeps sensitive values out of code)

```bash
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value "<your-supabase-url>" --scope project
eas secret:create --name EXPO_PUBLIC_SUPABASE_KEY --value "<your-supabase-anon-key>" --scope project
eas secret:create --name EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN --value "<your-mapbox-public-token>" --scope project
eas secret:create --name RNMAPBOX_MAPS_DOWNLOAD_TOKEN --value "<your-mapbox-secret-token>" --scope project
```

---

## Step 3: App Icons & Splash Screen

You need production-quality assets before submitting.

| Asset | Size | File |
|-------|------|------|
| App icon (both platforms) | 1024x1024 px | `assets/images/icon.png` |
| Android adaptive foreground | 1024x1024 px (content in center 66%) | `assets/images/android-icon-foreground.png` |
| Splash screen graphic | 200x200 px minimum | `assets/images/splash-icon.png` |

**Tools to create icons:**
- [Figma](https://figma.com) — design from scratch
- [Icon Kitchen](https://icon.kitchen) — free, generates all sizes
- [AppIcon.co](https://appicon.co) — upload 1024px, get all sizes

**Rules:**
- iOS icon: no transparency, no rounded corners (Apple adds them)
- Android adaptive: keep important content in the center 66% safe zone

---

## Step 4: Apple App Store Setup

Once your Apple Developer account is approved:

### Register Bundle ID
1. Go to [Identifiers](https://developer.apple.com/account/resources/identifiers/list)
2. Click **+** → **App IDs** → **App**
3. Description: `Swinglio`, Bundle ID: **Explicit** → `com.swinglio.app`
4. Register

### Enable Sign in with Apple
1. In the Bundle ID you just created (`com.swinglio.app`), check **Sign in with Apple** under Capabilities
2. Click Save

### Create Services ID (for Supabase OAuth)
1. Go to [Identifiers](https://developer.apple.com/account/resources/identifiers/list) → **+** → **Services IDs**
2. Description: `Swinglio Auth`, Identifier: `com.swinglio.app.auth`
3. Register, then click into it and enable **Sign in with Apple**
4. Click **Configure** next to Sign in with Apple:
   - Primary App ID: select `com.swinglio.app`
   - Domains: your Supabase project domain (e.g., `<project-ref>.supabase.co`)
   - Return URL: `https://<project-ref>.supabase.co/auth/v1/callback`
5. Save

### Create a Private Key for Apple Sign-In
1. Go to [Keys](https://developer.apple.com/account/resources/authkeys/list) → **+**
2. Name: `Swinglio Sign In`, enable **Sign in with Apple**
3. Click **Configure** → select `com.swinglio.app` as the Primary App ID → Save
4. Register → **Download** the `.p8` file (you can only download it once!)
5. Note the **Key ID** shown on the confirmation page

### Configure Supabase
1. In your Supabase dashboard → **Authentication** → **Providers** → **Apple**
2. Enable the provider and fill in:
   - **Services ID**: `com.swinglio.app.auth` (the Services ID, not the App ID)
   - **Secret Key**: paste the entire contents of the `.p8` file
   - **Key ID**: from the key you just created
   - **Team ID**: from [developer.apple.com/account](https://developer.apple.com/account) → Membership → Team ID
3. Save

> **Note:** Unlike Google, Apple doesn't give you a static client secret. Supabase uses the `.p8` key + Key ID + Team ID to generate a signed JWT automatically. No manual secret rotation needed.

### Create App in App Store Connect
1. Go to [App Store Connect](https://appstoreconnect.apple.com) → My Apps → **+** → New App
2. Platform: iOS
3. Name: **Swinglio**
4. Bundle ID: select `com.swinglio.app`
5. SKU: `swinglio-ios`
6. Create

### Update eas.json
Fill in the placeholders in `eas.json` → `submit.production.ios`:
- `appleId` — your Apple ID email
- `ascAppId` — from App Store Connect (the numeric app ID)
- `appleTeamId` — from [developer.apple.com/account](https://developer.apple.com/account) (Membership → Team ID)

---

## Step 5: Google Play Store Setup

Once your Google Play Console account is approved:

### Create App
1. Go to [Google Play Console](https://play.google.com/console) → **Create app**
2. App name: **Swinglio**, Language: English, Type: App, Free
3. Accept declarations → Create

### Set Up Service Account (for automated uploads)
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create project: "Swinglio Play Console"
3. Enable **Google Play Android Developer API** (APIs & Services → Library)
4. Create Service Account (IAM → Service Accounts → Create)
   - Name: `eas-submit`
5. Create JSON key → download as `play-store-key.json` in project root
   - Already in `.gitignore` — never commit this file
6. In Google Play Console → Settings → API access → Link Cloud project
7. Find service account → Grant access → **Admin** or **Release manager**

---

## Step 6: Build & Test

### Preview Build (test on real device first!)
```bash
# iOS preview (installs on real device via QR code)
eas build --platform ios --profile preview

# Android preview
eas build --platform android --profile preview
```

Install the preview builds and test everything end-to-end:
- [ ] Fresh sign-up flow works
- [ ] Google OAuth works
- [ ] Course search + nearby courses work (Mapbox)
- [ ] Start and complete a round
- [ ] Profile photo upload works
- [ ] No crashes

### Production Build
```bash
# Build both platforms
eas build --platform all --profile production
```

First iOS build: EAS will ask to manage Apple credentials — say **Yes** (let Expo handle it).

---

## Step 7: Submit to Stores

```bash
# Submit to Apple App Store (uploads to App Store Connect)
eas submit --platform ios --profile production

# Submit to Google Play (uploads to internal testing track)
eas submit --platform android --profile production
```

---

## Step 8: Store Listing Metadata

Before Apple/Google will approve your app, you need to fill out listing info.

### Both Stores Require
- [ ] **Privacy Policy** at a public URL (e.g. `https://swinglio.com/privacy`)
  - Cover: data collected (email, name, location, golf scores), how it's used, third parties (Supabase, Mapbox), data retention/deletion, contact info
  - Can use [Termly](https://termly.io) to generate one
- [ ] **Screenshots** — capture from a real device or simulator
- [ ] **App description** — what Swinglio does, key features
- [ ] **Category** — Sports
- [ ] **Age rating** — complete the questionnaire (likely 4+)

### Apple-Specific
- [ ] Screenshots for 6.7" (iPhone 15 Pro Max) and 6.5" (iPhone 11 Pro Max) at minimum
- [ ] Keywords (100 char max): `golf,scorecard,handicap,round tracker,golf stats`
- [ ] Support URL
- [ ] Demo account credentials for the App Review team

### Google-Specific
- [ ] Feature graphic (1024x500 px banner)
- [ ] Short description (80 chars)
- [ ] Content rating (IARC questionnaire)
- [ ] Data safety declaration (location, email, scores)

---

## Step 9: App Review

**Apple:** 24-48 hours typical, up to a week. Common rejection reasons:
- Crashes on launch
- Missing demo login credentials in review notes
- Incomplete features (every button must work)
- Missing privacy policy

**Google:** Few hours to 3 days. Start with internal testing track, then promote to production.

---

## Step 10: Post-Launch

- [ ] Test fresh install on a real device (not your dev device)
- [ ] Update Google OAuth redirect URIs for production bundle ID
- [ ] Verify Supabase and Mapbox work in production
- [ ] Consider adding crash reporting (`sentry-expo` or EAS Insights)
- [ ] Monitor store reviews and crash reports

---

## OTA Updates (Post-Launch)

After your app is live, you can push JavaScript-only fixes without going through App Store/Play Store review:

```bash
# Push an over-the-air update (JS changes only — no native code changes)
eas update --branch production --message "describe the fix"
```

This updates the app for existing users without a new store submission. Native code changes (new native modules, SDK version bumps, etc.) still require a full build + store submission.

---

## Quick Reference Commands

```bash
eas build --platform ios --profile production     # Build iOS
eas build --platform android --profile production  # Build Android
eas build --platform all --profile production      # Build both
eas submit --platform ios --profile production     # Submit to App Store
eas submit --platform android --profile production # Submit to Google Play
eas build:list                                     # Check build status
eas credentials                                    # Manage signing credentials
eas update --branch production --message "fix"     # OTA update (JS-only, no store review)
```

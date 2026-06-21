# Authentication Flow

## Tech Used

- **Supabase Auth** (`@supabase/supabase-js`) -- handles sign-up, sign-in, OAuth, session management
- **`expo-secure-store`** -- native token storage (iOS Keychain / Android Keystore)
- **`@react-native-async-storage/async-storage`** -- web fallback for token storage
- **`expo-web-browser`** -- opens system browser for Google OAuth flow
- **`expo-linking`** -- listens for `swinglio://` deep link callbacks

## Session Management

The Supabase client is initialized in `lib/supabase.ts` with the following auth config:

| Option | Value | Effect |
|---|---|---|
| `persistSession` | `true` | Session survives app restarts |
| `autoRefreshToken` | `true` | SDK auto-refreshes JWT before expiry |
| `detectSessionInUrl` | `false` | URL tokens handled manually in auth context |

**Token details:**

- Access tokens expire after **1 hour** (Supabase default)
- Refresh tokens persist until the user signs out or they are explicitly revoked
- The SDK transparently refreshes the access token using the refresh token before expiry

**Secure storage adapter** (`ExpoSecureStoreAdapter` in `lib/supabase.ts`):

- Native (iOS/Android): `expo-secure-store` -- stores tokens in Keychain/Keystore
- Web: `AsyncStorage` fallback

## Auth Methods

### Email/Password Sign-Up

1. User enters email and password
2. `supabase.auth.signUp({ email, password, options: { emailRedirectTo: "swinglio://" } })`
3. Supabase sends a verification email
4. User verifies email, then signs in normally

### Email/Password Sign-In

1. User enters email and password
2. `supabase.auth.signInWithPassword({ email, password })`
3. On success, auth context fetches the user's profile
4. Router redirects to dashboard

### Google OAuth

1. `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: "swinglio://", skipBrowserRedirect: true } })` returns an OAuth URL
2. `WebBrowser.openAuthSessionAsync(url, "swinglio://")` opens the system browser
3. After Google authentication, browser redirects to `swinglio://` with tokens in the URL fragment
4. Auth context extracts `access_token` and `refresh_token` from the fragment
5. `supabase.auth.setSession({ access_token, refresh_token })` establishes the session
6. React state is set immediately (session, user, profile) rather than waiting for `onAuthStateChange`

### Password Reset

1. User enters email on the forgot-password screen
2. `supabase.auth.resetPasswordForEmail(email)` sends an 8-digit OTP code via email
3. User enters the OTP code on the same screen
4. `supabase.auth.verifyOtp({ email, token: code, type: "recovery" })` verifies the code
5. Supabase fires a `PASSWORD_RECOVERY` event via `onAuthStateChange`
6. Auth context sets `isRecoveryMode = true`
7. Protected layout renders `ResetPasswordScreen` instead of normal tabs
8. User enters a new password
9. `supabase.auth.updateUser({ password })` updates the password
10. Supabase fires a `USER_UPDATED` event via `onAuthStateChange`
11. Auth context sets `isRecoveryMode = false` and shows a success toast
12. User is returned to the dashboard

## Flow Diagrams

### Sign-Up

```
User                App                      Supabase
  |-- enter email/pw -->|                         |
  |                     |-- signUp() ------------>|
  |                     |<-- success -------------|
  |                     |-- "Check your email" -->|
  |                                               |
  |<-------------- verification email ------------|
  |-- click link -------------------------------->|
  |                     |                         |-- email verified
  |-- sign in normally ->                         |
```

### Sign-In

```
User                App                      Supabase
  |-- enter email/pw -->|                         |
  |                     |-- signInWithPassword()->|
  |                     |<-- session -------------|
  |                     |-- fetchProfile() ------>|
  |                     |<-- profile data --------|
  |<-- redirect to      |                         |
  |   dashboard --------|                         |
```

### Google OAuth

```
User                App                      Supabase        Google
  |-- tap Google btn -->|                         |              |
  |                     |-- signInWithOAuth() --->|              |
  |                     |<-- OAuth URL -----------|              |
  |                     |-- open system browser --|------------->|
  |                     |                         |              |
  |<-- Google consent --|-------------------------|--------------|
  |-- authorize ------->|                         |              |
  |                     |<-- swinglio:// redirect (tokens in #fragment)
  |                     |-- setSession() -------->|              |
  |                     |<-- session -------------|              |
  |                     |-- fetchProfile() ------>|              |
  |<-- dashboard -------|                         |              |
```

### Password Reset

```
User                App                      Supabase
  |-- enter email ----->|                         |
  |                     |-- resetPasswordForEmail()-->|
  |                     |<-- success -------------|
  |<-------------- OTP email ---------------------|
  |-- enter OTP code -->|                         |
  |                     |-- verifyOtp() --------->|
  |                     |<-- PASSWORD_RECOVERY ---|
  |                     |-- isRecoveryMode=true   |
  |<-- reset pw screen -|                         |
  |-- enter new pw ---->|                         |
  |                     |-- updateUser({pw}) ---->|
  |                     |<-- USER_UPDATED --------|
  |                     |-- isRecoveryMode=false  |
  |<-- dashboard -------|                         |
```

## Supabase Dashboard Configuration

OAuth depends on **server-side** config in the Supabase dashboard
(**Authentication → URL Configuration**) that must stay in sync with the app's
custom URL scheme. This config is shared across local **and** production.

| Setting | Required value |
|---|---|
| **Site URL** | `swinglio://` |
| **Redirect URLs** (allow-list) | `swinglio://` (and/or `swinglio://**`) |

The app's scheme (`swinglio`) is defined in `app.json` (`scheme`) and registered
natively in `ios/Swinglio/Info.plist` (`CFBundleURLSchemes`). The redirect string
passed to `signInWithOAuth` / `openAuthSessionAsync` is set in
`contexts/auth-context.tsx` as `redirectUrl = "swinglio://"`.

> **Gotcha (debugged 2026-06-16):** If the app requests a `redirect_to` that is
> **not** on the allow-list, Supabase silently falls back to the **Site URL**.
> After the `testappcline` → `swinglio` rebrand the app code was updated but the
> dashboard still pointed at `testappcline://`, so OAuth completed and then
> redirected to the dead `testappcline://` scheme. The in-app browser showed
> *"Safari cannot open the page because the address is invalid"* (simulator) or a
> blank browser (device). It broke local and production at the same time because
> the URL config is server-side. **Any scheme/branding change must be mirrored in
> the Supabase dashboard.**

## Apple Sign-In & Account Identity

Sign in with Apple (`signInWithOAuth({ provider: "apple" })`) can create a
**separate** Supabase user from Google/password logins for the same person:

- Apple **"Hide My Email"** supplies a private relay address
  (e.g. `hk4gywz5vr@privaterelay.appleid.com`), not the user's real email.
- Supabase auto-links identities only when the **verified email matches**. Google
  returns the real email (links to the password account); Apple's relay email
  matches nothing, producing a new user.
- The relay address is **stable** per Apple-ID + app, so the Apple account is
  consistent — just separate.

**Planned fix (not yet implemented):** add an in-app "Link Apple" action in
Settings using `supabase.auth.linkIdentity({ provider: "apple" })` so both
identities attach to one user.

## Route Protection

### Auth Layout (`app/(auth)/_layout.tsx`)

- If the user **is** authenticated: redirects to `/(protected)/dashboard`
- If the user **is not** authenticated: renders sign-in, sign-up, and forgot-password screens

### Protected Layout (`app/(protected)/_layout.tsx`)

- If the user **is not** authenticated: redirects to `/(auth)/sign-in`
- If the user **needs onboarding** (no `first_name` in profile): renders `OnboardingScreen`
- If the user **is in recovery mode** (`PASSWORD_RECOVERY` event received): renders `ResetPasswordScreen`
- Otherwise: renders the normal tab navigation (dashboard, friends, stats, etc.)

## Key Files

| File | Purpose |
|---|---|
| `lib/supabase.ts` | Supabase client init, secure storage adapter |
| `contexts/auth-context.tsx` | Auth provider, session state, all auth methods, deep link handler |
| `app/(auth)/_layout.tsx` | Auth route group layout, redirects authenticated users |
| `app/(auth)/sign-in.tsx` | Sign-in screen |
| `app/(auth)/sign-up.tsx` | Sign-up screen |
| `app/(auth)/forgot-password.tsx` | Password reset screen (email + OTP entry) |
| `app/(protected)/_layout.tsx` | Protected route group layout, onboarding/recovery gates |
| `components/ResetPasswordScreen.tsx` | New password entry (shown during recovery mode) |
| `components/OnboardingScreen.tsx` | First-time user profile setup |

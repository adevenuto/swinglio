# React Native Authentication Setup Guide

This guide will help you set up Supabase authentication for your React Native application.

## Prerequisites

- Node.js and npm installed
- Expo CLI installed (`npm install -g expo-cli`)
- A Supabase account (create one at [supabase.com](https://supabase.com))

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in your project details:
   - Project name
   - Database password (save this securely)
   - Region (choose closest to your users)
4. Click "Create new project" and wait for setup to complete

## Step 2: Get Your Supabase Credentials

1. In your Supabase dashboard, go to **Settings > API**
2. Copy the following values:
   - `Project URL` (under Project API)
   - `anon public` key (under Project API keys)

## Step 3: Configure Environment Variables

1. Create a `.env` file in the root of your project:

   ```bash
   cp .env.example .env
   ```

2. Open `.env` and add your Supabase credentials:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your-project-url
   EXPO_PUBLIC_SUPABASE_KEY=your-anon-key
   ```

## Step 4: Enable Authentication Providers

### Email/Password Authentication

1. In your Supabase dashboard, go to **Authentication > Providers**
2. Email provider should be enabled by default
3. Configure email settings if needed under **Authentication > Email Templates**

### Google OAuth (Optional)

1. Go to **Authentication > Providers**
2. Enable "Google" provider
3. Follow Supabase's guide to set up Google OAuth credentials:
   - Create a project in [Google Cloud Console](https://console.cloud.google.com)
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URIs from Supabase
   - Copy Client ID and Client Secret to Supabase

4. Configure redirect URLs:
   - For development: Add your Expo development URL (e.g., `exp://localhost:8081`)
   - For production: Add your app's custom scheme

## Step 5: Install Dependencies

```bash
npm install
```

## Step 6: Start the Development Server

```bash
npm start
```

Then:

- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app for physical device

## Authentication Features

This boilerplate includes:

- ✅ Email/Password Sign Up
- ✅ Email/Password Sign In
- ✅ Google OAuth Sign In
- ✅ Protected Routes
- ✅ Persistent Authentication
- ✅ Secure Token Storage
- ✅ Sign Out Functionality

## Project Structure

```
app/
├── (auth)/              # Authentication screens
│   ├── sign-in.tsx     # Sign in page
│   ├── sign-up.tsx     # Sign up page
│   └── _layout.tsx     # Auth layout with redirect logic
├── (protected)/         # Protected routes
│   ├── dashboard.tsx   # Main dashboard
│   └── _layout.tsx     # Protected layout with auth check
├── _layout.tsx         # Root layout with AuthProvider
└── index.tsx           # Entry point with redirects

contexts/
└── auth-context.tsx    # Authentication context and hooks

lib/
└── supabase.ts         # Supabase client configuration
```

## Usage

### Using Authentication in Components

```typescript
import { useAuth } from "@/contexts/auth-context";

export default function MyComponent() {
  const { user, signOut, isLoading } = useAuth();

  if (isLoading) {
    return <ActivityIndicator />;
  }

  return (
    <View>
      <Text>Welcome {user?.email}</Text>
      <Button onPress={signOut} title="Sign Out" />
    </View>
  );
}
```

### Adding More Protected Routes

Add new screens in the `app/(protected)/` directory, and they'll automatically be protected by the auth layout.

## Troubleshooting

### Authentication not persisting

- Check that your environment variables are properly set
- Ensure `.env` file is in the root directory
- Restart the Expo development server after changing `.env`

### Google OAuth not working

- Verify redirect URLs are correctly configured in both Google Console and Supabase
- Check that the Google provider is enabled in Supabase
- Ensure Client ID and Client Secret are correctly entered

### Styling not applied

- Make sure you've run `npm install` to get all dependencies
- Clear cache with `npm start --clear`
- Check that `global.css` is imported in layouts

## Next Steps

- Customize the UI/styling with TailwindCSS classes
- Add password reset functionality
- Implement email verification flow
- Add profile management
- Set up Row Level Security (RLS) policies in Supabase
- Add more authentication providers (Apple, Facebook, etc.)

## Support

For issues with:

- Supabase: [Supabase Documentation](https://supabase.com/docs)
- Expo: [Expo Documentation](https://docs.expo.dev)
- NativeWind: [NativeWind Documentation](https://www.nativewind.dev)

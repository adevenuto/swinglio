# React Native Supabase Authentication Boilerplate

A production-ready React Native boilerplate with Supabase authentication, built with Expo Router and styled with TailwindCSS (NativeWind).

## Features

- ✅ **Email/Password Authentication** - Traditional sign up and sign in
- ✅ **Google OAuth** - One-click social authentication
- ✅ **Protected Routes** - Automatic route protection with Expo Router
- ✅ **Persistent Sessions** - Secure token storage with expo-secure-store
- ✅ **TailwindCSS Styling** - Rapid UI development with NativeWind
- ✅ **TypeScript** - Full type safety throughout the app
- ✅ **Cross-Platform** - iOS, Android, and Web support

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Supabase

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Add your Supabase credentials to `.env`:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your-project-url
   EXPO_PUBLIC_SUPABASE_KEY=your-anon-key
   ```

### 3. Start Development Server

```bash
npm start
```

For detailed setup instructions, see [SETUP.md](./SETUP.md).

## Project Structure

```
├── app/
│   ├── (auth)/             # Authentication screens
│   │   ├── sign-in.tsx
│   │   ├── sign-up.tsx
│   │   └── _layout.tsx
│   ├── (protected)/        # Protected routes
│   │   ├── dashboard.tsx
│   │   └── _layout.tsx
│   ├── _layout.tsx         # Root layout
│   └── index.tsx           # Entry point
├── contexts/
│   └── auth-context.tsx    # Auth context & hooks
├── lib/
│   └── supabase.ts         # Supabase client
└── components/             # Reusable components
```

## Technology Stack

- **[Expo](https://expo.dev)** - React Native framework
- **[Expo Router](https://docs.expo.dev/router/introduction/)** - File-based routing
- **[Supabase](https://supabase.com)** - Backend and authentication
- **[NativeWind](https://www.nativewind.dev/)** - TailwindCSS for React Native
- **[TypeScript](https://www.typescriptlang.org/)** - Type safety

## Available Scripts

- `npm start` - Start the Expo development server
- `npm run ios` - Start on iOS simulator
- `npm run android` - Start on Android emulator
- `npm run web` - Start web version
- `npm run lint` - Run ESLint

## Authentication Flow

1. **Initial Load** → Check for existing session
2. **Not Authenticated** → Redirect to sign-in page
3. **Sign Up/Sign In** → Create or verify credentials
4. **Authenticated** → Redirect to protected dashboard

## Usage Examples

### Using Auth Hook

```typescript
import { useAuth } from "@/contexts/auth-context";

export default function MyScreen() {
  const { user, signOut, isLoading } = useAuth();

  return (
    <View>
      <Text>Email: {user?.email}</Text>
      <Button onPress={signOut} title="Sign Out" />
    </View>
  );
}
```

### Creating Protected Routes

Simply add new screens to `app/(protected)/` directory - they'll automatically require authentication.

## Customization

### Styling

This boilerplate uses NativeWind (TailwindCSS). Modify styles using className:

```typescript
<View className="flex-1 bg-white p-4">
  <Text className="text-2xl font-bold">Hello</Text>
</View>
```

### Authentication Providers

Add more providers in `lib/supabase.ts` and `contexts/auth-context.tsx`:

- Apple
- Facebook
- GitHub
- And more...

## Security

- ✅ Tokens stored securely using expo-secure-store
- ✅ Auto token refresh enabled
- ✅ Environment variables for sensitive data
- ✅ No credentials in source code

## Next Steps

- [ ] Set up Supabase Row Level Security (RLS)
- [ ] Add password reset functionality
- [ ] Implement email verification
- [ ] Add user profile management
- [ ] Configure deep linking for OAuth
- [ ] Set up push notifications

## Documentation

- [Setup Guide](./SETUP.md) - Detailed setup instructions
- [Supabase Docs](https://supabase.com/docs)
- [Expo Router Docs](https://docs.expo.dev/router/introduction/)
- [NativeWind Docs](https://www.nativewind.dev/)

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

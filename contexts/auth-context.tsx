import { supabase } from "@/lib/supabase";
import { Session, User } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import React, { createContext, useContext, useEffect, useState } from "react";
import { toast } from "sonner-native";

WebBrowser.maybeCompleteAuthSession();

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isProfileLoaded: boolean;
  needsOnboarding: boolean;
  isRecoveryMode: boolean;
  role: string | null;
  isEditor: boolean;
  avatarUrl: string | null;
  displayName: string | null;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearRecoveryMode: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [isProfileLoaded, setIsProfileLoaded] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("role, avatar_url, first_name, display_name")
      .eq("id", userId)
      .single();
    setRole(data?.role ?? null);
    setAvatarUrl(data?.avatar_url ?? null);
    setDisplayName(data?.display_name || data?.first_name || null);
    setNeedsOnboarding(!data?.first_name);
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      }
      setIsProfileLoaded(true);
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      // Set recovery mode before session/user so it's batched in the same render
      if (_event === "PASSWORD_RECOVERY") {
        setIsRecoveryMode(true);
      }

      // Clear recovery mode when password update is confirmed by Supabase.
      // No need to check isRecoveryMode — setting false when already false is a no-op,
      // and this avoids stale closure issues since the callback is created once.
      if (_event === "USER_UPDATED") {
        setIsRecoveryMode(false);
        toast.success("Password reset successful");
      }

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        setIsProfileLoaded(false);
        fetchProfile(session.user.id).then(() => setIsProfileLoaded(true));
      } else {
        setRole(null);
        setAvatarUrl(null);
        setDisplayName(null);
        setNeedsOnboarding(false);
        setIsProfileLoaded(true);
      }

    });

    // Handle incoming deep links
    const handleUrl = async ({ url }: { url: string }) => {
      try {
        const urlObj = new URL(url);
        const hash = urlObj.hash.substring(1);
        const params = new URLSearchParams(hash);
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (error) {
            console.error("Error setting session:", error);
          }
        }
      } catch (err) {
        console.error("Error handling deep link:", err);
      }
    };

    // Listen for URL changes
    const urlSubscription = Linking.addEventListener("url", handleUrl);

    return () => {
      subscription.unsubscribe();
      urlSubscription.remove();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (!error && data?.session?.user) {
      await fetchProfile(data.session.user.id);
    }
    return { error };
  };

  const signInWithGoogle = async () => {
    try {
      const redirectUrl = "swinglio://";

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        return { error };
      }

      if (!data?.url) {
        return { error: new Error("No OAuth URL returned") };
      }

      if (Platform.OS === "android") {
        // Android: open external browser — Chrome Custom Tabs don't reliably
        // redirect back via custom schemes. The deep link listener
        // (handleUrl) will catch the swinglio:// redirect and set the session.
        await Linking.openURL(data.url);
        return { error: null };
      }

      // iOS: openAuthSessionAsync works correctly with custom schemes
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl,
      );

      if (result.type === "success") {
        const url = result.url;
        const params = new URLSearchParams(url.split("#")[1]);

        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");

        if (access_token && refresh_token) {
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (sessionError) {
            console.error("Error setting session:", sessionError);
            return { error: sessionError };
          }

          if (data.session) {
            setSession(data.session);
            setUser(data.session.user);
            await fetchProfile(data.session.user.id);
          }

          return { error: null };
        }
      }

      return { error: new Error("OAuth flow was cancelled") };
    } catch (error) {
      console.error("OAuth error:", error);
      return { error };
    }
  };

  const signOut = async () => {
    setRole(null);
    setAvatarUrl(null);
    setDisplayName(null);
    setNeedsOnboarding(false);
    setIsRecoveryMode(false);
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (user?.id) await fetchProfile(user.id);
  };

  const clearRecoveryMode = () => {
    setIsRecoveryMode(false);
  };

  const refreshUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    setSession(session);
    setUser(session?.user ?? null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isProfileLoaded,
        needsOnboarding,
        isRecoveryMode,
        role,
        isEditor: role === "editor",
        avatarUrl,
        displayName,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        refreshUser,
        refreshProfile,
        clearRecoveryMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

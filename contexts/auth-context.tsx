import { supabase } from "@/lib/supabase";
import { Session, User } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import React, { createContext, useContext, useEffect, useState } from "react";

WebBrowser.maybeCompleteAuthSession();

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  role: string | null;
  isEditor: boolean;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create a promise to track auth completion
let authPromise: ((value: any) => void) | null = null;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  const fetchRole = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();
    setRole(data?.role ?? null);
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchRole(session.user.id);
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("Auth state changed:", _event, session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchRole(session.user.id);
      } else {
        setRole(null);
      }

      // Resolve the auth promise when sign in is complete
      if (_event === "SIGNED_IN" && authPromise) {
        authPromise({ error: null });
        authPromise = null;
      }
    });

    // Handle incoming deep links
    const handleUrl = async ({ url }: { url: string }) => {
      console.log("Deep link received:", url);

      try {
        // Extract session from URL
        const urlObj = new URL(url);
        const hash = urlObj.hash.substring(1);

        console.log("Hash from URL:", hash);

        const params = new URLSearchParams(hash);
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");

        console.log("Tokens found:", {
          access_token: !!access_token,
          refresh_token: !!refresh_token,
        });

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          console.log("Session set result:", error);

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
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signInWithGoogle = async () => {
    try {
      const redirectUrl = "testappcline://";
      console.log("Redirect URL:", redirectUrl);

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

      console.log("Opening OAuth URL:", data.url);

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl,
      );

      console.log("WebBrowser result:", result);

      if (result.type === "success") {
        // Parse the URL directly from the result
        const url = result.url;
        const params = new URLSearchParams(url.split("#")[1]);

        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");

        console.log("Tokens found:", {
          access_token: !!access_token,
          refresh_token: !!refresh_token,
        });

        if (access_token && refresh_token) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (sessionError) {
            console.error("Error setting session:", sessionError);
            return { error: sessionError };
          }

          console.log("Session set successfully!");
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
    await supabase.auth.signOut();
  };

  const refreshUser = async () => {
    console.log("🔄 Refreshing user session...");
    const {
      data: { session },
    } = await supabase.auth.getSession();
    console.log("✅ Session refreshed:", {
      user: session?.user?.email,
      userId: session?.user?.id,
    });
    setSession(session);
    setUser(session?.user ?? null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        role,
        isEditor: role === "editor",
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        refreshUser,
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

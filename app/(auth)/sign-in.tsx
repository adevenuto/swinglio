import { Color, Font, Radius, Space } from "@/constants/design-tokens";
import { useAuth } from "@/contexts/auth-context";
import AntDesign from "@expo/vector-icons/AntDesign";
import { Link, router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const { signIn, signInWithGoogle } = useAuth();

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      Alert.alert("Sign In Failed", error.message);
    } else {
      router.replace("/(protected)/dashboard");
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();
    setLoading(false);

    if (error) {
      Alert.alert("Google Sign In Failed", error.message);
    } else {
      router.replace("/(protected)/dashboard");
    }
  };

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={styles.inner}>
          <Text style={styles.title}>Sign In</Text>
          <Text style={styles.subtitle}>Welcome back to the course</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[
                styles.input,
                focusedField === "email" && styles.inputFocused,
              ]}
              placeholder="Enter your email"
              placeholderTextColor={Color.neutral400}
              value={email}
              onChangeText={setEmail}
              onFocus={() => setFocusedField("email")}
              onBlur={() => setFocusedField(null)}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={[
                styles.input,
                focusedField === "password" && styles.inputFocused,
              ]}
              placeholder="Enter your password"
              placeholderTextColor={Color.neutral400}
              value={password}
              onChangeText={setPassword}
              onFocus={() => setFocusedField("password")}
              onBlur={() => setFocusedField(null)}
              secureTextEntry
              editable={!loading}
            />
          </View>

          <View style={styles.forgotRow}>
            <Link href="/(auth)/forgot-password" asChild>
              <Pressable>
                {({ pressed }) => (
                  <Text
                    style={[
                      styles.forgotLink,
                      pressed ? { opacity: 0.7 } : undefined,
                    ]}
                  >
                    Forgot Password?
                  </Text>
                )}
              </Pressable>
            </Link>
          </View>

          <Pressable
            style={[styles.primaryButton, loading && { opacity: 0.7 }]}
            onPress={handleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Color.white} />
            ) : (
              <Text style={styles.primaryButtonText}>Sign In</Text>
            )}
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            disabled={loading}
          >
            <AntDesign name="google" size={20} color={Color.neutral700} />
            <Text style={styles.googleButtonText}>Sign in with Google</Text>
          </Pressable>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Link href="/(auth)/sign-up" asChild>
              <Pressable>
                <Text style={styles.footerLink}>Sign Up</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Color.screenBg,
  },
  container: {
    flex: 1,
    justifyContent: "center",
  },
  inner: {
    paddingHorizontal: Space.lg,
  },
  title: {
    fontFamily: Font.bold,
    fontSize: 28,
    lineHeight: 34,
    color: Color.neutral900,
    textAlign: "center",
    marginBottom: Space.xs,
  },
  subtitle: {
    fontFamily: Font.regular,
    fontSize: 15,
    color: Color.neutral500,
    textAlign: "center",
    marginBottom: Space.xxl,
  },
  fieldGroup: {
    marginBottom: Space.lg,
  },
  label: {
    fontFamily: Font.medium,
    fontSize: 14,
    color: Color.neutral700,
    marginBottom: Space.sm,
  },
  input: {
    fontFamily: Font.regular,
    fontSize: 15,
    color: Color.neutral900,
    height: 52,
    borderWidth: 1,
    borderColor: Color.neutral300,
    borderRadius: Radius.lg,
    paddingHorizontal: Space.lg,
    backgroundColor: Color.white,
  },
  inputFocused: {
    borderColor: Color.primary,
    borderWidth: 2,
  },
  forgotRow: {
    alignItems: "flex-end",
    marginBottom: Space.sm,
  },
  forgotLink: {
    fontFamily: Font.medium,
    fontSize: 14,
    color: Color.primary,
  },
  primaryButton: {
    height: 52,
    borderRadius: Radius.lg,
    backgroundColor: Color.primary,
    justifyContent: "center",
    alignItems: "center",
    marginTop: Space.sm,
    marginBottom: Space.lg,
  },
  primaryButtonText: {
    fontFamily: Font.bold,
    fontSize: 16,
    color: Color.white,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Space.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Color.neutral300,
  },
  dividerText: {
    fontFamily: Font.regular,
    fontSize: 14,
    color: Color.neutral400,
    paddingHorizontal: Space.lg,
  },
  googleButton: {
    height: 52,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Color.neutral300,
    backgroundColor: Color.white,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Space.sm,
    marginBottom: Space.xl,
  },
  googleButtonText: {
    fontFamily: Font.semiBold,
    fontSize: 15,
    color: Color.neutral700,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
  },
  footerText: {
    fontFamily: Font.regular,
    fontSize: 14,
    color: Color.neutral500,
  },
  footerLink: {
    fontFamily: Font.semiBold,
    fontSize: 14,
    color: Color.primary,
  },
});

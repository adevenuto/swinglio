import GradientButton from "@/components/GradientButton";
import { Color, Font, Radius, Space } from "@/constants/design-tokens";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import AntDesign from "@expo/vector-icons/AntDesign";
import { Link, router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const { signUp, signInWithGoogle } = useAuth();

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password);
    setLoading(false);

    if (error) {
      Alert.alert("Sign Up Failed", error.message);
    } else {
      setSent(true);
    }
  };

  const handleVerifyCode = async () => {
    if (!code.trim()) {
      Alert.alert("Error", "Please enter the code from your email");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: "signup",
    });
    setLoading(false);

    if (error) {
      Alert.alert("Error", error.message);
    }
    // On success, onAuthStateChange fires → session established → auto-redirect
  };

  const handleResend = async () => {
    setLoading(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });
    setLoading(false);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Sent", "A new verification code has been sent to your email");
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

  if (sent) {
    return (
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={styles.inner}>
            <Text style={styles.title}>Check Your Email</Text>
            <Text style={styles.verifySubtitle}>
              We sent a verification code to {email}. Enter it below to verify
              your account.
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Verification Code</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.codeInput,
                  focusedField === "code" && styles.inputFocused,
                ]}
                placeholder="00000000"
                placeholderTextColor={Color.neutral400}
                value={code}
                onChangeText={setCode}
                onFocus={() => setFocusedField("code")}
                onBlur={() => setFocusedField(null)}
                keyboardType="number-pad"
                maxLength={8}
                editable={!loading}
              />
            </View>

            <GradientButton
              onPress={handleVerifyCode}
              label="Verify Code"
              loading={loading}
              disabled={loading}
            />

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Didn't get the email? </Text>
              <Pressable onPress={handleResend} disabled={loading}>
                {({ pressed }) => (
                  <Text
                    style={[
                      styles.footerLink,
                      pressed ? { opacity: 0.7 } : undefined,
                    ]}
                  >
                    Resend
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
        <View style={styles.inner}>
          <View style={styles.logoRow}>
            <Image
              source={require("@/assets/images/brand.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.subtitle}>
            Create your account to get started
          </Text>

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

          <View style={[styles.fieldGroup, { marginBottom: Space.xl }]}>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={[
                styles.input,
                focusedField === "confirm" && styles.inputFocused,
              ]}
              placeholder="Confirm your password"
              placeholderTextColor={Color.neutral400}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              onFocus={() => setFocusedField("confirm")}
              onBlur={() => setFocusedField(null)}
              secureTextEntry
              editable={!loading}
            />
          </View>

          <GradientButton
            onPress={handleSignUp}
            label="Sign Up"
            loading={loading}
            disabled={loading}
          />

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
            <Text style={styles.googleButtonText}>Sign up with Google</Text>
          </Pressable>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/(auth)/sign-in" asChild>
              <Pressable>
                <Text style={styles.footerLink}>Sign In</Text>
              </Pressable>
            </Link>
          </View>
        </View>
        </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Color.screenBg,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  inner: {
    paddingHorizontal: Space.lg,
  },
  logoRow: {
    alignItems: "center",
    marginBottom: Space.lg,
  },
  logo: {
    height: 72,
    width: 177,
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
    fontFamily: Font.medium,
    fontSize: 16,
    color: Color.neutral700,
    textAlign: "center",
    marginBottom: Space.xxl,
  },
  verifySubtitle: {
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
    letterSpacing: 0,
  },
  codeInput: {
    fontSize: 24,
    fontFamily: Font.semiBold,
    textAlign: "center",
    letterSpacing: 8,
  },
  inputFocused: {
    borderColor: Color.primary,
    borderWidth: 2,
  },
  primaryButton: {
    height: 52,
    borderRadius: Radius.lg,
    backgroundColor: Color.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Space.lg,
  },
  verifyButton: {
    height: 52,
    borderRadius: Radius.lg,
    backgroundColor: Color.primary,
    justifyContent: "center",
    alignItems: "center",
    marginTop: Space.sm,
    marginBottom: Space.xl,
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

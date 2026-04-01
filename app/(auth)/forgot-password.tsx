import GradientButton from "@/components/GradientButton";
import { Color, Font, Radius, Space } from "@/constants/design-tokens";
import { supabase } from "@/lib/supabase";
import { Link } from "expo-router";
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

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleSendReset = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);

    if (error) {
      Alert.alert("Error", error.message);
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
      type: "recovery",
    });
    setLoading(false);

    if (error) {
      Alert.alert("Error", error.message);
    }
    // On success, onAuthStateChange fires with PASSWORD_RECOVERY
    // → isRecoveryMode is set → auth layout redirects → ResetPasswordScreen shown
  };

  const handleResend = async () => {
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Sent", "A new code has been sent to your email");
    }
  };

  if (sent) {
    return (
      <View style={styles.screen}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.container}
        >
          <View style={styles.inner}>
            <Text style={styles.title}>Check Your Email</Text>
            <Text style={styles.subtitle}>
              We sent a code to {email}. Enter it below to reset your
              password.
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Reset Code</Text>
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
        </KeyboardAvoidingView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={styles.inner}>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            Enter your email to receive a reset code
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

          <GradientButton
            onPress={handleSendReset}
            label="Send Reset Code"
            loading={loading}
            disabled={loading}
          />

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Remember your password? </Text>
            <Link href="/(auth)/sign-in" asChild>
              <Pressable>
                <Text style={styles.footerLink}>Sign In</Text>
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
    marginTop: Space.sm,
    marginBottom: Space.xl,
  },
  primaryButtonText: {
    fontFamily: Font.bold,
    fontSize: 16,
    color: Color.white,
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

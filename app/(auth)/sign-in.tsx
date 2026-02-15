import { useAuth } from "@/contexts/auth-context";
import { Link, router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import "../../global.css";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
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
    }
  };

  return (
    <View className="flex-1 bg-white">
      <View className="flex-1 justify-center px-8">
        <Text className="text-3xl font-bold text-center mb-8">Sign In</Text>

        <View className="mb-4">
          <Text className="text-sm font-medium mb-2">Email</Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-3"
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
          />
        </View>

        <View className="mb-6">
          <Text className="text-sm font-medium mb-2">Password</Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-3"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
          />
        </View>

        <Pressable
          className="bg-blue-600 rounded-lg py-3 mb-4"
          onPress={handleSignIn}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white text-center font-semibold text-base">
              Sign In
            </Text>
          )}
        </Pressable>

        <View className="flex-row items-center mb-4">
          <View className="flex-1 h-px bg-gray-300" />
          <Text className="px-4 text-gray-500">or</Text>
          <View className="flex-1 h-px bg-gray-300" />
        </View>

        <Pressable
          className="border border-gray-300 rounded-lg py-3 mb-6"
          onPress={handleGoogleSignIn}
          disabled={loading}
        >
          <Text className="text-gray-700 text-center font-semibold text-base">
            Sign in with Google
          </Text>
        </Pressable>

        <View className="flex-row justify-center">
          <Text className="text-gray-600">Don't have an account? </Text>
          <Link href="/(auth)/sign-up" asChild>
            <Pressable>
              <Text className="text-blue-600 font-semibold">Sign Up</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </View>
  );
}

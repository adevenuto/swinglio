import { useAuth } from "@/contexts/auth-context";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Redirect based on authentication status
  if (user) {
    return <Redirect href="/(protected)/dashboard" />;
  }

  return <Redirect href="/(auth)/sign-in" />;
}

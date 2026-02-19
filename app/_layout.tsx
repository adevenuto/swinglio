import { AuthProvider } from "@/contexts/auth-context";
import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  DefaultTheme as PaperDefaultTheme,
  PaperProvider,
} from "react-native-paper";
import "react-native-reanimated";
import "../global.css";

const paperTheme = {
  ...PaperDefaultTheme,
  colors: {
    ...PaperDefaultTheme.colors,
    primary: "#1a1a1a",
    secondaryContainer: "#e5e5e5",
  },
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider value={DefaultTheme}>
        <PaperProvider theme={paperTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(protected)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="modal"
              options={{
                presentation: "modal",
                headerShown: true,
                title: "Modal",
              }}
            />
            <Stack.Screen
              name="create-league"
              options={{
                presentation: "modal",
                headerShown: true,
                title: "Create League",
                headerStyle: { backgroundColor: "#fff" },
                headerTintColor: "#1a1a1a",
                headerShadowVisible: false,
              }}
            />
            <Stack.Screen
              name="league-detail"
              options={{
                presentation: "modal",
                headerShown: true,
                title: "League Details",
                headerStyle: { backgroundColor: "#fff" },
                headerTintColor: "#1a1a1a",
                headerShadowVisible: false,
              }}
            />
            <Stack.Screen
              name="edit-game-config"
              options={{
                presentation: "modal",
                headerShown: true,
                title: "Edit Game Config",
                headerStyle: { backgroundColor: "#fff" },
                headerTintColor: "#1a1a1a",
                headerShadowVisible: false,
              }}
            />
            <Stack.Screen
              name="player-scores"
              options={{
                presentation: "modal",
                headerShown: true,
                title: "Player Scores",
                headerStyle: { backgroundColor: "#fff" },
                headerTintColor: "#1a1a1a",
                headerShadowVisible: false,
              }}
            />
            <Stack.Screen
              name="start-round"
              options={{
                presentation: "modal",
                headerShown: true,
                title: "Start Round",
                headerStyle: { backgroundColor: "#fff" },
                headerTintColor: "#1a1a1a",
                headerShadowVisible: false,
              }}
            />
            <Stack.Screen
              name="gameplay"
              options={{
                animation: "none",
                headerShown: true,
                title: "Round",
                headerBackTitle: "Dashboard",
                headerStyle: { backgroundColor: "#fff" },
                headerTintColor: "#1a1a1a",
                headerShadowVisible: false,
              }}
            />
          </Stack>
          <StatusBar style="auto" />
        </PaperProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

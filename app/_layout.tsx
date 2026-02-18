import { AuthProvider } from "@/contexts/auth-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { DefaultTheme as PaperDefaultTheme, PaperProvider } from "react-native-paper";

const paperTheme = {
  ...PaperDefaultTheme,
  colors: {
    ...PaperDefaultTheme.colors,
    primary: "#1a1a1a",
    secondaryContainer: "#e5e5e5",
  },
};
import "react-native-reanimated";
import "../global.css";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
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
          </Stack>
          <StatusBar style="auto" />
        </PaperProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

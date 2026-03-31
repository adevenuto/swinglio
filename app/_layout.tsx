import { Color, Font, Radius, Shadow, Space } from "@/constants/design-tokens";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/contexts/auth-context";
import { SubscriptionProvider } from "@/contexts/subscription-context";
import { PreferencesProvider } from "@/contexts/preferences-context";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import {
  Outfit_400Regular,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from "@expo-google-fonts/outfit";
import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  DefaultTheme as PaperDefaultTheme,
  PaperProvider,
  configureFonts,
} from "react-native-paper";
import "react-native-reanimated";
import { Toaster } from "sonner-native";

SplashScreen.preventAutoHideAsync();

const fontConfig = {
  displayLarge: { fontFamily: Font.displayBold },
  displayMedium: { fontFamily: Font.displayBold },
  displaySmall: { fontFamily: Font.displayBold },
  headlineLarge: { fontFamily: Font.displayBold },
  headlineMedium: { fontFamily: Font.displayBold },
  headlineSmall: { fontFamily: Font.displaySemiBold },
  titleLarge: { fontFamily: Font.displaySemiBold },
  titleMedium: { fontFamily: Font.semiBold },
  titleSmall: { fontFamily: Font.semiBold },
  bodyLarge: { fontFamily: Font.regular },
  bodyMedium: { fontFamily: Font.regular },
  bodySmall: { fontFamily: Font.regular },
  labelLarge: { fontFamily: Font.medium },
  labelMedium: { fontFamily: Font.medium },
  labelSmall: { fontFamily: Font.medium },
} as const;

const paperTheme = {
  ...PaperDefaultTheme,
  fonts: configureFonts({ config: fontConfig }),
  colors: {
    ...PaperDefaultTheme.colors,
    primary: Color.primary,
    secondaryContainer: Color.neutral100,
    surface: Color.white,
    surfaceVariant: Color.white,
    outline: Color.neutral300,
    outlineVariant: Color.neutral200,
    background: Color.neutral50,
  },
};

const headerStyle = { backgroundColor: Color.screenBg };
const headerTintColor = Color.neutral900;


export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Outfit_400Regular,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
      <AuthProvider>
        <SubscriptionProvider>
        <PreferencesProvider>
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
                    headerStyle,
                    headerTintColor,
                    headerShadowVisible: false,
                  }}
                />
                <Stack.Screen
                  name="player-scores"
                  options={{
                    presentation: "modal",
                    headerShown: true,
                    title: "Player Scores",
                    headerStyle,
                    headerTintColor,
                    headerShadowVisible: false,
                  }}
                />
                <Stack.Screen
                  name="start-round"
                  options={{
                    presentation: "modal",
                    headerShown: true,
                    title: "Start Round",
                    headerStyle,
                    headerTintColor,
                    headerShadowVisible: false,
                  }}
                />
                <Stack.Screen
                  name="gameplay"
                  options={{
                    animation: "none",
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="round-summary"
                  options={{
                    animation: "none",
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="round-history"
                  options={{
                    presentation: "modal",
                    headerShown: true,
                    title: "Round History",
                    headerStyle,
                    headerTintColor,
                    headerShadowVisible: false,
                  }}
                />
                <Stack.Screen
                  name="add-past-round"
                  options={{
                    presentation: "modal",
                    headerShown: true,
                    title: "Add Past Round",
                    headerStyle,
                    headerTintColor,
                    headerShadowVisible: false,
                  }}
                />
                <Stack.Screen
                  name="paywall"
                  options={{
                    presentation: "modal",
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="course-editor"
                  options={{
                    presentation: "modal",
                    headerShown: true,
                    title: "Course Editor",
                    headerStyle,
                    headerTintColor,
                    headerShadowVisible: false,
                  }}
                />
              </Stack>
              <StatusBar style="auto" />
            </PaperProvider>
          </ThemeProvider>
        </PreferencesProvider>
        </SubscriptionProvider>
      </AuthProvider>
      </ErrorBoundary>
      <Toaster
        position="top-center"
        offset={80}
        duration={3000}
        visibleToasts={1}
        toastOptions={{
          style: {
            backgroundColor: Color.white,
            borderRadius: Radius.md,
            paddingHorizontal: Space.xl,
            paddingVertical: Space.lg,
            ...Shadow.md,
          },
          titleStyle: {
            fontFamily: Font.semiBold,
            fontSize: 15,
            color: Color.neutral900,
          },
        }}
      />
    </GestureHandlerRootView>
  );
}

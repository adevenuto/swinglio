import { Color, Font } from "@/constants/design-tokens";
import { AuthProvider } from "@/contexts/auth-context";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
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

SplashScreen.preventAutoHideAsync();

const fontConfig = {
  displayLarge: { fontFamily: Font.bold },
  displayMedium: { fontFamily: Font.bold },
  displaySmall: { fontFamily: Font.bold },
  headlineLarge: { fontFamily: Font.bold },
  headlineMedium: { fontFamily: Font.bold },
  headlineSmall: { fontFamily: Font.bold },
  titleLarge: { fontFamily: Font.bold },
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
  },
};

const headerStyle = { backgroundColor: Color.screenBg };
const headerTintColor = Color.neutral900;

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

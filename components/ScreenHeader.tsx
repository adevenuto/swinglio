import { Color, Font, Space } from "@/constants/design-tokens";
import { useAuth } from "@/contexts/auth-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { Divider, Menu, Text } from "react-native-paper";

type ScreenHeaderProps = {
  title: string;
};

export default function ScreenHeader({ title }: ScreenHeaderProps) {
  const { isEditor, signOut } = useAuth();
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);

  const handleSignOut = () => {
    setMenuVisible(false);
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/(auth)/sign-in");
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {title}
      </Text>

      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={
          <Pressable
            onPress={() => setMenuVisible(true)}
            style={styles.menuButton}
          >
            <MaterialIcons name="menu" size={26} color={Color.neutral900} />
          </Pressable>
        }
        anchorPosition="bottom"
        contentStyle={styles.menuContent}
      >
        <Menu.Item
          onPress={() => {
            setMenuVisible(false);
            router.push("/(protected)/profile");
          }}
          title="Profile"
          leadingIcon="account"
        />
        {isEditor && (
          <Menu.Item
            onPress={() => {
              setMenuVisible(false);
              router.push("/(protected)/editor");
            }}
            title="Course Editor"
            leadingIcon="pencil"
          />
        )}
        <Menu.Item
          onPress={() => {
            setMenuVisible(false);
            router.push("/(protected)/settings");
          }}
          title="Settings"
          leadingIcon="cog"
        />
        <Divider />
        <Menu.Item
          onPress={handleSignOut}
          title="Sign Out"
          leadingIcon="logout"
          titleStyle={{ color: Color.danger }}
        />
      </Menu>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
  },
  title: {
    fontFamily: Font.bold,
    fontSize: 22,
    lineHeight: 28,
    color: Color.neutral900,
  },
  menuButton: {
    padding: Space.xs,
  },
  menuContent: {
    backgroundColor: Color.white,
  },
});

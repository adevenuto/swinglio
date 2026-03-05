import { Color, Font, Space } from "@/constants/design-tokens";
import { Link } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

export default function ModalScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>This is a modal</Text>
      <Link href="/" dismissTo style={styles.link}>
        <Text style={styles.linkText}>Go to home screen</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Space.lg,
    backgroundColor: Color.screenBg,
  },
  title: {
    fontFamily: Font.bold,
    fontSize: 22,
    color: Color.neutral900,
  },
  link: {
    marginTop: Space.md,
    paddingVertical: Space.md,
  },
  linkText: {
    fontFamily: Font.medium,
    fontSize: 16,
    color: Color.primary,
  },
});

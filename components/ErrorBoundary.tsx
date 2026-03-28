import GradientButton from "@/components/GradientButton";
import { Color, Font, Space } from "@/constants/design-tokens";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = { children: React.ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.body}>
            An unexpected error occurred. Please restart the app.
          </Text>
          <GradientButton
            onPress={this.handleRetry}
            label="Try Again"
          />
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Color.neutral50,
    padding: Space.xl,
  },
  title: {
    fontFamily: Font.displayBold,
    fontSize: 22,
    color: Color.neutral900,
    marginBottom: Space.md,
  },
  body: {
    fontFamily: Font.regular,
    fontSize: 15,
    color: Color.neutral500,
    textAlign: "center",
    marginBottom: Space.xl,
    lineHeight: 22,
  },
});

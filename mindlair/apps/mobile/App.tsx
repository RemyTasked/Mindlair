import { useEffect, useRef } from "react";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, View, ActivityIndicator } from "react-native";
import {
  NavigationContainer,
  NavigationContainerRef,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { HomeScreen } from "./src/screens/HomeScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { ShareReceiveScreen } from "./src/screens/ShareReceiveScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { FeedScreen } from "./src/screens/FeedScreen";
import { PublishScreen } from "./src/screens/PublishScreen";
import { VoiceCaptureScreen } from "./src/screens/VoiceCaptureScreen";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import {
  ShareIntentProvider,
  useShareIntent,
} from "./src/context/ShareIntentContext";
import { useCaptureDrain } from "./src/hooks/useCaptureDrain";

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  ShareReceive: { url?: string; text?: string; title?: string };
  Settings: undefined;
  Feed: undefined;
  Publish: undefined;
  VoiceCapture: { autoStart?: boolean } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppNavigator() {
  const { isLoggedIn, isLoading } = useAuth();
  const {
    sharedContent,
    voiceCaptureRequested,
    consumeVoiceCaptureRequest,
  } = useShareIntent();
  const navigationRef =
    useRef<NavigationContainerRef<RootStackParamList> | null>(null);

  // Drain iOS share extension queue (App Group) once authenticated, and on
  // every foreground transition. Pushes drained captures into ShareReceive.
  useCaptureDrain({
    enabled: isLoggedIn,
    onCapturesDrained: (drained) => {
      if (drained.length === 0) return;
      const first = drained[0];
      navigationRef.current?.navigate("ShareReceive", {
        url: first.payload.source?.url,
        text: first.payload.rawText,
        title: first.payload.source?.title,
      });
    },
  });

  // mindlair://voice-capture deep link / quick action / shortcut
  useEffect(() => {
    if (voiceCaptureRequested && isLoggedIn && navigationRef.current) {
      navigationRef.current.navigate("VoiceCapture", { autoStart: true });
      consumeVoiceCaptureRequest();
    }
  }, [voiceCaptureRequested, isLoggedIn, consumeVoiceCaptureRequest]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={(ref) => {
        navigationRef.current =
          ref as NavigationContainerRef<RootStackParamList> | null;
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: "#18181b" },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "600" },
          contentStyle: { backgroundColor: "#09090b" },
        }}
      >
        {!isLoggedIn ? (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : sharedContent ? (
          <Stack.Screen
            name="ShareReceive"
            component={ShareReceiveScreen}
            options={{ title: "Save to Mindlair" }}
            initialParams={{
              url: sharedContent.url,
              text: sharedContent.text,
              title: sharedContent.title,
            }}
          />
        ) : (
          <>
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ title: "Mindlair" }}
            />
            <Stack.Screen
              name="Feed"
              component={FeedScreen}
              options={{ title: "Feed" }}
            />
            <Stack.Screen
              name="Publish"
              component={PublishScreen}
              options={{ title: "Post" }}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{ title: "Settings" }}
            />
            <Stack.Screen
              name="VoiceCapture"
              component={VoiceCaptureScreen}
              options={{ title: "Voice Capture" }}
            />
            <Stack.Screen
              name="ShareReceive"
              component={ShareReceiveScreen}
              options={{ title: "Save to Mindlair" }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ShareIntentProvider>
          <AppNavigator />
          <StatusBar style="light" />
        </ShareIntentProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#09090b",
  },
});

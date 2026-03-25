import { StatusBar } from "expo-status-bar";
import { StyleSheet, View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { HomeScreen } from "./src/screens/HomeScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { ShareReceiveScreen } from "./src/screens/ShareReceiveScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { ShareIntentProvider, useShareIntent } from "./src/context/ShareIntentContext";

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  ShareReceive: { url?: string; text?: string; title?: string };
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppNavigator() {
  const { isLoggedIn, isLoading } = useAuth();
  const { sharedContent } = useShareIntent();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
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
          options={{ title: "Save to Mindlayer" }}
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
            options={{ title: "Mindlayer" }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ title: "Settings" }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ShareIntentProvider>
          <NavigationContainer>
            <AppNavigator />
            <StatusBar style="light" />
          </NavigationContainer>
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

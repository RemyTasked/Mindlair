import { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  Linking,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";

export function SettingsScreen() {
  const { logout, userId } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            setIsLoggingOut(true);
            await logout();
          },
        },
      ]
    );
  };

  const openWebDashboard = () => {
    Linking.openURL(process.env.EXPO_PUBLIC_WEB_URL || "http://localhost:3000/settings");
  };

  const openPrivacyPolicy = () => {
    Linking.openURL("https://mindlair.app/privacy");
  };

  const openTerms = () => {
    Linking.openURL("https://mindlair.app/terms");
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>User ID</Text>
              <Text style={styles.rowValue}>{userId || "Unknown"}</Text>
            </View>
            <TouchableOpacity style={styles.row} onPress={openWebDashboard}>
              <Text style={styles.rowLabel}>Full Settings</Text>
              <Text style={styles.rowAction}>Open Web Dashboard →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Version</Text>
              <Text style={styles.rowValue}>1.0.0</Text>
            </View>
            <TouchableOpacity style={styles.row} onPress={openPrivacyPolicy}>
              <Text style={styles.rowLabel}>Privacy Policy</Text>
              <Text style={styles.rowAction}>→</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.row} onPress={openTerms}>
              <Text style={styles.rowLabel}>Terms of Service</Text>
              <Text style={styles.rowAction}>→</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Share Extension Help */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How to Use</Text>
          <View style={styles.helpCard}>
            <Text style={styles.helpTitle}>Share Extension</Text>
            <Text style={styles.helpText}>
              1. Open any article in Safari or another app{"\n"}
              2. Tap the Share button{"\n"}
              3. Select "Mindlair" from the share sheet{"\n"}
              4. The article will be analyzed and claims extracted
            </Text>
          </View>
        </View>

        {/* Sign Out */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleLogout}
            disabled={isLoggingOut}
          >
            <Text style={styles.signOutText}>
              {isLoggingOut ? "Signing out..." : "Sign Out"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090b",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#71717a",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: "#18181b",
    borderRadius: 12,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#27272a",
  },
  rowLabel: {
    fontSize: 16,
    color: "#fafafa",
  },
  rowValue: {
    fontSize: 16,
    color: "#71717a",
  },
  rowAction: {
    fontSize: 16,
    color: "#10b981",
  },
  helpCard: {
    backgroundColor: "#18181b",
    borderRadius: 12,
    padding: 16,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fafafa",
    marginBottom: 12,
  },
  helpText: {
    fontSize: 14,
    color: "#a1a1aa",
    lineHeight: 22,
  },
  signOutButton: {
    backgroundColor: "#27272a",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  signOutText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ef4444",
  },
});

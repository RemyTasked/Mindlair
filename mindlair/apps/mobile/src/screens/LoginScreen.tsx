import { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";

export function LoginScreen() {
  const { login } = useAuth();
  const [apiKey, setApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!apiKey.trim()) {
      setError("Please enter your API key");
      return;
    }

    setIsLoading(true);
    setError(null);

    const success = await login(apiKey.trim());
    
    if (!success) {
      setError("Invalid API key. Please check and try again.");
    }
    
    setIsLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.content}
      >
        <View style={styles.header}>
          <Text style={styles.logo}>Mindlair</Text>
          <Text style={styles.tagline}>Map your evolving beliefs</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>API Key</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your API key"
            placeholderTextColor="#71717a"
            value={apiKey}
            onChangeText={setApiKey}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />
          
          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Connect</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.hint}>
            Get your API key from the Mindlair web dashboard under Settings.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090b",
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 48,
  },
  logo: {
    fontSize: 36,
    fontWeight: "700",
    color: "#fafafa",
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: "#a1a1aa",
  },
  form: {
    width: "100%",
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#fafafa",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#18181b",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#fafafa",
    borderWidth: 1,
    borderColor: "#27272a",
  },
  error: {
    color: "#ef4444",
    fontSize: 14,
    marginTop: 8,
  },
  button: {
    backgroundColor: "#10b981",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  hint: {
    color: "#71717a",
    fontSize: 14,
    textAlign: "center",
    marginTop: 24,
    lineHeight: 20,
  },
});

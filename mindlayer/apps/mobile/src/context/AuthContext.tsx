import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { api } from "../api/client";

interface AuthContextType {
  isLoggedIn: boolean;
  isLoading: boolean;
  userId: string | null;
  login: (apiKey: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const defaultContext: AuthContextType = {
  isLoggedIn: false,
  isLoading: true,
  userId: null,
  login: async () => false,
  logout: async () => {},
};

const Context = createContext<AuthContextType>(defaultContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const apiKey = await SecureStore.getItemAsync("api_key");
      const storedUserId = await SecureStore.getItemAsync("user_id");
      
      if (apiKey && storedUserId) {
        api.setApiKey(apiKey);
        setUserId(storedUserId);
        setIsLoggedIn(true);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (apiKey: string): Promise<boolean> => {
    try {
      api.setApiKey(apiKey);
      const response = await api.validateKey();
      
      if (response.valid && response.userId) {
        await SecureStore.setItemAsync("api_key", apiKey);
        await SecureStore.setItemAsync("user_id", response.userId);
        setUserId(response.userId);
        setIsLoggedIn(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Login failed:", error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync("api_key");
      await SecureStore.deleteItemAsync("user_id");
      api.clearApiKey();
      setUserId(null);
      setIsLoggedIn(false);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <Context.Provider value={{ isLoggedIn, isLoading, userId, login, logout }}>
      {children}
    </Context.Provider>
  );
}

export function useAuth() {
  return useContext(Context);
}

export const AuthContext = {
  Provider: AuthProvider,
};

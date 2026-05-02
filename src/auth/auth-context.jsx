import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { getProfile, login as loginRequest, signup as signupRequest } from "@/auth/api";
import { clearStoredToken, getStoredToken, setStoredToken } from "@/auth/token";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(token));

  useEffect(() => {
    async function loadProfile() {
      if (!token) {
        setUser(null);
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const data = await getProfile();
        setUser(data.user || null);
        setIsAuthenticated(true);
      } catch {
        clearStoredToken();
        setToken("");
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, [token]);

  async function signup(payload) {
    return signupRequest(payload);
  }

  async function login(payload) {
    const data = await loginRequest(payload);
    const nextToken = data.accessToken || "";
    setStoredToken(nextToken);
    setToken(nextToken);
    return data;
  }

  function logout() {
    clearStoredToken();
    setToken("");
    setUser(null);
    setIsAuthenticated(false);
  }

  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated,
      signup,
      login,
      logout,
      role: user?.role || "user",
    }),
    [user, token, isLoading, isAuthenticated],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}

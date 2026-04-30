import { createContext, useContext, useState, useEffect } from "react";
import PropTypes from "prop-types";
import { userApi } from "../services/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("accessToken"));
  const normalizeUser = (maybeWrapped) => {
    if (!maybeWrapped) return null;
    if (typeof maybeWrapped === "string") {
      try {
        maybeWrapped = JSON.parse(maybeWrapped);
      } catch (e) {
        return null;
      }
    }
    if (maybeWrapped && maybeWrapped.user) return maybeWrapped.user;
    return maybeWrapped;
  };

  const [user, setUser] = useState(() => {
    try {
      return normalizeUser(localStorage.getItem("user"));
    } catch (e) {
      return null;
    }
  });
  const [loading, setLoading] = useState(() => (token && !user) || false);

  // When token exists, try to load profile if we don't have it yet
  useEffect(() => {
    let mounted = true;
    if (token && !user) {
      setLoading(true);
      userApi
        .get("/api/users/profile")
        .then((res) => {
          if (!mounted) return;
          const profile = normalizeUser(res.data);
          setUser(profile);
          try {
            localStorage.setItem("user", JSON.stringify(profile));
          } catch (e) {
            /* ignore */
          }
        })
        .catch((err) => {
          console.error("Failed to load profile:", err.response?.data || err.message);
          // token may be invalid
          localStorage.removeItem("accessToken");
          setToken(null);
        })
        .finally(() => mounted && setLoading(false));
    }
    return () => {
      mounted = false;
    };
  }, [token]);

  const login = async (newToken) => {
    localStorage.setItem("accessToken", newToken);
    setToken(newToken);
    setLoading(true);
    try {
      const res = await userApi.get("/api/users/profile");
      const profile = normalizeUser(res.data);
      setUser(profile);
      try {
        localStorage.setItem("user", JSON.stringify(profile));
      } catch (e) {
        /* ignore */
      }
    } catch (err) {
      console.error("Profile load failed after login:", err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    // localStorage.clear();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const useAuth = () => useContext(AuthContext);

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { me } from "../api/auth";

type AuthState = {
  loggedIn: boolean;
  loading: boolean;
  login: (token: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthState>({
  loggedIn: false,
  loading: true,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    me()
      .then(() => setLoggedIn(true))
      .catch(() => {
        localStorage.removeItem("token");
        setLoggedIn(false);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback((token: string) => {
    localStorage.setItem("token", token);
    setLoggedIn(true);
    navigate("/drive");
  }, [navigate]);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setLoggedIn(false);
    navigate("/login");
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ loggedIn, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

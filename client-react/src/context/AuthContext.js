import { createContext, useContext, useState, useEffect } from "react";
import { fetchMe, login as apiLogin, register as apiRegister } from "../services/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!token) {
        setLoading(false);
        return;
      }

      const me = await fetchMe(token);
      if (!me) {
        localStorage.removeItem("token");
        setToken(null);
      }

      setLoading(false);
    }
    load();
  }, [token]);

  const login = async (username, password) => {
    const res = await apiLogin(username, password);
    if (res.token) {
      localStorage.setItem("token", res.token);
      setToken(res.token);
    }
    return res;
  };

  const register = async (username, password) => {
    return await apiRegister(username, password);
  };

  return (
    <AuthContext.Provider value={{ token, loading, login, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}


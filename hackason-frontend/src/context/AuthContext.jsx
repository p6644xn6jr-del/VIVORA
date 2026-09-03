import { createContext, useContext, useEffect, useState } from "react";
import {
  getStoredSession,
  getStoredUser,
  login as apiLogin,
  logout as apiLogout,
} from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => getStoredSession());
  const [user, setUser] = useState(() => getStoredUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSession(getStoredSession());
    setUser(getStoredUser());
    setLoading(false);
  }, []);

  const signIn = async (email, password) => {
    const result = await apiLogin(email, password);
    setSession(result.session);
    setUser(result.user);
    return result;
  };

  const signOut = () => {
    apiLogout();
    setSession(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoggedIn: Boolean(session?.access_token && user),
        loading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}

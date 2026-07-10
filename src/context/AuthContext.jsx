import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authApi, saveSession, getStoredUser, getToken, clearSession, ApiError } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser());
  const [checkingSession, setCheckingSession] = useState(true);

  // Al montar la app, si hay un token guardado, confirmamos contra el BFF
  // que la sesión sigue siendo válida (puede haber expirado entre visitas).
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setCheckingSession(false);
      return;
    }
    authApi
      .session()
      .then(() => setCheckingSession(false))
      .catch(() => {
        clearSession();
        setUser(null);
        setCheckingSession(false);
      });
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await authApi.login(email, password);
    saveSession({ access_token: data.access_token, refresh_token: data.refresh_token, user: data.user });
    setUser(data.user);
    return data.user;
  }, []);

  // Grupo 2 crea el usuario en /register, pero el BFF no persiste esa
  // sesión (solo /login lo hace) — por eso, tras registrar, hacemos login
  // de inmediato con las mismas credenciales para dejar al usuario
  // autenticado sin que tenga que escribir sus datos dos veces.
  const register = useCallback(
    async (email, password, fullName) => {
      await authApi.register(email, password, fullName);
      return login(email, password);
    },
    [login]
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Si el logout upstream falla igual limpiamos la sesión local.
    }
    clearSession();
    setUser(null);
  }, []);

  const value = {
    user,
    isAuthenticated: !!user,
    checkingSession,
    login,
    register,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}

export { ApiError };

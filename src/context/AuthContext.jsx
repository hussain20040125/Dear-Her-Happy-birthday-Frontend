import { createContext, useContext, useEffect, useState } from 'react';
import { api, TOKEN_KEY } from '../api';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) { setReady(true); return; }
    api('/auth/me')
      .then(({ user }) => setUser(user))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setReady(true));
  }, []);

  const finish = ({ token, user }) => { localStorage.setItem(TOKEN_KEY, token); setUser(user); };
  const login = (email, password) => api('/auth/login', { method: 'POST', body: { email, password } }).then(finish);
  const register = (name, email, password) => api('/auth/register', { method: 'POST', body: { name, email, password } }).then(finish);
  const logout = () => { localStorage.removeItem(TOKEN_KEY); setUser(null); };

  return <AuthCtx.Provider value={{ user, ready, login, register, logout }}>{children}</AuthCtx.Provider>;
}

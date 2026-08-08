"use client";

import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { apiFetch } from "@/lib/api";

const TOKEN_STORAGE_KEY = "cardsync_token";
const EMAIL_STORAGE_KEY = "cardsync_email";

type AuthResponse = {
  token: string;
  email: string;
};

type AuthState = {
  token: string | null;
  email: string | null;
  // False only for the transient pre-hydration render (matches getServerSnapshot).
  // Consumers must wait for this before treating a null token as "logged out" —
  // otherwise a fresh page load briefly reports token=null and redirects to
  // /login before the real localStorage value has been read.
  ready: boolean;
};

const SERVER_SNAPSHOT: AuthState = { token: null, email: null, ready: false };

let state: AuthState = SERVER_SNAPSHOT;
let initialized = false;
const listeners = new Set<() => void>();

function getSnapshot(): AuthState {
  if (!initialized) {
    state = {
      token: localStorage.getItem(TOKEN_STORAGE_KEY),
      email: localStorage.getItem(EMAIL_STORAGE_KEY),
      ready: true,
    };
    initialized = true;
  }
  return state;
}

function getServerSnapshot(): AuthState {
  return SERVER_SNAPSHOT;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setAuthState(next: Omit<AuthState, "ready">) {
  state = { ...next, ready: true };
  if (next.token && next.email) {
    localStorage.setItem(TOKEN_STORAGE_KEY, next.token);
    localStorage.setItem(EMAIL_STORAGE_KEY, next.email);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(EMAIL_STORAGE_KEY);
  }
  listeners.forEach((listener) => listener());
}

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  async function login(email: string, password: string) {
    const res = await apiFetch<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setAuthState({ token: res.token, email: res.email });
  }

  async function register(email: string, password: string) {
    const res = await apiFetch<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setAuthState({ token: res.token, email: res.email });
  }

  function logout() {
    setAuthState({ token: null, email: null });
  }

  return (
    <AuthContext.Provider value={{ ...auth, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

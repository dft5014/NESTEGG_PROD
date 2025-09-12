// context/AuthContext.js
import { createContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { API_BASE_URL, fetchWithAuth } from "@/utils/api";

// Clerk
import { useAuth, useUser, ClerkLoaded } from "@clerk/nextjs";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const router = useRouter();
  const { isSignedIn, getToken, signOut } = useAuth();
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();

  const [user, setUser] = useState(null);            // Your /user payload
  const [loading, setLoading] = useState(true);

  // --- Helper: exchange Clerk → app token, store it, return token
  const exchangeFromClerk = useCallback(async () => {
    try {
      const cJwt = await getToken?.();
      if (!cJwt) return null;
      const res = await fetch(`${API_BASE_URL}/auth/exchange`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clerk_jwt: cJwt }),
      });
      const txt = await res.text();
      if (!res.ok) throw new Error(`[exchange] ${res.status} ${txt}`);
      const data = JSON.parse(txt);
      localStorage.setItem("token", data.access_token);
      try { window.dispatchEvent(new CustomEvent("auth-login")); } catch {}
      return data.access_token;
    } catch (e) {
      console.warn("[AuthContext] Clerk exchange failed:", e);
      return null;
    }
  }, [getToken]);

  // --- Helper: fetch /user with a token
  const fetchUserWithToken = useCallback(async (token) => {
    const resp = await fetch(`${API_BASE_URL}/user`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) throw new Error(`/user ${resp.status}`);
    return await resp.json();
  }, []);

  // Bootstrap on first load:
  useEffect(() => {
    (async () => {
      setLoading(true);

      try {
        let token = localStorage.getItem("token");

        // 1) Legacy token path
        if (token) {
          try {
            const u = await fetchUserWithToken(token);
            setUser(u);
            setLoading(false);
            return;
          } catch (e) {
            console.log("[AuthContext] stored token invalid, clearing:", e?.message);
            localStorage.removeItem("token");
            token = null;
          }
        }

        // 2) No app token → try Clerk
        const exchanged = await exchangeFromClerk();
        if (exchanged) {
          const u = await fetchUserWithToken(exchanged);
          setUser(u);
          // notify app that an authenticated session is ready
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("auth-login"));
          }
          setLoading(false);
          return;
        }

        // 3) Not authenticated
        setUser(null);
      } catch (e) {
        console.warn("[AuthContext] bootstrap error:", e);
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [isClerkLoaded, isSignedIn, exchangeFromClerk, fetchUserWithToken]);

  // Public API: legacy login (unchanged)
  const login = async (email, password) => {
    try {
      const res = await fetch(`${API_BASE_URL}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username: email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Login failed");
      localStorage.setItem("token", data.access_token);

      const u = await fetchUserWithToken(data.access_token);
      setUser(u);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth-login"));
      }
      return { success: true };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: error.message };
    }
  };

  // Public API: legacy signup (unchanged)
  const signup = async (email, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || "Signup failed");
      }
      return { success: true };
    } catch (error) {
      console.error("Signup error:", error);
      return { success: false, error: error.message };
    }
  };

  // Public API: logout (clears both app + Clerk)
  const APP_NS = "ne:"; // prefix all NestEgg keys with this going forward

  function hardClearClientState() {
    try {
      // Remove all app-namespaced keys
      const toRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        if (k === "token" || k.startsWith(APP_NS) || k.startsWith("ds:")) {
          toRemove.push(k);
        }
      }
      toRemove.forEach(k => localStorage.removeItem(k));

      // If you persist to sessionStorage/IndexedDB, clear here as well
      // e.g., indexedDB.deleteDatabase('NestEggDB');

      // Nudge other tabs + local listeners
      window.dispatchEvent(new CustomEvent("auth-logout"));
      // Also trigger cross-tab via a bump key
      localStorage.setItem("ne:lastLogout", String(Date.now()));
    } catch (e) {
      console.warn("[AuthContext] hardClearClientState error:", e);
    }
  }

  const logout = async () => {
    try {
      hardClearClientState();
      setUser(null);

      if (isSignedIn) {
        await signOut({ redirectUrl: "/login" }); // Clerk sign-out
        return;
      }
    } catch (e) {
      console.warn("[AuthContext] logout error:", e);
    }
    router.push("/login");
  };

  // Token-aware fetch that auto-retries once by re-exchanging Clerk
  const fetchAuthed = useCallback(
    async (input, init = {}) => {
      const raw = localStorage.getItem("token");
      const headers = {
        ...(init.headers || {}),
        ...(raw ? { Authorization: `Bearer ${raw}` } : {}),
      };

      // ensure no-store and pass through signal/mode/etc.
      const baseInit = { cache: 'no-store', mode: 'cors', ...init, headers };

      let resp = await fetch(`${API_BASE_URL}${input}`, baseInit);
      if (resp.status === 401 && isSignedIn) {
        const newToken = await exchangeFromClerk();
        if (newToken) {
          const retryHeaders = { ...(init.headers || {}), Authorization: `Bearer ${newToken}` };
          resp = await fetch(`${API_BASE_URL}${input}`, { ...baseInit, headers: retryHeaders });
        }
      }
      return resp;
    },
    [exchangeFromClerk, isSignedIn]
  );

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "token" && e.newValue === null) {
        // Token removed in another tab
        setUser(null);
        window.dispatchEvent(new CustomEvent("auth-logout"));
        router.push("/login");
      }
      if (e.key === "ne:lastLogout") {
        setUser(null);
        window.dispatchEvent(new CustomEvent("auth-logout"));
        router.push("/login");
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [router]);

  // Watch Clerk's auth state directly
  useEffect(() => {
    if (!isSignedIn) {
      const hasToken =
        typeof window !== "undefined" && localStorage.getItem("token");
      if (hasToken) {
        try {
          hardClearClientState();
        } catch {}
      }
    }
  }, [isSignedIn]);

  return (
    <ClerkLoaded> {/* avoid hydration issues */}
      <AuthContext.Provider
        value={{
          user,
          setUser,
          loading,
          login,
          logout,
          signup,
          // Expose a token-refreshing fetch for callers that want it
          fetchAuthed,
          // Optional: surface Clerk info if needed by UI
          isClerkSignedIn: isSignedIn,
          clerkUser,
        }}
      >
        {children}
      </AuthContext.Provider>
    </ClerkLoaded>
  );
};

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
        if (!token && isClerkLoaded && isSignedIn) {
          const exchanged = await exchangeFromClerk();
          if (exchanged) {
            const u = await fetchUserWithToken(exchanged);
            setUser(u);
            setLoading(false);
            return;
          }
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
  const logout = async () => {
    try {
      localStorage.removeItem("token");
      setUser(null);

      // Notify DataStore
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth-logout"));
      }

      if (isSignedIn) {
        // Sign out of Clerk session too
        await signOut({ redirectUrl: "/login" });
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

      let resp = await fetch(`${API_BASE_URL}${input}`, { ...init, headers });
      if (resp.status === 401 && isSignedIn) {
        // refresh app token from Clerk
        const newToken = await exchangeFromClerk();
        if (newToken) {
          const retryHeaders = { ...(init.headers || {}), Authorization: `Bearer ${newToken}` };
          resp = await fetch(`${API_BASE_URL}${input}`, { ...init, headers: retryHeaders });
        }
      }
      return resp;
    },
    [exchangeFromClerk, isSignedIn]
  );

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

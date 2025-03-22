import { createContext, useState, useEffect } from "react";
import { useRouter } from "next/router";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const API_BASE_URL = "http://127.0.0.1:8000";

  useEffect(() => {
    // Check if user is authenticated on initial load
    const checkAuth = async () => {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      if (token) {
        try {
          const response = await fetch(`${API_BASE_URL}/user`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
          } else {
            logout();
          }
        } catch (error) {
          console.error("Authentication error:", error);
          logout();
        }
      }
      
      setLoading(false);
    };
    
    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          username: email,
          password: password,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem("token", data.access_token);
        
        // Get user data
        const userResponse = await fetch(`${API_BASE_URL}/user`, {
          headers: { Authorization: `Bearer ${data.access_token}` },
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUser(userData);
          return { success: true };
        } else {
          throw new Error("Failed to fetch user data");
        }
      } else {
        throw new Error(data.detail || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    router.push("/login");
  };

  const signup = async (email, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        return { success: true };
      } else {
        const data = await response.json();
        throw new Error(data.detail || "Signup failed");
      }
    } catch (error) {
      console.error("Signup error:", error);
      return { success: false, error: error.message };
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, logout, signup }}>
      {children}
    </AuthContext.Provider>
  );
};
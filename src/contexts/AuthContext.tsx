import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface User {
  id: string;
  username: string;
  email: string;
  isPremium: boolean;
  gender?: 'male' | 'female' | 'other';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  upgradeToPremium: (plan: string) => Promise<void>;
  refreshUser: (authToken?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Stable HTTP IP for network access
const API_URL = import.meta.env.VITE_API_URL || "/api"; 

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load token from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("echochat_token");
    if (storedToken) {
      setToken(storedToken);
      refreshUser(storedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  // 👇 FIX: Effect to handle browser closure/page unload synchronously
  useEffect(() => {
    const handleUnload = () => {
      const currentToken = localStorage.getItem("echochat_token");
      if (currentToken) {
        // Use synchronous XMLHttpRequest (XHR) on unload. 
        // This is the only reliable way to send a logout request with headers
        // that completes before the browser tab is fully closed.
        const xhr = new XMLHttpRequest();
        // Set the request to synchronous ('false' argument)
        xhr.open("POST", `${API_URL}/auth/logout`, false); 
        xhr.setRequestHeader("Authorization", `Bearer ${currentToken}`);
        xhr.send();
        
        // Clean up localStorage immediately
        localStorage.removeItem("echochat_token");
      }
    };

    // Attach listener to the window unload event
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, []);

  const refreshUser = async (authToken?: string) => {
    const authTokenToUse = authToken || token;
    if (!authTokenToUse) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${authTokenToUse}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        // Token invalid, clear it
        localStorage.removeItem("echochat_token");
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error("Error refreshing user:", error);
      localStorage.removeItem("echochat_token");
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Login failed");
    }

    const data = await response.json();
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem("echochat_token", data.token);
  };

  const signup = async (username: string, email: string, password: string) => {
    const response = await fetch(`${API_URL}/auth/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Signup failed");
    }

    const data = await response.json();
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem("echochat_token", data.token);
  };

  const logout = async () => {
    if (token) {
      try {
        await fetch(`${API_URL}/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (error) {
        console.error("Error during logout:", error);
      }
    }
    localStorage.removeItem("echochat_token");
    setToken(null);
    setUser(null);
  };

  const upgradeToPremium = async (plan: string) => {
    if (!token) {
      throw new Error("Not authenticated");
    }

    const response = await fetch(`${API_URL}/auth/upgrade`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ plan }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Upgrade failed");
    }

    const data = await response.json();
    setUser(data.user);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        signup,
        logout,
        upgradeToPremium,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
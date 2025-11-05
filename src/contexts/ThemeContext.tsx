import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "monochrome" | "ocean" | "forest" | "sunset" | "purple" | "emerald" | "rose" | "monochrome-dark" | "ocean-dark" | "forest-dark" | "sunset-dark" | "purple-dark" | "emerald-dark" | "rose-dark";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const storedTheme = localStorage.getItem("app-theme");
    return (storedTheme as Theme) || "monochrome-dark"; // Default theme
  });

  useEffect(() => {
    document.documentElement.className = ""; // Clear existing classes
    document.documentElement.classList.add(theme);
    localStorage.setItem("app-theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
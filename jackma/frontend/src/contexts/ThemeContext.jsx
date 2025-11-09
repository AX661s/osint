import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const themes = {
  cyber: {
    name: 'Cyber Green',
    primary: '180 100% 42%',           // Bright Cyan #00D5D5
    secondary: '174 72% 35%',          // Teal #1A9B8E
    accent: '150 100% 45%',            // Neon Green #00E673
    background: '222 47% 4%',          // Deep dark blue-black
    gradient: 'linear-gradient(135deg, hsl(180 100% 42%), hsl(174 72% 35%), hsl(150 100% 45%))',
  },
  purple: {
    name: 'Dark Purple',
    primary: '270 100% 65%',           // Vibrant Purple #9D4EDD
    secondary: '280 85% 55%',          // Deep Purple #B24BF3
    accent: '290 100% 70%',            // Pink Purple #E879F9
    background: '260 50% 6%',          // Very dark purple-black
    gradient: 'linear-gradient(135deg, hsl(270 100% 65%), hsl(280 85% 55%), hsl(290 100% 70%))',
  },
  dark: {
    name: 'Cool Black',
    primary: '0 100% 60%',             // Bright Red #FF3333
    secondary: '0 85% 50%',            // Deep Red #D91414
    accent: '15 100% 65%',             // Orange Red #FF5C33
    background: '0 0% 5%',             // Almost pure black
    gradient: 'linear-gradient(135deg, hsl(0 100% 60%), hsl(0 85% 50%), hsl(15 100% 65%))',
  },
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState('cyber');

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('osint-theme');
    if (savedTheme && themes[savedTheme]) {
      setCurrentTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    // Apply theme to CSS variables
    const theme = themes[currentTheme];
    const root = document.documentElement;
    
    root.style.setProperty('--primary', theme.primary);
    root.style.setProperty('--secondary', theme.secondary);
    root.style.setProperty('--accent', theme.accent);
    root.style.setProperty('--background', theme.background);
    root.style.setProperty('--gradient-cyber', theme.gradient);
    
    // Save to localStorage
    localStorage.setItem('osint-theme', currentTheme);
  }, [currentTheme]);

  const changeTheme = (themeName) => {
    if (themes[themeName]) {
      setCurrentTheme(themeName);
    }
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, changeTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  );
};

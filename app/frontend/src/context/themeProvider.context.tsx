import { createContext, useEffect, useState } from 'react';

// Create the context with default values
const ThemeContext = createContext(null);

const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    const initial = saved || (systemDark ? 'dark' : 'light');
    setTheme(initial);
    setHTMLThemeAttr(initial);
  }, []);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    setHTMLThemeAttr(theme);
  }, [theme]);

  const setHTMLThemeAttr = (theme: string) => {
    document.documentElement.setAttribute('data-theme', theme);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
};

export { ThemeContext, ThemeProvider };

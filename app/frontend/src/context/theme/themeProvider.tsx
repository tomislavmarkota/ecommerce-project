import { ReactNode, useEffect, useState } from 'react';
import { ThemeContext, Theme } from './theme.context';

type ThemeProviderProps = {
  children: ReactNode;
};

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [theme, setTheme] = useState<Theme>('light');

  const setHTMLThemeAttr = (theme: Theme) => {
    document.documentElement.setAttribute('data-theme', theme);
  };

  useEffect(() => {
    const saved = localStorage.getItem('theme') as Theme | null;
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial: Theme = saved ?? (systemDark ? 'dark' : 'light');

    setTheme(initial);
    setHTMLThemeAttr(initial);
  }, []);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    setHTMLThemeAttr(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
};

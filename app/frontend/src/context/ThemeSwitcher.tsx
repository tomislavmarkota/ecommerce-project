import React, { use } from 'react';
import { ThemeContext } from './themeProvider.context';

const ThemeSwitcher = () => {
  const context = use(ThemeContext);
  if (!context) {
    throw new Error('ThemeSwitcher must be used within a ThemeProvider');
  }
  const { theme, toggleTheme } = context;

  console.log('ThemeSwitcher re-rendered', theme); // To observe re-renders

  return (
    <button onClick={toggleTheme} style={{ margin: '20px', padding: '10px' }}>
      Current Theme: {theme} (Click to toggle)
    </button>
  );
};

export default ThemeSwitcher;

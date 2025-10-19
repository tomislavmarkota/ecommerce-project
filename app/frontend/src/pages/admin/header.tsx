import React, { use } from 'react';
import { ThemeContext } from '../../context/themeProvider.context';
import ThemeSwitcher from '../../context/ThemeSwitcher';
const Header = () => {
  const context = use(ThemeContext);
  if (!context) {
    throw new Error('Header must be used within a ThemeProvider');
  }
  const { theme } = context;

  console.log('Header re-rendered'); // To observe re-renders

  return (
    <header
      style={{
        background: theme === 'dark' ? '#333' : '#fff',
        padding: '10px',
      }}
    >
      <h1 style={{ color: theme === 'dark' ? '#fff' : '#000' }}>React 19 Theme Demo</h1>
      <ThemeSwitcher />
    </header>
  );
};

export default Header;

import React, { useContext } from 'react';
import { ThemeContext } from '../../context/themeProvider.context';
import themeSwitcherStyles from './ThemeSwitcher.module.scss';

const ThemeSwitcher = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('ThemeSwitcher must be used within a ThemeProvider');
  }

  const { toggleTheme } = context;

  return (
    <label className={themeSwitcherStyles.switch}>
      <input type="checkbox" onChange={toggleTheme} />
      <span className={`${themeSwitcherStyles.slider} ${themeSwitcherStyles.round}`}></span>
    </label>
  );
};

export default ThemeSwitcher;

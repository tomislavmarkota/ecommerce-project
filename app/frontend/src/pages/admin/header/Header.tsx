import { use, useState } from 'react';
import { ThemeContext } from '../../../context/themeProvider.context';
import ThemeSwitcher from '../../../components/themeSwitcher/ThemeSwitcher';
import headerStyles from './header.module.scss';
import Input, { InputType } from '../../../components/input/Input';
import SearchIcon from '../../../assets/search.svg?react';

const Header = () => {
  const [search, setSearch] = useState('');
  const context = use(ThemeContext);
  if (!context) {
    throw new Error('Header must be used within a ThemeProvider');
  }
  console.log('Header re-rendered'); // To observe re-renders

  const searchInputProps: InputType = {
    inputProps: {
      //className: headerStyles.searchInput,
      type: 'input',
      placeholder: 'Search product',
      name: 'password',
      required: true,
      value: search,
      onChange: (e) => setSearch(e.target.value),
    },
    iconComponent: SearchIcon,
  };

  return (
    <header className={headerStyles.header}>
      <Input {...searchInputProps} />
      <ThemeSwitcher />
    </header>
  );
};

export default Header;

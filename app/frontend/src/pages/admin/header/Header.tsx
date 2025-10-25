import { use, useEffect, useRef, useState } from 'react';
import { ThemeContext } from '../../../context/themeProvider.context';
import ThemeSwitcher from '../../../components/themeSwitcher/ThemeSwitcher';
import headerStyles from './header.module.scss';
import Input, { InputType } from '../../../components/input/Input';
import SearchIcon from '../../../assets/search.svg?react';
import NotificatonIcon from '../../../assets/notification.svg?react';
import profileImage from '../../../assets/Rectangle 20.png';

const Header = () => {
  const [search, setSearch] = useState('');
  const [showPopupNotification, setShowPopupNotification] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null); // 👈 create ref for the notification container

  const context = use(ThemeContext);
  if (!context) {
    throw new Error('Header must be used within a ThemeProvider');
  }
  console.log('Header re-rendered'); // To observe re-renders

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowPopupNotification(false);
      }
    };

    if (showPopupNotification) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    // cleanup on unmount or toggle
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPopupNotification]);

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

  console.log(showPopupNotification);

  return (
    <header className={headerStyles.header}>
      <Input {...searchInputProps} />
      <div className={headerStyles.headerIcons}>
        <ThemeSwitcher />
        {/* <div
          className={headerStyles.notificationContainer}
          ref={notificationRef}
          onClick={() => setShowPopupNotification((prev) => !prev)}
        >
          <NotificatonIcon className={headerStyles.notificationIcon} />
          <div className={headerStyles.notificationNumber}>
            <span>{Math.floor(Math.random() * 10) + 1}</span>
          </div>
          {showPopupNotification && <div className={headerStyles.notificationPopUp}></div>}
        </div> */}
        <div className={headerStyles.notificationWrapper} ref={notificationRef}>
          <div className={headerStyles.notificationContainer} onClick={() => setShowPopupNotification((prev) => !prev)}>
            <NotificatonIcon className={headerStyles.notificationIcon} />
            <div className={headerStyles.notificationNumber}>
              <span>{Math.floor(Math.random() * 10) + 1}</span>
            </div>
          </div>

          {showPopupNotification && <div className={headerStyles.notificationPopUp}></div>}
        </div>
        <div className={headerStyles.separator}></div>
        <div className={headerStyles.profileImgContainer}>
          <img className={headerStyles.profileImg} src={profileImage} />
          <span className={headerStyles.profileActiveCircle}></span>
        </div>
      </div>
    </header>
  );
};

export default Header;

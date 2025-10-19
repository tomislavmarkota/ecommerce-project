import React, { useState } from 'react';
import sidebarStyles from './sidebar.module.scss';
import closeSidebar from '../../assets/close-sidebar.svg';
import hamburgerMenu from '../../assets/hamburger-menu.svg';

function SideBarMenu() {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={isExpanded ? `${sidebarStyles.container} ${sidebarStyles.expanded}` : sidebarStyles.container}>
      <div className={sidebarStyles.imgWrapper}>
        <img
          onClick={toggleSidebar}
          src={isExpanded ? closeSidebar : hamburgerMenu}
          alt="Toggle sidebar"
          style={{ cursor: 'pointer' }}
        />
      </div>
    </div>
  );
}

export default SideBarMenu;

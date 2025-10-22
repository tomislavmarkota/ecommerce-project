import React, { useState } from 'react';
import sidebarStyles from './sidebar.module.scss';
import CloseSidebar from '../../assets/close-sidebar.svg?react';
import HamburgerMenu from '../../assets/hamburger-menu.svg?react';
import DashboardIcon from '../../assets/dashboard.svg?react';
import StoreIcon from '../../assets/store.svg?react';
import TransactionIcon from '../../assets/transaction.svg?react';
import { useNavigate } from 'react-router';

type Icons = {
  id: number;
  component: React.FunctionComponent<
    React.SVGProps<SVGSVGElement> & {
      title?: string;
      titleId?: string;
      desc?: string;
      descId?: string;
    }
  >;
  name: string;
  route: string;
}[];

const icons: Icons = [
  { id: 1, component: DashboardIcon, name: 'Dashboard', route: '/dashboard' },
  { id: 2, component: StoreIcon, name: 'Product', route: '/product' },
  { id: 3, component: TransactionIcon, name: 'Transaction', route: '/transaction' },
];

function SideBarMenu() {
  const [isExpanded, setIsExpanded] = useState(false);

  const navigate = useNavigate();

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={isExpanded ? `${sidebarStyles.container} ${sidebarStyles.expanded}` : sidebarStyles.container}>
      <div className={sidebarStyles.imgWrapper}>
        {isExpanded ? (
          <CloseSidebar onClick={toggleSidebar} className={sidebarStyles.openIcon} />
        ) : (
          <HamburgerMenu onClick={toggleSidebar} className={sidebarStyles.closeIcon} />
        )}
      </div>
      <div>
        {icons.map((icon) => {
          const IconComponent = icon.component;
          return (
            <div key={icon.id} className={sidebarStyles.iconWrapper} onClick={() => navigate(icon.route)}>
              <IconComponent className={sidebarStyles.icon} />
              {isExpanded && <h6 className={sidebarStyles.iconTitle}>{icon.name}</h6>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SideBarMenu;

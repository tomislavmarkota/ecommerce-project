import React, { useState } from 'react';
import sidebarStyles from './sidebar.module.scss';
import CloseSidebar from '../../assets/close-sidebar.svg?react';
import HamburgerMenu from '../../assets/hamburger-menu.svg?react';
import DashboardIcon from '../../assets/dashboard.svg?react';
import StoreIcon from '../../assets/store.svg?react';
import TransactionIcon from '../../assets/transaction.svg?react';
import CustomersIcon from '../../assets/customers.svg?react';
import SalesReportIcon from '../../assets/salesReport.svg?react';
import { NavLink } from 'react-router';

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
  { id: 1, component: DashboardIcon, name: 'Dashboard', route: '/' },
  { id: 2, component: StoreIcon, name: 'Product', route: '/product' },
  { id: 3, component: TransactionIcon, name: 'Transaction', route: '/transaction' },
  { id: 4, component: CustomersIcon, name: 'Customers', route: '/customers' },
  { id: 5, component: SalesReportIcon, name: 'Sales report', route: '/sales-report' },
];

function SideBarMenu() {
  const [isExpanded, setIsExpanded] = useState(true);

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={isExpanded ? `${sidebarStyles.container} ${sidebarStyles.expanded}` : sidebarStyles.container}>
      <div className={sidebarStyles.imgWrapper}>
        {isExpanded ? (
          <>
            <h2>Logo</h2>
            <CloseSidebar onClick={toggleSidebar} className={sidebarStyles.openIcon} />
          </>
        ) : (
          <HamburgerMenu onClick={toggleSidebar} className={sidebarStyles.closeIcon} />
        )}
      </div>
      <div className={sidebarStyles.iconContainer}>
        {icons.map((icon) => {
          const IconComponent = icon.component;
          return (
            <NavLink
              key={icon.id}
              to={icon.route}
              className={({ isActive }) => {
                return isActive ? `${sidebarStyles.iconWrapper} ${sidebarStyles.active}` : sidebarStyles.iconWrapper;
              }}
            >
              <IconComponent className={sidebarStyles.icon} />
              {isExpanded && <h6 className={sidebarStyles.iconTitle}>{icon.name}</h6>}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}

export default SideBarMenu;

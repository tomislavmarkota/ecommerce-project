import React from 'react';
import SideBarMenu from '../../../components/sidebar/SideBarMenu';
import dashboardStyles from './dashboard.module.scss';

function Dashboard() {
  return (
    <div className={dashboardStyles.dashboardPage}>
      <SideBarMenu />
      dashboard
    </div>
  );
}

export default Dashboard;

import React from 'react';
import { Outlet } from 'react-router';
import Header from '../admin/header/Header';
import SideBarMenu from '../../components/sidebar/SideBarMenu';
import appStyles from './appContainer.module.scss';

function AppContainer() {
  return (
    <div className={appStyles.appContainer}>
      <SideBarMenu />
      <div className={appStyles.content}>
        <Header />
        <div className={appStyles.pageWrapper}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default AppContainer;

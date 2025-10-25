import { useEffect } from 'react';
import Header from './pages/admin/header/Header';
import { ThemeProvider } from './context/themeProvider.context';
import { Outlet } from 'react-router';
import SideBarMenu from './components/sidebar/SideBarMenu';
import appStyles from './index.module.scss';

function App() {
  useEffect(() => {
    fetch('http://localhost:8000/products')
      .then((res) => res.json())
      .then((data) => console.log(data))
      .catch((err) => console.log(err));
  }, []);
  const handleLogin = () => {
    window.location.href = 'http://localhost:8000/auth/google';
  };

  return (
    <ThemeProvider value={'light'}>
      <div className={appStyles.appContainer}>
        <SideBarMenu />
        <div className={appStyles.content}>
          <Header />
          <div className={appStyles.pageWrapper}>
            <Outlet />
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;

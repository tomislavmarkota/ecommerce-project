import { useEffect } from 'react';
import Header from './pages/admin/header';
import { ThemeProvider } from './context/themeProvider.context';
import { Outlet } from 'react-router';
import SideBarMenu from './components/sidebar/SideBarMenu';

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
      <Header />
      <SideBarMenu />
      <Outlet />
    </ThemeProvider>
  );
}

export default App;

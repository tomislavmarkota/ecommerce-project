import { useEffect } from 'react';
import Header from './pages/admin/header';
import { ThemeProvider } from './context/themeProvider.context';

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
      <h1>test</h1>
      <button onClick={handleLogin}>Login with Google</button>
    </ThemeProvider>
  );
}

export default App;

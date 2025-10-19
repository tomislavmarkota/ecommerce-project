import { createBrowserRouter } from 'react-router';
import App from '../App';
import Login from '../pages/admin/login/Login';
import Dashboard from '../pages/admin/dashboard/Dashboard';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/dashboard',
    element: <Dashboard />,
  },
]);

export const root = document.getElementById('root');

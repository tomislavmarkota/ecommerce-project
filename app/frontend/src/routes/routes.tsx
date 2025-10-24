import { createBrowserRouter } from 'react-router-dom';
import App from '../App';
import Login from '../pages/admin/login/Login';
import Dashboard from '../pages/admin/dashboard/Dashboard';
import Transaction from '../pages/admin/transaction/Transaction';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'transaction',
        element: <Transaction />,
      },
    ],
  },
  {
    path: '/login',
    element: <Login />,
  },
  // {
  //   path: '/dashboard',
  //   element: <Dashboard />,
  // },
]);

export const root = document.getElementById('root');

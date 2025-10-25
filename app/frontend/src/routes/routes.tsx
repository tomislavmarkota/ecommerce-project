import { createBrowserRouter } from 'react-router-dom';
import App from '../App';
import Login from '../pages/admin/login/Login';
import Dashboard from '../pages/admin/dashboard/Dashboard';
import Transaction from '../pages/admin/transaction/Transaction';
import Product from '../pages/product/Product';
import Customers from '../pages/admin/customers/Customers';
import SalesReport from '../pages/admin/salesReport/SalesReport';

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
        path: 'product',
        element: <Product />,
      },
      {
        path: 'transaction',
        element: <Transaction />,
      },
      {
        path: 'customers',
        element: <Customers />,
      },
      {
        path: 'sales-report',
        element: <SalesReport />,
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

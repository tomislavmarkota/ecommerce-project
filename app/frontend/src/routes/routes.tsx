// import { createBrowserRouter } from 'react-router-dom';
// import App from '../App';
// import Login from '../pages/admin/login/Login';
// import Dashboard from '../pages/admin/dashboard/Dashboard';
// import Transaction from '../pages/admin/transaction/Transaction';
// import Product from '../pages/product/Product';
// import Customers from '../pages/admin/customers/Customers';
// import SalesReport from '../pages/admin/salesReport/SalesReport';
// import Account from '../pages/admin/account/Account';
// import Help from '../pages/admin/help/Help';
// import AdminAddProduct from '../pages/admin/addProduct/AddProduct';
// import ProtectedRoute from './protectedRoute';
// import { Routes } from 'react-router';
// import { Route } from 'react-router';

// export const router = createBrowserRouter([
//   {
//     path: '/',
//     element: <App />,
//     children: [
//       {
//         element: <ProtectedRoute />,
//         path: '/',
//         children: [
//           { path: 'dashboard', element: <Dashboard /> },
//           { path: 'product', element: <Product /> },
//           { path: 'transaction', element: <Transaction /> },
//           { path: 'customers', element: <Customers /> },
//           { path: 'sales-report', element: <SalesReport /> },
//           { path: 'account', element: <Account /> },
//           { path: 'help', element: <Help /> },
//           { path: 'add-product', element: <AdminAddProduct /> },
//         ],
//       },
//     ],
//   },
//   {
//     path: '/login',
//     element: <Login />,
//   },
// ]);

// <Routes>
//   <Route index element={<App />} />
//   <Route element={<ProtectedRoute user={user} />}>
//     <Route path="home" element={<Home />} />
//     <Route path="dashboard" element={<Dashboard />} />
//   </Route>
//   <Route path="analytics" element={<Analytics />} />
//   <Route path="admin" element={<Admin />} />
//   <Route path="*" element={<p>There's nothing here: 404!</p>} />
// </Routes>;

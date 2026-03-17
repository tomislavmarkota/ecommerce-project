import { lazy } from 'react';
import { ThemeProvider } from './context/themeProvider.context';
import { BrowserRouter, Route, Routes } from 'react-router';
import { UserProvider } from './context/userProvider.context';
import ProtectedRoute from './routes/protectedRoute';
import Login from './pages/admin/login/Login';
import AppContainer from './pages/appContainer/AppContainer';

const Dashboard = lazy(() => import('./pages/admin/dashboard/Dashboard'));
const Product = lazy(() => import('./pages/admin/product/Product'));
const Transaction = lazy(() => import('./pages/admin/transaction/Transaction'));
const Customers = lazy(() => import('./pages/admin/users/Users'));
const SalesReport = lazy(() => import('./pages/admin/salesReport/SalesReport'));
const Account = lazy(() => import('./pages/admin/account/Account'));
const Help = lazy(() => import('./pages/admin/help/Help'));
const AdminAddProduct = lazy(() => import('./pages/admin/addProduct/AddProduct'));
const UserDetailsPage = lazy(() => import('./pages/admin/userDetails/UserDetails'));

function App() {
  return (
    <UserProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<div>home</div>} />
            <Route path="/login" element={<Login />} />
            {/* Protected “ADMIN” routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppContainer />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/product">
                  <Route index element={<Product />} />
                  <Route path="add-product" element={<AdminAddProduct />} />
                </Route>
                <Route path="/transaction" element={<Transaction />} />
                <Route path="/users" element={<Customers />} />
                <Route path="/users/:id" element={<UserDetailsPage />} />
                <Route path="/sales-report" element={<SalesReport />} />
                <Route path="/account" element={<Account />} />
                <Route path="/help" element={<Help />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </UserProvider>
  );
}

export default App;

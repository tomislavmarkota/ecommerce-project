import { lazy, Suspense } from 'react';
import { ThemeProvider } from './context/theme/themeProvider';
import { BrowserRouter, Route, Routes } from 'react-router';
import { UserProvider } from './context/userProvider.context';
import { CartProvider } from './context/cartProvider.context';
import ProtectedRoute from './routes/protectedRoute';
import Login from './pages/admin/login/Login';
import AppContainer from './pages/appContainer/AppContainer';
import PublicLayout from './pages/public/publicLayout/publicLayout';
import Categories from './pages/admin/categories/Categories';

const Home = lazy(() => import('./pages/public/products/PublicProducts'));
const PublicProducts = lazy(() => import('./pages/public/products/PublicProducts'));
const PublicProductDetails = lazy(() => import('./pages/public/productDetails/PublicProductDetails'));
const CartPage = lazy(() => import('./pages/public/cart/Cart'));
const CheckoutPage = lazy(() => import('./pages/public/checkout/Checkout'));

const Dashboard = lazy(() => import('./pages/admin/dashboard/Dashboard'));
const Product = lazy(() => import('./pages/admin/product/Product'));
const Transaction = lazy(() => import('./pages/admin/transaction/Transaction'));
const Customers = lazy(() => import('./pages/admin/users/Users'));
const SalesReport = lazy(() => import('./pages/admin/salesReport/SalesReport'));
const Account = lazy(() => import('./pages/admin/account/Account'));
const Help = lazy(() => import('./pages/admin/help/Help'));
const AdminAddProduct = lazy(() => import('./pages/admin/addProduct/AddProduct'));
const UserDetailsPage = lazy(() => import('./pages/admin/userDetails/UserDetails'));
const OrdersPage = lazy(() => import('./pages/admin/orders/Orders'));
const ProductDetailsPage = lazy(() => import('./pages/admin/productDetails/ProductDetailsPage'));
function App() {
  return (
    <UserProvider>
      <CartProvider>
        <ThemeProvider>
          <BrowserRouter>
            <Suspense fallback={<div>Loading...</div>}>
              <Routes>
                <Route element={<PublicLayout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/products" element={<PublicProducts />} />
                  <Route path="/products/:id" element={<PublicProductDetails />} />
                  <Route path="/cart" element={<CartPage />} />
                  <Route path="/checkout" element={<CheckoutPage />} />
                </Route>

                <Route path="/login" element={<Login />} />

                <Route element={<ProtectedRoute />}>
                  <Route element={<AppContainer />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    {/*                     
                    <Route path="/product">
                      <Route index element={<Product />} />
                      <Route path="add-product" element={<AdminAddProduct />} />
                    </Route> */}
                    <Route path="/product">
                      <Route index element={<Product />} />
                      <Route path="add-product" element={<AdminAddProduct />} />
                      <Route path=":id" element={<ProductDetailsPage />} />
                    </Route>

                    <Route path="/categories" element={<Categories />} />
                    <Route path="/transaction" element={<Transaction />} />
                    <Route path="/orders" element={<OrdersPage />} />
                    <Route path="/users" element={<Customers />} />
                    <Route path="/users/:id" element={<UserDetailsPage />} />
                    <Route path="/sales-report" element={<SalesReport />} />
                    <Route path="/account" element={<Account />} />
                    <Route path="/help" element={<Help />} />
                  </Route>
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ThemeProvider>
      </CartProvider>
    </UserProvider>
  );
}

export default App;

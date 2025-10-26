import { Navigate, Outlet } from 'react-router';
import { use } from 'react';
import { UserContext } from '../context/userProvider.context';

const ProtectedRoute = () => {
  const { user, loading } = use(UserContext);

  if (loading) {
    return <div>Loading...</div>; // or a spinner
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;

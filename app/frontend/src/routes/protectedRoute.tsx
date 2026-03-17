import { Navigate, Outlet } from 'react-router';
import { use } from 'react';
import { UserContext } from '../context/userProvider.context';

const ProtectedRoute = () => {
  const { user, loading } = use(UserContext);

  if (loading) {
    return <div>Loading...</div>; // or a spinner
  }

  const allowedRoles = ['admin', 'superAdmin'];

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;

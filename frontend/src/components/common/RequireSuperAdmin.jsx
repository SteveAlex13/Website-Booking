import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Route guard for pages that only the super admin may open.
 * Front desk (role "admin") is sent back to the dashboard.
 * The backend enforces the same rule, this only avoids showing a broken page.
 */
export default function RequireSuperAdmin({ children }) {
  const { isSuperAdmin } = useAuth();

  if (!isSuperAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return children;
}

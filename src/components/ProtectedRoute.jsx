import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Flame } from 'lucide-react';

export const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();

  if (user === null) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" data-testid="auth-loading">
        <Flame className="h-10 w-10 text-red-600 animate-pulse" />
      </div>
    );
  }
  if (user === false) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

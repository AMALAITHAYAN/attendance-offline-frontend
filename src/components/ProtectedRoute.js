import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length) {
    const role = (user?.role || "").toUpperCase();
    const ok = allowedRoles.map((r) => r.toUpperCase()).includes(role);
    if (!ok) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
}

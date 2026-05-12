import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Drive from "./pages/Drive";
import { useAuth, AuthProvider } from "./hooks/useAuth";
import React from "react";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { loggedIn, loading } = useAuth();
  if (loading) return null;
  return loggedIn ? children : <Navigate to="/login" />;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { loggedIn, loading } = useAuth();
  if (loading) return null;
  return loggedIn ? <Navigate to="/drive" /> : children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
      <Route
        path="/drive"
        element={<ProtectedRoute><Drive /></ProtectedRoute>}
      />
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

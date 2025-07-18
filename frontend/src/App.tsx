import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import CreateAdminPage from "./pages/CreateAdminPage";
import AccountSettingsPage from "./pages/AccountSettingsPage";
import MainPage from "./pages/MainPage";
import type { ReactElement } from "react";
import { CssBaseline } from "@mui/material";
import Layout from "./components/Layout";

// PrivateRoute: 로그인(토큰) 여부 확인 후 없으면 /login으로 리다이렉트
const PrivateRoute = ({ children }: { children: ReactElement }) => {
  const token = localStorage.getItem("access_token");
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <Router>
      <CssBaseline />
      <Layout>
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />
          <Route path="/create-admin" element={<CreateAdminPage />} />
          <Route
            path="/account"
            element={
              <PrivateRoute>
                <AccountSettingsPage />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;

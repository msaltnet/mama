import React from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Tooltip,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import LoginIcon from "@mui/icons-material/Login";
import LogoutIcon from "@mui/icons-material/Logout";
import SettingsIcon from "@mui/icons-material/Settings";
import HistoryIcon from "@mui/icons-material/History";
import Footer from "./Footer";

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const username = localStorage.getItem("username");
  const token = localStorage.getItem("access_token");

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("username");
    navigate("/login");
  };

  const handleSettings = () => {
    navigate("/account");
  };

  const handleLogin = () => {
    navigate("/login");
  };

  const handleHome = () => {
    if (token) {
      navigate("/");
    } else {
      navigate("/login");
    }
  };

  const handleEventLogs = () => {
    navigate("/event-logs");
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <AppBar position="static" color="primary" elevation={1} sx={{ mb: 4 }}>
        <Box
          sx={{
            maxWidth: 1400,
            mx: "auto",
            width: "100%",
            px: 2, // 좌우 패딩 추가
          }}
        >
          <Toolbar sx={{ px: 0 }}>
            {" "}
            {/* Toolbar의 기본 패딩 제거 */}
            <Box
              sx={{
                flexGrow: 1,
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
              }}
              onClick={handleHome}
            >
              <img
                src={`${import.meta.env.BASE_URL}mama.jpg`}
                alt="Mama"
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  marginRight: "8px",
                  objectFit: "cover",
                  objectPosition: "center",
                }}
              />
              <Typography variant="h6">mama</Typography>
            </Box>
            {token ? (
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Typography variant="body1" sx={{ ml: 2 }}>
                  {username}
                </Typography>
                <Tooltip title="Event Logs">
                  <IconButton
                    color="inherit"
                    sx={{ ml: 1 }}
                    onClick={handleEventLogs}
                  >
                    <HistoryIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Account Settings">
                  <IconButton
                    color="inherit"
                    sx={{ ml: 1 }}
                    onClick={handleSettings}
                  >
                    <SettingsIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Logout">
                  <IconButton
                    color="inherit"
                    sx={{ ml: 1 }}
                    onClick={handleLogout}
                  >
                    <LogoutIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            ) : (
              <Tooltip title="Login">
                <IconButton color="inherit" onClick={handleLogin}>
                  <LoginIcon />
                </IconButton>
              </Tooltip>
            )}
          </Toolbar>
        </Box>
      </AppBar>
      <Box sx={{ flex: 1 }}>{children}</Box>
      <Footer />
    </Box>
  );
};

export default Layout;

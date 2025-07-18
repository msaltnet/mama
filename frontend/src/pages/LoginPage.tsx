import React, { useState } from "react";
import { Box, TextField, Button, Typography, Paper } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { DEBUG } from "../config";

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (DEBUG) {
      if (!password) {
        localStorage.setItem("access_token", "debug-token");
        localStorage.setItem("username", username);
        navigate("/");
        return;
      } else {
        setError("Login failed");
        return;
      }
    }
    try {
      const response = await fetch("/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          username,
          password,
        }),
      });
      if (!response.ok) {
        let errorMsg = "Login failed";
        if (response.status === 401) {
          errorMsg = "Invalid username or password.";
        } else if (response.status === 403) {
          errorMsg = "You do not have permission to access.";
        } else if (response.status === 400) {
          const data = await response.json();
          errorMsg = data.detail || "Bad request.";
        } else {
          const data = await response.json().catch(() => null);
          if (data && data.detail) errorMsg = data.detail;
        }
        throw new Error(errorMsg);
      }
      const data = await response.json();
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("username", username);
      navigate("/"); // 로그인 성공 시 루트로 이동
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Paper elevation={3} sx={{ p: 4, minWidth: 320 }}>
        <Typography variant="h6" align="center" gutterBottom>
          관리자 로그인
        </Typography>
        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            label="아이디"
            fullWidth
            margin="normal"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <TextField
            label="비밀번호"
            type="password"
            fullWidth
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            sx={{ mt: 2 }}
          >
            로그인
          </Button>
          {error && (
            <Typography color="error" align="center" sx={{ mt: 2 }}>
              {error}
            </Typography>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default LoginPage;

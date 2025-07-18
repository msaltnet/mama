import React, { useState } from "react";
import { Box, TextField, Button, Typography, Paper } from "@mui/material";

const CreateAdminPage: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("Login required.");
      const response = await fetch("/create-admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        let errorMsg = "Account creation failed.";
        if (response.status === 401) {
          errorMsg = "Invalid authentication.";
        } else if (response.status === 403) {
          errorMsg = "You do not have permission to access.";
        } else if (response.status === 400) {
          errorMsg = data.detail || "Bad request.";
        } else if (data && data.detail) {
          errorMsg = data.detail;
        }
        throw new Error(errorMsg);
      }
      alert(data.msg || "Account created successfully.");
      setUsername("");
      setPassword("");
      setError("");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 4 }}>
      <Typography variant="h6" align="center" gutterBottom>
        관리자 계정 생성 (슈퍼관리자 전용)
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
          Create Account
        </Button>
        {error && (
          <Typography color="error" align="center" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

export default CreateAdminPage;

import React, { useState } from "react";
import { Box, TextField, Button, Typography, Paper } from "@mui/material";

const ChangePasswordPage: React.FC = () => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("Login required.");
      const response = await fetch("/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        let errorMsg = "Password change failed.";
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
      alert("Password changed successfully.");
      setOldPassword("");
      setNewPassword("");
      setError("");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(String(err));
      }
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 4 }}>
      <Typography variant="h6" align="center" gutterBottom>
        Change Password
      </Typography>
      <Box component="form" onSubmit={handleSubmit}>
        <TextField
          label="Current Password"
          type="password"
          fullWidth
          margin="normal"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
        />
        <TextField
          label="New Password"
          type="password"
          fullWidth
          margin="normal"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 2 }}
        >
          Change Password
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

export default ChangePasswordPage;

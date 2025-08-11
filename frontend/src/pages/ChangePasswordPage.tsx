import React, { useState } from "react";
import { Box, TextField, Button, Typography, Paper } from "@mui/material";
import { fetchJson } from "../utils/api";

const ChangePasswordPage: React.FC = () => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [passwordMismatch, setPasswordMismatch] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if new password and confirm password match
    if (newPassword !== confirmPassword) {
      setPasswordMismatch("New password and confirm password do not match.");
      return;
    }

    setPasswordMismatch("");

    try {
      await fetchJson("/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword,
        }),
      });

      alert("Password changed successfully.");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setError("");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(String(err));
      }
    }
  };

  // Clear mismatch message when password input changes
  const handleNewPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewPassword(e.target.value);
    if (confirmPassword && e.target.value !== confirmPassword) {
      setPasswordMismatch("New password and confirm password do not match.");
    } else {
      setPasswordMismatch("");
    }
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
    if (newPassword && e.target.value !== newPassword) {
      setPasswordMismatch("New password and confirm password do not match.");
    } else {
      setPasswordMismatch("");
    }
  };

  return (
    <Paper elevation={0} sx={{ p: 4, border: "none" }}>
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
          required
        />
        <TextField
          label="New Password"
          type="password"
          fullWidth
          margin="normal"
          value={newPassword}
          onChange={handleNewPasswordChange}
          required
        />
        <TextField
          label="Confirm New Password"
          type="password"
          fullWidth
          margin="normal"
          value={confirmPassword}
          onChange={handleConfirmPasswordChange}
          required
          error={!!passwordMismatch}
          helperText={passwordMismatch}
        />
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 2 }}
          disabled={!oldPassword || !newPassword || !confirmPassword || !!passwordMismatch}
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

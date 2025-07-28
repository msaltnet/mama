import React, { useState } from "react";
import { Box, TextField, Button, Typography, Paper } from "@mui/material";
import { fetchJson } from "../utils/api";

const CreateAdminPage: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await fetchJson<{ msg: string }>("/create-admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      alert(data.msg || "Account created successfully.");
      setUsername("");
      setPassword("");
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
        Create Admin Account (Super Admin Only)
      </Typography>
      <Box component="form" onSubmit={handleSubmit}>
        <TextField
          label="ID"
          fullWidth
          margin="normal"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <TextField
          label="Password"
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

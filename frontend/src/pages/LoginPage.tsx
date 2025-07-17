import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Paper } from '@mui/material';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: 로그인 API 연동
    alert(`로그인 시도: ${username}`);
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
            onChange={e => setUsername(e.target.value)}
          />
          <TextField
            label="비밀번호"
            type="password"
            fullWidth
            margin="normal"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }}>
            로그인
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default LoginPage; 
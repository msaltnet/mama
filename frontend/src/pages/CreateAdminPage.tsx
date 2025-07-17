import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Paper } from '@mui/material';

const CreateAdminPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: 관리자 계정 생성 API 연동
    alert(`관리자 계정 생성 시도: ${username}`);
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
          계정 생성
        </Button>
      </Box>
    </Paper>
  );
};

export default CreateAdminPage; 
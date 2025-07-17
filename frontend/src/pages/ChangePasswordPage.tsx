import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Paper } from '@mui/material';

const ChangePasswordPage: React.FC = () => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: 비밀번호 변경 API 연동
    alert('비밀번호 변경 시도');
  };

  return (
    <Paper elevation={3} sx={{ p: 4 }}>
      <Typography variant="h6" align="center" gutterBottom>
        비밀번호 변경
      </Typography>
      <Box component="form" onSubmit={handleSubmit}>
        <TextField
          label="기존 비밀번호"
          type="password"
          fullWidth
          margin="normal"
          value={oldPassword}
          onChange={e => setOldPassword(e.target.value)}
        />
        <TextField
          label="새 비밀번호"
          type="password"
          fullWidth
          margin="normal"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
        />
        <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }}>
          변경하기
        </Button>
      </Box>
    </Paper>
  );
};

export default ChangePasswordPage; 
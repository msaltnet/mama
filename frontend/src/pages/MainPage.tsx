import React from 'react';
import { Box, Button, Typography, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const MainPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Paper elevation={3} sx={{ p: 4, minWidth: 320, textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>
          메인 페이지
        </Typography>
        <Button variant="contained" color="primary" onClick={() => navigate('/admin')}>
          관리자 설정
        </Button>
      </Paper>
    </Box>
  );
};

export default MainPage; 
import React from 'react';
import { Box, Paper, Typography } from '@mui/material';

const MainPage: React.FC = () => {
  return (
    <Box sx={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Paper elevation={3} sx={{ p: 4, minWidth: 320, textAlign: 'center' }}>
        {localStorage.getItem('username') ? (
          <Typography variant="h6" color="text.primary">
            {`Welcome, ${localStorage.getItem('username')}!`}
          </Typography>
        ) : (
          <Typography variant="h6" color="text.secondary">
            Login is required.
          </Typography>
        )}
      </Paper>
    </Box>
  );
};

export default MainPage; 
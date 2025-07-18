import React, { useState } from 'react';
import { Tabs, Tab, Box, Paper } from '@mui/material';
import ChangePasswordPage from './ChangePasswordPage';
import CreateAdminPage from './CreateAdminPage';

const getTabList = (username: string | null) => [
  { label: 'Change Password' },
  ...(username === 'mama' ? [{ label: 'Create Admin Account' }] : []),
];

const AccountSettingsPage: React.FC = () => {
  const [tab, setTab] = useState(0);
  const username = localStorage.getItem('username');
  const tabList = getTabList(username);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Paper elevation={3} sx={{ p: 4, minWidth: 400 }}>
        <Tabs value={tab} onChange={handleTabChange} centered>
          {tabList.map((tab, idx) => (
            <Tab key={tab.label} label={tab.label} />
          ))}
        </Tabs>
        <Box sx={{ mt: 3 }}>
          {tab === 0 && <ChangePasswordPage />}
          {tabList[1] && tab === 1 && <CreateAdminPage />}
        </Box>
      </Paper>
    </Box>
  );
};

export default AccountSettingsPage; 
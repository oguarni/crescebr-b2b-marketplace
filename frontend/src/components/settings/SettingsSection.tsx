import React from 'react';
import { Box, Paper, Typography } from '@mui/material';

interface SettingsSectionProps {
  id: string;
  title: string;
  hint: string;
  children: React.ReactNode;
}

/** One titled group of settings, labelled for assistive technology by its heading. */
export const SettingsSection: React.FC<SettingsSectionProps> = ({ id, title, hint, children }) => (
  <Paper
    component='section'
    variant='outlined'
    aria-labelledby={`${id}-title`}
    sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}
  >
    <Typography id={`${id}-title`} variant='h6' component='h2' sx={{ fontWeight: 700 }}>
      {title}
    </Typography>
    <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5, mb: 2.5 }}>
      {hint}
    </Typography>
    <Box>{children}</Box>
  </Paper>
);

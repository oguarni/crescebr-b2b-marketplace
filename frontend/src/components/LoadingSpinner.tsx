import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

interface LoadingSpinnerProps {
  message?: string;
  size?: number;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Carregando...',
  size = 40,
}) => (
  <Box
    display='flex'
    flexDirection='column'
    alignItems='center'
    justifyContent='center'
    py={4}
  >
    <CircularProgress size={size} />
    {message && (
      <Typography variant='body2' color='text.secondary' mt={2}>
        {message}
      </Typography>
    )}
  </Box>
);

import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useT } from '../contexts/LanguageContext';

interface LoadingSpinnerProps {
  message?: string;
  size?: number;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message, size = 40 }) => {
  const t = useT();
  const text = message ?? t('common.loading');

  return (
    <Box display='flex' flexDirection='column' alignItems='center' justifyContent='center' py={4}>
      <CircularProgress size={size} />
      {text && (
        <Typography variant='body2' color='text.secondary' mt={2}>
          {text}
        </Typography>
      )}
    </Box>
  );
};

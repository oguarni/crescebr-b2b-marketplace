import React from 'react';
import { Alert, Button, Box } from '@mui/material';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  severity?: 'error' | 'warning' | 'info';
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  onRetry,
  severity = 'error',
}) => (
  <Box py={2}>
    <Alert
      severity={severity}
      action={
        onRetry && (
          <Button color='inherit' size='small' onClick={onRetry}>
            Tentar novamente
          </Button>
        )
      }
    >
      {message}
    </Alert>
  </Box>
);

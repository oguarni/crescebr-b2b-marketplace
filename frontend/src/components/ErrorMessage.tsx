import React from 'react';
import { Alert, Button, Box } from '@mui/material';
import { useT } from '../contexts/LanguageContext';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  severity?: 'error' | 'warning' | 'info';
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  onRetry,
  severity = 'error',
}) => {
  const t = useT();

  return (
    <Box py={2}>
      <Alert
        severity={severity}
        action={
          onRetry && (
            <Button color='inherit' size='small' onClick={onRetry}>
              {t('common.retry')}
            </Button>
          )
        }
      >
        {message}
      </Alert>
    </Box>
  );
};

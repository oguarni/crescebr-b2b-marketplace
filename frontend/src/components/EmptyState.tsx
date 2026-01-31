import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Inbox } from '@mui/icons-material';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
}) => (
  <Box textAlign='center' py={8}>
    <Box mb={2} color='text.secondary'>
      {icon || <Inbox sx={{ fontSize: 64, opacity: 0.3 }} />}
    </Box>
    <Typography variant='h6' gutterBottom color='text.secondary'>
      {title}
    </Typography>
    {description && (
      <Typography variant='body2' color='text.secondary' mb={3}>
        {description}
      </Typography>
    )}
    {action && (
      <Button variant='contained' onClick={action.onClick}>
        {action.label}
      </Button>
    )}
  </Box>
);

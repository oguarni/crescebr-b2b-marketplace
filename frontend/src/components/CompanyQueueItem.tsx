import React from 'react';
import { Box, Chip, IconButton, Typography } from '@mui/material';
import { Check, CheckCircle, Close, Visibility, Warning } from '@mui/icons-material';
import { useT } from '../contexts/LanguageContext';
import { formatVerificationDate, type Company } from '../utils/companyVerification';

interface CompanyQueueItemProps {
  company: Company;
  onApprove: (company: Company) => void;
  onReject: (company: Company) => void;
  onViewDetails: (company: Company) => void;
}

const STATUS_ACCENT: Record<Company['status'], string> = {
  pending: 'warning.main',
  approved: 'success.main',
  rejected: 'error.main',
};

const ACTION_BUTTON_SX = { width: 32, height: 32, borderRadius: 1 } as const;

/**
 * One company row in the verification queue: identity on top, location and the
 * approve/reject/details actions below, with a coloured status rail down the left.
 *
 * Already-decided companies show their outcome as text instead of the action
 * buttons, so a decision cannot be reapplied by mistake.
 *
 * @example
 * <CompanyQueueItem
 *   company={company}
 *   onApprove={approve}
 *   onReject={reject}
 *   onViewDetails={openDetails}
 * />
 */
export const CompanyQueueItem: React.FC<CompanyQueueItemProps> = ({
  company,
  onApprove,
  onReject,
  onViewDetails,
}) => {
  const t = useT();
  const isPending = company.status === 'pending';

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        borderRadius: 1,
        p: 2,
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        border: 1,
        borderColor: 'divider',
        position: 'relative',
        overflow: 'hidden',
        opacity: isPending ? 1 : 0.75,
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 4,
          height: '100%',
          bgcolor: STATUS_ACCENT[company.status],
        }}
      />

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          mb: 1,
          pl: 1,
        }}
      >
        <Box>
          <Typography variant='subtitle2' sx={{ fontWeight: 'bold' }}>
            {company.companyName}
          </Typography>
          <Typography
            variant='caption'
            sx={{
              fontFamily: 'monospace',
              color: 'text.secondary',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            CNPJ: {company.cnpj}
            {company.cnpjValidated ? (
              <CheckCircle sx={{ fontSize: 12, color: 'success.main' }} />
            ) : (
              <Warning sx={{ fontSize: 12, color: 'warning.main' }} />
            )}
          </Typography>
        </Box>
        {/* Date only: the queue is scanned by age, and the time would crowd the row. */}
        <Chip
          label={formatVerificationDate(company.createdAt).split(',')[0]}
          size='small'
          sx={{ bgcolor: 'action.hover', color: 'text.secondary', height: 20, fontSize: '0.65rem' }}
        />
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mt: 1.5,
          pl: 1,
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <Typography
            variant='caption'
            sx={{
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontSize: '0.75rem',
              color: 'text.secondary',
            }}
          >
            {t('companyVerification.location')}
          </Typography>
          <Typography variant='caption' sx={{ fontWeight: 'medium' }}>
            {company.city || 'N/A'}, {company.state || 'N/A'}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {isPending ? (
            <>
              <IconButton
                size='small'
                aria-label={`${t('companyVerification.reject')} ${company.companyName}`}
                sx={{
                  ...ACTION_BUTTON_SX,
                  bgcolor: 'error.light',
                  color: 'error.main',
                  '&:hover': { bgcolor: 'error.main', color: 'white' },
                }}
                onClick={() => onReject(company)}
              >
                <Close fontSize='small' />
              </IconButton>
              <IconButton
                size='small'
                aria-label={`${t('companyVerification.approve')} ${company.companyName}`}
                sx={{
                  ...ACTION_BUTTON_SX,
                  bgcolor: 'success.light',
                  color: 'success.main',
                  '&:hover': { bgcolor: 'success.main', color: 'white' },
                }}
                onClick={() => onApprove(company)}
              >
                <Check fontSize='small' />
              </IconButton>
            </>
          ) : (
            <Typography
              variant='caption'
              sx={{ fontWeight: 'bold', color: 'text.secondary', fontStyle: 'italic', mr: 1 }}
            >
              {company.status === 'approved'
                ? t('companyVerification.statusApproved')
                : t('companyVerification.statusRejected')}
            </Typography>
          )}
          <IconButton
            size='small'
            aria-label={t('companyVerification.viewDetailsFor', { name: company.companyName })}
            sx={{ ...ACTION_BUTTON_SX, bgcolor: 'action.hover', color: 'text.secondary' }}
            onClick={() => onViewDetails(company)}
          >
            <Visibility fontSize='small' />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
};

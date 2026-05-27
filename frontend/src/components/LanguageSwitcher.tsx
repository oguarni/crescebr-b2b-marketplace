import React, { useState } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
} from '@mui/material';
import { Translate, Check } from '@mui/icons-material';
import { useLanguage } from '../contexts/LanguageContext';
import type { Language, TranslationKey } from '../locales';

const OPTIONS: { code: Language; labelKey: TranslationKey }[] = [
  { code: 'pt', labelKey: 'language.portuguese' },
  { code: 'en', labelKey: 'language.english' },
];

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleSelect = (code: Language) => {
    setLanguage(code);
    setAnchorEl(null);
  };

  return (
    <>
      <Tooltip title={t('language.label')}>
        <IconButton
          color='inherit'
          onClick={event => setAnchorEl(event.currentTarget)}
          aria-label={t('language.label')}
          aria-haspopup='true'
        >
          <Translate />
          <Typography variant='caption' sx={{ ml: 0.5, fontWeight: 700 }}>
            {language.toUpperCase()}
          </Typography>
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        {OPTIONS.map(option => (
          <MenuItem
            key={option.code}
            selected={language === option.code}
            onClick={() => handleSelect(option.code)}
          >
            <ListItemIcon>{language === option.code && <Check fontSize='small' />}</ListItemIcon>
            <ListItemText>{t(option.labelKey)}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default LanguageSwitcher;

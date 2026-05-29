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

const OPTIONS: { code: Language; labelKey: TranslationKey; flag: string }[] = [
  { code: 'pt', labelKey: 'language.portuguese', flag: '🇧🇷' },
  { code: 'en', labelKey: 'language.english', flag: '🌐' },
];

const flagFor = (code: Language): string =>
  OPTIONS.find(option => option.code === code)?.flag ?? '🌐';

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
          <Typography
            component='span'
            aria-hidden='true'
            sx={{ ml: 0.5, fontSize: '1.15rem', lineHeight: 1 }}
          >
            {flagFor(language)}
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
            <ListItemIcon sx={{ minWidth: 36, fontSize: '1.3rem' }} aria-hidden='true'>
              {option.flag}
            </ListItemIcon>
            <ListItemText>{t(option.labelKey)}</ListItemText>
            {language === option.code && <Check fontSize='small' sx={{ ml: 1 }} />}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default LanguageSwitcher;

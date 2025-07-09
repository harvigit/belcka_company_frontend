import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { CustomizerContext } from '@/app/context/customizerContext';

const Language = () => {
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  const { isLanguage, setIsLanguage } = useContext(CustomizerContext);
  const { i18n } = useTranslation();

  const handleClose = () => {
    setAnchorEl(null);
  };
  useEffect(() => {
    i18n.changeLanguage(isLanguage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null
};

export default Language;

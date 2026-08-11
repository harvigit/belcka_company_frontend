'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { TranslationValues } from '@/utils/translation';
import { useT } from '@/utils/translation';

type TranslatedTextProps = {
  children: string;
  values?: TranslationValues;
};

export const T = ({ children, values }: TranslatedTextProps) => {
  const { t } = useTranslation();
  return <>{t(children, values)}</>;
};
export { useT };

export default T;




import _ from 'lodash';
import { createTheme } from '@mui/material/styles';
import { useEffect, useContext } from 'react';
import { CustomizerContext } from "@/app/context/customizerContext";
import components from './Components';
import typography from './Typography';
import { shadows, darkshadows } from './Shadows';
import { DarkThemeColors } from './DarkThemeColors';
import { LightThemeColors } from './LightThemeColors';
import { baseDarkTheme, baselightTheme } from './DefaultColors';
import * as locales from '@mui/material/locale';

export const BuildTheme = (config: any = {}) => {
  const themeOptions = LightThemeColors.find((theme) => theme.name === config.theme);
  const darkthemeOptions = DarkThemeColors.find((theme) => theme.name === config.theme);
  const { activeMode, isBorderRadius, isCardShadow } = useContext(CustomizerContext);
  const defaultTheme = activeMode === 'dark' ? baseDarkTheme : baselightTheme;
  const defaultShadow = activeMode === 'dark' ? darkshadows : shadows;
  const themeSelect = activeMode === 'dark' ? darkthemeOptions : themeOptions;

  const baseMode = {
    palette: {
      mode: activeMode,
    },
    shape: {
      borderRadius: isBorderRadius,
    },
    shadows: defaultShadow,
    typography: typography,
  };

  // Build and merge the theme with component overrides
  const theme = createTheme(
    _.merge({}, baseMode, defaultTheme, locales, themeSelect, {
      direction: config.direction,
    }),
  );

  // Add components to the theme
  theme.components = components(theme, isCardShadow);

  return theme;
};

const ThemeSettings = () => {
  const { activeDir, activeTheme } = useContext(CustomizerContext);

  // Use BuildTheme to get the full theme with component overrides
  const theme = BuildTheme({
    direction: activeDir,
    theme: activeTheme,
  });

  // Update document direction on theme change
  useEffect(() => {
    document.dir = activeDir;
  }, [activeDir]);

  return theme;
};

export { ThemeSettings };

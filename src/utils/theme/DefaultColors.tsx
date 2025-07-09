const baselightTheme = {
  direction: "ltr",
  palette: {
    primary: {
      main: "#1e4db7",
      light: "#e5fafb",
      dark: "#05b2bd",
    },
    secondary: {
      main: "#fb9678",
      light: "#fcf1ed",
      dark: "#e67e5f",
    },
    success: {
      main: "#00c292",
      light: "#ebfaf2",
      dark: "#00964b",
      contrastText: "#ffffff",
    },
    info: {
      main: "#0bb2fb",
      light: "#dff8ff", 
      dark: "#0bb2fb",
      contrastText: "#ffffff",
    },
    error: {
      main: "#fc4b6c",
      light: "#fdf3f5",
      dark: "#e45a68",
      contrastText: "#ffffff",
    },
    warning: {
      main: "#fdc90f",
      light: '#fff4e5',
      dark: "#dcb014",
      contrastText: "#ffffff",
    },
    purple: {
      A50: "#EBF3FE",
      A100: "#6610f2",
      A200: "#557fb9",
    },
    grey: {
      100: "#ecf0f2",
      200: "#EAEFF4",
      300: "#DFE5EF",
      400: "#767e89",
      500: "#5A6A85",
      600: "#2A3547",
    },

    text: {
      primary: "#11142d",
      secondary: "#777e89",
    },

    action: {
      disabledBackground: "rgba(73,82,88,0.12)",
      hoverOpacity: 0.02,
      hover: "#f6f9fc",
    },
    divider: '#e9e9e9',

    background: {
      default: "#fafbfb",
      dark: "#fafbfb",
      paper: '#fafbfb',
    },
  },
};

const baseDarkTheme = {
  direction: "ltr",
  palette: {
    primary: {
      main: "#1e4db7",
      light: "#1d2742",
      dark: "#4570EA",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#fb9678",
      light: "#1C455D",
      dark: "#173f98",
      contrastText: "#ffffff",
    },
    success: {
      main: "#00c292",
      light: "#1B3C48",
      dark: "#00964b",
      contrastText: "#ffffff",
    },
    info: {
      main: "#539BFF",
      light: "#223662",
      dark: "#1682d4",
      contrastText: "#ffffff",
    },
    error: {
      main: "#fc4b6c",
      light: "#482f34",
      dark: "#e45a68",
      contrastText: "#ffffff",
    },
    warning: {
      main: "#fec90f",
      light: "#4D3A2A",
      dark: "#dcb014",
      contrastText: "#ffffff",
    },
    purple: {
      A50: "#EBF3FE",
      A100: "#6610f2",
      A200: "#557fb9",
    },
    grey: {
      100: "#333F55",
      200: "#465670",
      300: "#7C8FAC",
      400: "#DFE5EF",
      500: "#EAEFF4",
      600: "#F2F6FA",
    },
    text: {
      primary: "#E6E5E8",
      secondary: "#adb0bb",
    },
    action: {
      disabledBackground: "rgba(73,82,88,0.12)",
      hoverOpacity: 0.02,
      hover: "#333F55",
    },
    divider: "#ffffff12",

    background: {
      default: '#20242d',
      dark: '#20242d',
      paper: '#20242d',
    },


  },
};

export { baseDarkTheme, baselightTheme };

import * as React from "react";
import {
  IconButton,
  Box,
  AppBar,
  useMediaQuery,
  Toolbar,
  styled,
  Stack,
  Theme,
} from "@mui/material";
import Profile from "../../vertical/header/Profile";
import Search from "../../vertical/header/Search";
import Logo from "../../shared/logo/Logo";
import { CustomizerContext } from "@/app/context/customizerContext";
import config from "@/app/context/config";
import { IconCategory2, IconMenu2, IconMoon, IconShoppingCart, IconSun, IconX } from "@tabler/icons-react";

import { useTheme } from '@mui/material/styles';

const Header = () => {
  const lgDown = useMediaQuery((theme: Theme) => theme.breakpoints.down("lg"));
  const lgUp = useMediaQuery((theme: Theme) => theme.breakpoints.up("lg"));

  const { isLayout, setIsMobileSidebar, isMobileSidebar, activeMode, setActiveMode } = React.useContext(CustomizerContext);
  const TopbarHeight = config.topbarHeight;

  const theme = useTheme();
  const borderColor = theme.palette.divider;

  const AppBarStyled = styled(AppBar)(({ theme }) => ({
    background: theme.palette.background.paper,
    justifyContent: "center",
    backdropFilter: "blur(4px)",

    [theme.breakpoints.up("lg")]: {
      minHeight: TopbarHeight,
    },
  }));

  const ToolbarStyled = styled(Toolbar)(({ theme }) => ({
    margin: "0 auto",
    width: "100%",
    color: `${theme.palette.text.primary} !important`,
    paddingLeft: "16px !important",
    paddingRight: "16px !important"
  }));

  const CollpaseMenubar = styled(Box)(({ theme }) => ({
    position: 'absolute',
    left: '4px',
    top: '4px',
    right: '4px',
    padding: '7px 15px',
    background: theme.palette.background.paper,
    border: `1px solid ${borderColor}`,
    zIndex: 1,
    borderRadius: '7px'
  }));

  const [isVisible, setIsVisible] = React.useState(false);

  return (
      <AppBarStyled position="sticky" color="default" elevation={8}>
        <ToolbarStyled
          sx={{
            maxWidth: isLayout === "boxed" ? "1800px" : "100%!important",
          }}
        >
          <Box sx={{ width: lgDown ? "40px" : "auto", overflow: "hidden" }}>
            <Logo />
          </Box>
          {/* ------------------------------------------- */}
          {/* Toggle Button Sidebar */}
          {/* ------------------------------------------- */}
          {lgDown ? (
            <IconButton
              color="inherit"
              aria-label="menu"
              onClick={() => setIsMobileSidebar(!isMobileSidebar)}
            >
              <IconMenu2 size="21" />
            </IconButton>
          ) : (
            ""
          )}
          {/* ------------------------------------------- */}
          {/* Search Dropdown */}
          {/* ------------------------------------------- */}
          {lgUp ? (<> </>) : null}

          <Box flexGrow={1} />
          <Stack direction="row" alignItems="center">

            <IconButton color="inherit">
              {activeMode === 'light' ? (
                <IconMoon width="21" height="21" onClick={() => setActiveMode("dark")} />
              ) : (
                <IconSun width="21" height="21" onClick={() => setActiveMode("light")} />
              )}
            </IconButton>

            <IconButton color="inherit"
              aria-label="show 11 new notifications"
              aria-controls="msgs-menu"
              aria-haspopup="true"
            >
              <IconShoppingCart width="21"  />
            </IconButton>

            

            {/* ------------------------------------------- */}
            {/* End Ecommerce Dropdown */}
            {/* ------------------------------------------- */}
            {/* ------------------------------------------- */}

            {lgDown ? <IconButton color="inherit" onClick={() => setIsVisible(!isVisible)}>
              <IconCategory2 size="21" />
            </IconButton> : null}


            <Box
              sx={{
                width: "1px",
                backgroundColor: "rgba(0,0,0,0.1)",
                height: "25px",
                ml: 1,
                mr: 1,
              }}
            />

            <Profile />

            {isVisible && (
              <CollpaseMenubar>
                <Stack direction="row" justifyContent='space-between' spacing={1}>
                  <Box display='flex' gap={1}>
                    <Search />
                  </Box>
                  <IconButton
                    color="inherit"
                    onClick={() => setIsVisible(!isVisible)}
                  >
                    <IconX size="21" />

                  </IconButton>
                </Stack>
              </CollpaseMenubar>
            )}
          </Stack>
        </ToolbarStyled>
      </AppBarStyled>
  );
};

export default Header;

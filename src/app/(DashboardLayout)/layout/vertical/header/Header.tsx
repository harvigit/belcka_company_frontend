import React from "react";
import {
  IconButton,
  Box,
  AppBar,
  useMediaQuery,
  Toolbar,
  styled,
  Stack,
  Typography,
} from "@mui/material";
import Profile from "./Profile";
import Search from "./Search";
import Company from "./Company";
import Language from "./Language";
import { useContext } from "react";
import config from "@/app/context/config";
import {
  IconCategory2,
  IconMenu2,
  IconMoon,
  IconSun,
  IconX,
} from "@tabler/icons-react";
import { CustomizerContext } from "@/app/context/customizerContext";
import { useTheme } from "@mui/material/styles";
import { useState } from "react";
import Navigation from "./Navigation";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import Cookies from "js-cookie";

// Defined at module level: creating these inside Header gave them a new
// component identity on every render, remounting the whole header (and
// re-firing its API calls) whenever the sidebar was toggled.
const AppBarStyled = styled(AppBar)(({ theme }) => ({
  boxShadow: "none",
  background: theme.palette.background.default,
  justifyContent: "center",
  backdropFilter: "blur(4px)",
  [theme.breakpoints.up("lg")]: {
    minHeight: config.topbarHeight,
  },
}));

const ToolbarStyled = styled(Toolbar)(({ theme }) => ({
  width: "100%",
  color: theme.palette.text.primary,
  paddingLeft: "16px !important",
  paddingRight: "16px !important",
}));

const CollpaseMenubar = styled(Box)(({ theme }) => ({
  position: "absolute",
  left: "4px",
  top: "4px",
  right: "4px",
  padding: "7px 15px",
  background: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  zIndex: 1,
  borderRadius: "7px",
}));

const Header = () => {
  const lgUp = useMediaQuery((theme) => theme.breakpoints.up("lg"));
  const lgDown = useMediaQuery((theme) => theme.breakpoints.down("lg"));
  const session = useSession();

  const user = session.data?.user as User & { company_id?: number | null };

  const {
    activeMode,
    setActiveMode,
    setIsCollapse,
    isCollapse,
    isMobileSidebar,
    setIsMobileSidebar,
  } = useContext(CustomizerContext);
  const [isVisible, setIsVisible] = useState(false);

  return (
    <AppBarStyled position="sticky" color="default">
      <ToolbarStyled>
        {/* ------------------------------------------- */}
        {/* Toggle Button Sidebar */}
        {/* ------------------------------------------- */}
        <IconButton
          color="inherit"
          aria-label="menu"
          onClick={() => {
            // Toggle sidebar on both mobile and desktop based on screen size
            if (lgUp) {
              // For large screens, toggle between full-sidebar and mini-sidebar
              isCollapse === "full-sidebar"
                ? setIsCollapse("mini-sidebar")
                : setIsCollapse("full-sidebar");
            } else {
              // For smaller screens, toggle mobile sidebar
              setIsMobileSidebar(!isMobileSidebar);
            }
          }}
        >
          <IconMenu2 size="21" />
        </IconButton>
        {/* ------------------------------------------- */}
        {/* Search Dropdown */}
        {/* ------------------------------------------- */}
        {lgUp ? <></> : null}
        {lgUp ? (
          <>
            <Navigation />
          </>
        ) : null}

        <Box flexGrow={1} />
        <Stack direction="row" alignItems="center">
          <Language />
          <Company />

          {/* <IconButton color="inherit">
            {activeMode === "light" ? (
              <IconMoon size="21" onClick={() => setActiveMode("dark")}  className="header-icons"/>
            ) : (
              <IconSun size="21" onClick={() => setActiveMode("light")} className="header-icons"/>
            )}
          </IconButton> */}

          {lgDown ? (
            <IconButton
              color="inherit"
              onClick={() => setIsVisible(!isVisible)}
            >
              <IconCategory2 size="21" />
            </IconButton>
          ) : null}

          {/* ------------------------------------------- */}
          {/* End Ecommerce Dropdown */}
          {/* ------------------------------------------- */}

          {/* ------------------------------------------- */}

          <Box
            mx={1}
            sx={{
              width: "1px",
              backgroundColor: "rgba(0,0,0,0.1)",
              height: "25px",
            }}
          />

          <Profile />

          {isVisible && (
            <CollpaseMenubar>
              <Stack direction="row" justifyContent="space-between" spacing={1}>
                <Box display="flex" gap={1}>
                  <Company isPanelCopy />
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

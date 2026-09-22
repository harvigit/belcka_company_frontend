"use client";

import React, { useMemo, useState } from "react";
import { Box, Drawer, Snackbar, Typography } from "@mui/material";
import { IconSettings, IconUserCheck } from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import GeneralSettings from "./menus/general";
import ProjectRolesList from "./menus/roles";

interface SettingsProps {
  settingOpen: boolean;
  onClose: () => void;
}

const Index: React.FC<SettingsProps> = ({ settingOpen, onClose }) => {
  const session = useSession();
  const user = session.data?.user as User & { user_role_id?: number | null };
  const isAdmin = Number(user?.user_role_id) === 1;
  const menuItems = useMemo(
    () => [
      ...(isAdmin
        ? [{ icon: <IconUserCheck size={18} />, label: "Role" }]
        : []),
      { icon: <IconSettings size={18} />, label: "General" },
    ],
    [isAdmin],
  );
  const [activeMenuItem, setActiveMenuItem] = useState<string>("Role");
  const [openSnackbar, setOpenSnackbar] = useState(false);

  const handleMenuItemClick = (label: string) => {
    setActiveMenuItem(label);
  };

  const handleSaveSuccess = () => {
    setOpenSnackbar(true);
  };

  return (
    <>
      <Drawer
        anchor="bottom"
        open={settingOpen}
        onClose={onClose}
        PaperProps={{
          sx: {
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            height: "90vh",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        {/* Header */}
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          sx={{
            borderBottom: "1px solid #e0e0e0",
            p: 2,
            gap: 1,
            color: "#7D92A9",
            position: "sticky",
            top: 0,
            zIndex: 1000,
            bgcolor: "#fff",
          }}
        >
          <IconSettings size={24} />
          <Typography>Settings</Typography>
        </Box>

        {/* Main Content */}
        <Box display="flex" flex="1" sx={{ overflow: "hidden" }}>
          <Box
            sx={{
              width: 240,
              borderRight: "1px solid #e0e0e0",
              p: 1,
              overflowY: "auto",
              bgcolor: "#fff",
              "&::-webkit-scrollbar": {
                width: "6px",
              },
              "&::-webkit-scrollbar-track": {
                background: "transparent",
              },
              "&::-webkit-scrollbar-thumb": {
                background: "#c1c1c1",
                borderRadius: "3px",
              },
              "&::-webkit-scrollbar-thumb:hover": {
                background: "#a8a8a8",
              },
            }}
          >
            {menuItems.map((item, i) => (
              <Box
                key={i}
                sx={{
                  p: 1,
                  borderRadius: 1,
                  cursor: "pointer",
                  bgcolor:
                    activeMenuItem === item.label ? "#eaf5ff" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  "&:hover": { bgcolor: "#f6f7f7" },
                  fontSize: 14,
                  color: activeMenuItem === item.label ? "#203040" : "#7D92A9",
                }}
                onClick={() => handleMenuItemClick(item.label)}
              >
                {item.icon}
                {item.label}
              </Box>
            ))}
          </Box>

          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {activeMenuItem === "General" && (
              <GeneralSettings onSaveSuccess={handleSaveSuccess} />
            )}
            {isAdmin && activeMenuItem === "Role" && <ProjectRolesList />}
          </Box>
        </Box>
      </Drawer>

      {/* Snackbar for Save Confirmation */}
      <Snackbar
        open={openSnackbar}
        autoHideDuration={3000}
        onClose={() => setOpenSnackbar(false)}
        message="Settings saved!"
      />
    </>
  );
};

export default Index;

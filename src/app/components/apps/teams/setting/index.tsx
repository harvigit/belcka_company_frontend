"use client";

import React, { useState } from "react";
import { Box, Drawer, Snackbar, Typography } from "@mui/material";
import { IconCalendarEvent, IconSettings } from "@tabler/icons-react";
import GeneralSettings from "./menus/general";

interface SettingsProps {
  settingOpen: boolean;
  onClose: () => void;
}

const Index: React.FC<SettingsProps> = ({ settingOpen, onClose }) => {
  const [activeMenuItem, setActiveMenuItem] = useState("Last working date");
  const [openSnackbar, setOpenSnackbar] = useState(false);

  const menuItems = [
    { icon: <IconCalendarEvent size={18} />, label: "Last working date" },
  ];

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
            {menuItems.map((item) => (
              <Box
                key={item.label}
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
                onClick={() => setActiveMenuItem(item.label)}
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
            {activeMenuItem === "Last working date" && (
              <GeneralSettings onSaveSuccess={() => setOpenSnackbar(true)} />
            )}
          </Box>
        </Box>
      </Drawer>

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

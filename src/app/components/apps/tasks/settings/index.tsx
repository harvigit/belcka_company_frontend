"use client";

import React, { useState } from "react";
import { Box, Drawer, Snackbar, Typography } from "@mui/material";
import { IconSettings, IconCurrencyDollar } from "@tabler/icons-react";
import TaskCategory from "./task-categories";
import TaskCategoryList from "./task-sub-categories";
import TaskPricingMatrix from "./task-pricing";

const menuItems = [
  // { icon: <IconCurrencyDollar size={18} />, label: "Price Work" },
  { icon: <IconSettings size={18} />, label: "Task Categories" },
  { icon: <IconSettings size={18} />, label: "Sub Categories" },
];

interface SettingsProps {
  settingOpen: boolean;
  onClose: () => void;
}

const Settings: React.FC<SettingsProps> = ({ settingOpen, onClose }) => {
  const [activeMenuItem, setActiveMenuItem] =
    useState<string>("Task Categories");
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
            {/*{activeMenuItem === "Price Work" && <TaskPricingMatrix onSaveSuccess={handleSaveSuccess} />}*/}
            {activeMenuItem === "Task Categories" && <TaskCategory />}
            {activeMenuItem === "Sub Categories" && <TaskCategoryList />}
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

export default Settings;

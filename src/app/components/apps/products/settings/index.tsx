"use client";

import React, { useState } from "react";
import { Box, Drawer, Typography } from "@mui/material";
import {
  IconSettings,
  IconCoin,
  IconBuildingStore,
  IconRulerMeasure,
  IconDatabase,
} from "@tabler/icons-react";

import TeamPricing from "@/app/components/apps/team-pricing/index";
import StoreSettings from "@/app/components/apps/settings/store-settings";
import UnitList from "../../units/list";
import StoreLimit from "./store-limit";
import ProductSetting from "../../timesheet/setting/product-settings";

const menuItems = [
  { icon: <IconCoin size={18} />, label: "Team Pricing" },
  { icon: <IconBuildingStore size={18} />, label: "Store Settings" },
  { icon: <IconDatabase size={18} />, label: "Store Limit" },
  { icon: <IconRulerMeasure size={18} />, label: "Units" },
  { icon: <IconSettings size={18} />, label: "Product Permissions" },
];

interface SettingsProps {
  settingOpen: boolean;
  onClose: () => void;
}

const Settings: React.FC<SettingsProps> = ({ settingOpen, onClose }) => {
  const [activeMenuItem, setActiveMenuItem] = useState<string>("Team Pricing");

  const handleMenuItemClick = (label: string) => {
    setActiveMenuItem(label);
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
            {activeMenuItem === "Team Pricing" && <TeamPricing />}
            {activeMenuItem === "Store Settings" && <StoreSettings />}
            {activeMenuItem === "Store Limit" && <StoreLimit />}
            {activeMenuItem === "Units" && <UnitList />}
            {activeMenuItem === "Product Permissions" && <ProductSetting />}
          </Box>
        </Box>
      </Drawer>
    </>
  );
};

export default Settings;

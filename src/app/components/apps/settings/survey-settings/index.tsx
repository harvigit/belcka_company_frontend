"use client";

import React, { useState } from "react";
import { Box, Drawer, IconButton, Typography } from "@mui/material";
import {
  IconSettings,
  IconComponents,
  IconStack2,
  IconTemplate,
  IconAlertTriangle,
  IconBox,
  IconX,
} from "@tabler/icons-react";
import SurveyElements from "@/app/components/apps/settings/survey-elements";
import SurveyGroups from "@/app/components/apps/settings/survey-groups";
import SurveyTemplates from "@/app/components/apps/settings/survey-templates";
import SurveyDamageTypes from "@/app/components/apps/settings/survey-damage-types";
import SurveyMaterials from "@/app/components/apps/settings/survey-materials";

const menuItems = [
  { icon: <IconComponents size={18} />, label: "Elements" },
  { icon: <IconStack2 size={18} />, label: "Groups" },
  { icon: <IconTemplate size={18} />, label: "Templates" },
  { icon: <IconAlertTriangle size={18} />, label: "Damage types" },
  { icon: <IconBox size={18} />, label: "Materials" },
];

interface SurveySettingsProps {
  open: boolean;
  onClose: () => void;
}

// Bottom settings drawer, laid out like the Time Clock settings: section menu on the left, section on the right.
const SurveySettings: React.FC<SurveySettingsProps> = ({ open, onClose }) => {
  const [activeMenuItem, setActiveMenuItem] = useState("Elements");

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      PaperProps={{
        className: "survey-settings",
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
          position: "relative",
          bgcolor: "#fff",
        }}
      >
        <IconSettings size={24} />
        <Typography>Survey Settings</Typography>
        <IconButton onClick={onClose} aria-label="Close settings" sx={{ position: "absolute", right: 12 }}>
          <IconX size={20} />
        </IconButton>
      </Box>

      {/* Main Content */}
      <Box display="flex" flex="1" sx={{ overflow: "hidden", flexDirection: { xs: "column", md: "row" } }}>
        <Box
          sx={{
            width: { xs: "auto", md: 240 },
            borderRight: { md: "1px solid #e0e0e0" },
            borderBottom: { xs: "1px solid #e0e0e0", md: "none" },
            p: 1,
            display: "flex",
            flexDirection: { xs: "row", md: "column" },
            gap: { xs: 0.5, md: 0 },
            overflowX: { xs: "auto", md: "hidden" },
            overflowY: { xs: "hidden", md: "auto" },
            flexShrink: 0,
            bgcolor: "#fff",
          }}
        >
          {menuItems.map((item) => (
            <Box
              key={item.label}
              sx={{
                p: 1,
                borderRadius: 1,
                cursor: "pointer",
                bgcolor: activeMenuItem === item.label ? "#eaf5ff" : "transparent",
                display: "flex",
                alignItems: "center",
                gap: 1,
                "&:hover": { bgcolor: "#f6f7f7" },
                fontSize: 14,
                whiteSpace: "nowrap",
                color: activeMenuItem === item.label ? "#203040" : "#7D92A9",
              }}
              role="tab"
              aria-selected={activeMenuItem === item.label}
              onClick={() => setActiveMenuItem(item.label)}
            >
              {item.icon}
              {item.label}
            </Box>
          ))}
        </Box>

        <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {activeMenuItem === "Elements" && <SurveyElements />}
          {activeMenuItem === "Groups" && <SurveyGroups />}
          {activeMenuItem === "Templates" && <SurveyTemplates />}
          {activeMenuItem === "Damage types" && <SurveyDamageTypes />}
          {activeMenuItem === "Materials" && <SurveyMaterials />}
        </Box>
      </Box>
    </Drawer>
  );
};

export default SurveySettings;

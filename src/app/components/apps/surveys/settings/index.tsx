"use client";

import React, { useState } from "react";
import { Box, Drawer, IconButton, Typography } from "@mui/material";
import { IconCurrencyPound, IconSettings, IconX } from "@tabler/icons-react";
import NhfRates from "./nhf-rates";

// Survey settings (bottom drawer, like Time Clock settings): section menu on the left, section on the right.
// Templates is added in the next step of the survey rebuild.
const SECTIONS = [{ key: "nhf", icon: <IconCurrencyPound size={18} />, label: "NHF rates" }];

interface Props {
  open: boolean;
  onClose: () => void;
}

const SurveySettings: React.FC<Props> = ({ open, onClose }) => {
  const [active, setActive] = useState("nhf");

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { borderTopLeftRadius: 12, borderTopRightRadius: 12, height: "90vh", display: "flex", flexDirection: "column" } }}
    >
      <Box display="flex" justifyContent="center" alignItems="center" sx={{ borderBottom: "1px solid #e0e0e0", p: 2, gap: 1, color: "#7D92A9", position: "relative", bgcolor: "#fff" }}>
        <IconSettings size={24} />
        <Typography>Survey Settings</Typography>
        <IconButton onClick={onClose} aria-label="Close settings" sx={{ position: "absolute", right: 12 }}>
          <IconX size={20} />
        </IconButton>
      </Box>
      <Box display="flex" flex="1" sx={{ overflow: "hidden", flexDirection: { xs: "column", md: "row" } }}>
        <Box
          sx={{
            width: { xs: "auto", md: 220 },
            borderRight: { md: "1px solid #e0e0e0" },
            borderBottom: { xs: "1px solid #e0e0e0", md: "none" },
            p: 1,
            display: "flex",
            flexDirection: { xs: "row", md: "column" },
            flexShrink: 0,
            bgcolor: "#fff",
          }}
        >
          {SECTIONS.map((s) => (
            <Box
              key={s.key}
              role="tab"
              aria-selected={active === s.key}
              onClick={() => setActive(s.key)}
              sx={{
                p: 1,
                borderRadius: 1,
                cursor: "pointer",
                bgcolor: active === s.key ? "#eaf5ff" : "transparent",
                display: "flex",
                alignItems: "center",
                gap: 1,
                "&:hover": { bgcolor: "#f6f7f7" },
                fontSize: 14,
                whiteSpace: "nowrap",
                color: active === s.key ? "#203040" : "#7D92A9",
              }}
            >
              {s.icon}
              {s.label}
            </Box>
          ))}
        </Box>
        <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", pt: 2, bgcolor: "#fff", display: "flex", flexDirection: "column" }}>{active === "nhf" && <NhfRates />}</Box>
      </Box>
    </Drawer>
  );
};

export default SurveySettings;

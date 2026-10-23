"use client";

import React, { useState } from "react";
import { Box, Tab, Tabs } from "@mui/material";
import SurveyElements from "@/app/components/apps/settings/survey-elements";
import SurveyGroups from "@/app/components/apps/settings/survey-groups";
import SurveyTemplates from "@/app/components/apps/settings/survey-templates";
import SurveyDamageTypes from "@/app/components/apps/settings/survey-damage-types";
import SurveyMaterials from "@/app/components/apps/settings/survey-materials";

const SurveySettings = () => {
  const [tab, setTab] = useState(0);

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <Tabs
        value={tab}
        onChange={(_, value) => setTab(value)}
        sx={{ px: 2, borderBottom: 1, borderColor: "divider", minHeight: 42 }}
      >
        <Tab label="Elements" sx={{ minHeight: 42 }} />
        <Tab label="Groups" sx={{ minHeight: 42 }} />
        <Tab label="Templates" sx={{ minHeight: 42 }} />
        <Tab label="Damage types" sx={{ minHeight: 42 }} />
        <Tab label="Materials" sx={{ minHeight: 42 }} />
      </Tabs>
      <Box sx={{ flex: 1, minHeight: 0 }}>
        {tab === 0 ? (
          <SurveyElements />
        ) : tab === 1 ? (
          <SurveyGroups />
        ) : tab === 2 ? (
          <SurveyTemplates />
        ) : tab === 3 ? (
          <SurveyDamageTypes />
        ) : (
          <SurveyMaterials />
        )}
      </Box>
    </Box>
  );
};

export default SurveySettings;

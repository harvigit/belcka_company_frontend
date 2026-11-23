"use client";

import React, { useState } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import { IconSettings } from "@tabler/icons-react";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import PermissionGuard from "@/app/auth/PermissionGuard";
import SurveySettings from "@/app/components/apps/surveys/settings";

// The Survey module is being rebuilt (work-first flow). The survey list comes in a later step;
// Settings (NHF rates, then Templates) is available already.
export default function SurveyListPage() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  return (
    <PageContainer title="Surveys" description="Surveys">
      <PermissionGuard permissions={["Surveys", "Survey", "surveys"]} requireAll={false}>
        <BlankCard>
          <Stack direction="row" alignItems="center" sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
            <Typography variant="h5">Surveys</Typography>
            <Button variant="outlined" color="inherit" startIcon={<IconSettings size={18} />} sx={{ ml: "auto" }} onClick={() => setSettingsOpen(true)}>
              Settings
            </Button>
          </Stack>
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography color="text.secondary">The new survey list is on its way. NHF rates are under Settings.</Typography>
          </Box>
        </BlankCard>
        <SurveySettings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </PermissionGuard>
    </PageContainer>
  );
}

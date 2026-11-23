"use client";

import React from "react";
import { Box, Typography } from "@mui/material";
import PageContainer from "@/app/components/container/PageContainer";
import BlankCard from "@/app/components/shared/BlankCard";
import PermissionGuard from "@/app/auth/PermissionGuard";

// The Survey module is being rebuilt (work-first flow: NHF rates, templates, surveys).
// The new screens replace this page step by step.
export default function SurveyListPage() {
  return (
    <PageContainer title="Surveys" description="Surveys">
      <PermissionGuard permissions={["Surveys", "Survey", "surveys"]} requireAll={false}>
        <BlankCard>
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="h5" sx={{ mb: 1 }}>
              Surveys
            </Typography>
            <Typography color="text.secondary">The new Survey module is on its way.</Typography>
          </Box>
        </BlankCard>
      </PermissionGuard>
    </PageContainer>
  );
}

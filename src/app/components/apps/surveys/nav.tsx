"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Tab, Tabs } from "@mui/material";
import { IconClipboardList, IconCurrencyPound } from "@tabler/icons-react";

// Top navigation of the Survey module: the survey list and the QS review.
const SurveyNav: React.FC<{ value: "surveys" | "qs" }> = ({ value }) => {
  const router = useRouter();
  return (
    <Tabs
      value={value}
      onChange={(_, v) => router.push(v === "qs" ? "/apps/surveys/qs" : "/apps/surveys/list")}
      sx={{ px: 2, borderBottom: 1, borderColor: "divider", minHeight: 46, "& .MuiTab-root": { minHeight: 46 } }}
    >
      <Tab value="surveys" iconPosition="start" icon={<IconClipboardList size={18} />} label="Surveys" />
      <Tab value="qs" iconPosition="start" icon={<IconCurrencyPound size={18} />} label="QS review" />
    </Tabs>
  );
};

export default SurveyNav;

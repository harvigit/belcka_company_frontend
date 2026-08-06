"use client";

import React from "react";
import { Box, Tab, Tabs } from "@mui/material";
import { ExpenseTabItem, ExpenseTabKey } from "../types";

type Props = {
  tabs: ExpenseTabItem[];
  activeTab: ExpenseTabKey;
  onChange: (tab: ExpenseTabKey) => void;
};

const ExpenseTabs = ({ tabs, activeTab, onChange }: Props) => {
  return (
    <Box
      sx={{
        mx: 2,
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <Tabs
        value={activeTab}
        onChange={(_, value: ExpenseTabKey) => onChange(value)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          minHeight: 42,
          "& .MuiTabs-indicator": {
            height: 2,
            bgcolor: "primary.main",
          },
          "& .MuiTab-root": {
            minHeight: 42,
            textTransform: "none",
            fontWeight: 500,
            fontSize: 14,
            color: "text.secondary",
            px: 1.5,
            mr: 0.5,
            "&.Mui-selected": {
              color: "primary.main",
              fontWeight: 600,
            },
          },
        }}
      >
        {tabs.map((tab) => (
          <Tab
            key={tab.key}
            value={tab.key}
            label={`${tab.label} (${tab.count})`}
            disableRipple
          />
        ))}
      </Tabs>
    </Box>
  );
};

export default ExpenseTabs;

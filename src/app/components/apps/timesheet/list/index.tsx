"use client";

import React, { useState } from "react";
import { Box, Tab, Tabs } from "@mui/material";

import "react-day-picker/dist/style.css";
import "../../../../global.css";

import TimesheetList from "./timesheet";
import TimeClock from "./time-clock";

const TimesheetPage = () => {
  const [value, setValue] = useState(0);

  const handleTabChange = (event: any, newValue: any) => {
    setValue(newValue);
  };

  return (
    <Box p={2}>
      <Tabs
        className="timesheet-tabs"
        value={value}
        onChange={handleTabChange}
        aria-label="minimal-tabs"
        TabIndicatorProps={{ style: { display: "none" } }}
        sx={{
          borderRadius: "12px",
          minHeight: "40px",
          display: "flex",
          justifyContent: "space-between",
          mb: 2,
          "& .MuiTab-root": {
            minHeight: 36,
            textTransform: "none",
            fontSize: 16,
            color: "#555",
            padding: "0 8px",
          },
        }}
      >
        <Tab
          label="Timesheets"
          sx={{
            textTransform: "none",
            borderRadius: "10px",
            minHeight: "32px",
            minWidth: "auto",
            px: 3,
            py: 0.5,
            fontWeight: value === 0 ? "600" : "400",
            // color: value === 0 ? "#000 !important" : "#888",
            backgroundColor: value === 0 ? "#E0E0E0" : "transparent",
            transition: "all 0.3s ease",
          }}
        />
        <Tab
          label="Time Clock"
          sx={{
            textTransform: "none",
            borderRadius: "10px",
            minHeight: "32px",
            minWidth: "auto",
            px: 3,
            py: 0.5,
            fontWeight: value === 1 ? "600" : "400",
            // color: value === 1 ? "#000 !important" : "#888",
            backgroundColor: value === 1 ? "#E0E0E0" : "transparent",
            transition: "all 0.3s ease",
          }}
        />
      </Tabs>

      {value === 0 && <TimesheetList />}

      {value === 1 && <TimeClock />}
    </Box>
  );
};

export default TimesheetPage;

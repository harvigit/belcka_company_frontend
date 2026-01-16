"use client";

import React, { useState } from "react";
import { Box, Button, Tab, Tabs } from "@mui/material";
import "react-day-picker/dist/style.css";
import "@/app/global.css";

// import TimesheetList from './list/timesheet';
import TimeClock from "@/app/components/apps/time-clock/time-clock";
import { IconSettings } from "@tabler/icons-react";
import Setting from "./setting/settings";
import PermissionGuard from "@/app/auth/PermissionGuard";
import { useSearchParams } from "next/navigation";

const TimesheetPage = () => {
  const [value, setValue] = useState(0);
  const [settingOpen, setSettingOpen] = useState(false);
  const searchParams = useSearchParams();
  const userIdParam = searchParams?.get("user_id");
  const startParam = searchParams?.get("start_date");
  const endParam = searchParams?.get("end_date");
  const openParam = searchParams?.get("open");
  const handleTabChange = (event: any, newValue: any) => {
    setValue(newValue);
  };

  const handleSettingOpen = () => {
    setSettingOpen(true);
  };

  const handleSettingClose = () => {
    setSettingOpen(false);
  };

  return (
    <PermissionGuard permission="Bookkeeper">
      <Box p={2} pt={0}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Tabs
            className="timesheet-tabs"
            value={value}
            onChange={handleTabChange}
            aria-label="timesheet-tabs"
            sx={{
              borderRadius: "12px",
              "& .MuiTab-root": {
                textTransform: "none",
                fontSize: "16px",
                fontWeight: 500,
                color: "#666",
                padding: "12px 24px",
                minHeight: "44px",
                borderRadius: "10px",
                margin: "0 4px",
                transition: "all 0.3s ease",
                "&.Mui-selected": {
                  color: "#1976d2",
                  fontWeight: 600,
                },
              },
              "& .MuiTabs-indicator": {
                display: "none",
              },
            }}
          >
            {/* Commented out Timesheets tab */}
            {/*<Tab
                        label="Timesheets"
                        sx={{
                            textTransform: 'none',
                            borderRadius: '10px',
                            minHeight: '44px',
                            px: 3,
                            py: 1.5,
                            fontWeight: value === 0 ? 600 : 500,
                            transition: 'all 0.3s ease',
                            '&.Mui-selected': {
                                backgroundColor: '#e3f2fd',
                                color: '#1976d2',
                            },
                        }}
                    />*/}
            <Tab
              label="Time Tracking"
              sx={{
                textTransform: "none",
                borderRadius: "10px",
                minHeight: "44px",
                px: 3,
                py: 1.5,
                fontWeight: value === 0 ? 600 : 500,
                transition: "all 0.3s ease",
                "&.Mui-selected": {
                  color: "#1976d2",
                },
              }}
            />
          </Tabs>

          <Button
            variant="outlined"
            color="primary"
            onClick={handleSettingOpen}
            sx={{
              textTransform: "none",
              borderRadius: "10px",
              minHeight: "32px",
              px: 2,
              py: 0.5,
              fontWeight: 500,
              boxShadow: "none",
            }}
          >
            <IconSettings />
            Setting
          </Button>
        </Box>

        {/* Commented out TimesheetList rendering */}
        {/*{value === 0 && <TimesheetList />}*/}
        {value === 0 && (
          <TimeClock
            queryParams={{
              user_id: userIdParam,
              start_date: startParam,
              end_date: endParam,
              open: openParam,
            }}
          />
        )}

        <Setting settingOpen={settingOpen} onClose={handleSettingClose} />
      </Box>
    </PermissionGuard>
  );
};

export default TimesheetPage;

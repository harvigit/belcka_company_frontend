"use client";

import React, { useEffect, useState } from "react";
import { Box, Button, Tab, Tabs } from "@mui/material";
import "react-day-picker/dist/style.css";
import "@/app/global.css";

// import TimesheetList from './list/timesheet';
import TimeClock from "@/app/components/apps/time-clock/time-clock";
import { IconSettings } from "@tabler/icons-react";
import Setting from "./setting/settings";
import PermissionGuard from "@/app/auth/PermissionGuard";
import { useSearchParams } from "next/navigation";

type QueryParams = {
  user_id: string | null;
  start_date: string | null;
  end_date: string | null;
  open: string | null;
  type: string | null;
  recordId: string | null;
};

const TimesheetPage = () => {
  const [value, setValue] = useState(0);
  const [settingOpen, setSettingOpen] = useState(false);
  const searchParams = useSearchParams();

  const [queryParams, setQueryParams] = useState<QueryParams>({
    user_id: null,
    start_date: null,
    end_date: null,
    open: null,
    type: null,
    recordId: null,
  });

  useEffect(() => {
    if (!searchParams) return;

    setQueryParams({
      user_id: searchParams.get("user_id"),
      start_date: searchParams.get("start_date"),
      end_date: searchParams.get("end_date"),
      open: searchParams.get("open"),
      type: searchParams.get("type"),
      recordId: searchParams.get("id"),
    });
  }, [searchParams]);

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
          {/* <Tabs
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
          > */}
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
          {/* <Tab
              label="Bookkeeper"
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
            /> */}
          {/* </Tabs> */}
          {/* <Button
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
          </Button> */}
        </Box>

        {/* Commented out TimesheetList rendering */}
        {/*{value === 0 && <TimesheetList />}*/}
        {value === 0 && <TimeClock queryParams={queryParams} />}

        {/* <Setting settingOpen={settingOpen} onClose={handleSettingClose} /> */}
      </Box>
    </PermissionGuard>
  );
};

export default TimesheetPage;

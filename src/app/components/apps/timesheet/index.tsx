'use client';

import React, { useState } from 'react';
import { Box, Button, Tab, Tabs } from '@mui/material';
import 'react-day-picker/dist/style.css';
import '@/app/global.css';

import TimesheetList from './list/timesheet';
import TimeClock from '@/app/components/apps/time-clock/time-clock';
import { IconSettings } from '@tabler/icons-react';
import Setting from './setting/settings';

const TimesheetPage = () => {
    const [value, setValue] = useState(0);
    const [settingOpen, setSettingOpen] = useState(false);

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
        <Box p={2}>
            <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
            >
                <Tabs
                    className="timesheet-tabs"
                    value={value}
                    onChange={handleTabChange}
                    aria-label="minimal-tabs"
                    TabIndicatorProps={{ style: { display: 'none' } }}
                    sx={{
                        borderRadius: '12px',
                        minHeight: '40px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        mb: 2,
                        '& .MuiTab-root': {
                            minHeight: 36,
                            textTransform: 'none',
                            fontSize: 16,
                            color: '#555',
                            padding: '0 8px',
                        },
                    }}
                >
                    <Tab
                        label="Timesheets"
                        sx={{
                            textTransform: 'none',
                            borderRadius: '10px',
                            minHeight: '32px',
                            minWidth: 'auto',
                            px: 3,
                            py: 0.5,
                            fontWeight: value === 0 ? '600' : '400',
                            transition: 'all 0.3s ease',
                        }}
                    />
                    <Tab
                        label="Time Clock"
                        sx={{
                            textTransform: 'none',
                            borderRadius: '10px',
                            minHeight: '32px',
                            minWidth: 'auto',
                            px: 3,
                            py: 0.5,
                            fontWeight: value === 1 ? '600' : '400',
                            transition: 'all 0.3s ease',
                        }}
                    />
                </Tabs>

                <Button
                    variant="outlined"
                    color="primary"
                    onClick={handleSettingOpen}
                    sx={{
                        textTransform: 'none',
                        borderRadius: '10px',
                        minHeight: '32px',
                        px: 2,
                        py: 0.5,
                        fontWeight: 500,
                        boxShadow: 'none',
                    }}
                >
                    <IconSettings />
                    Setting
                </Button>
            </Box>

            {value === 0 && <TimesheetList />}
            {value === 1 && <TimeClock />}

            <Setting
                settingOpen={settingOpen}
                onClose={handleSettingClose}
            />
        </Box>
    );
};

export default TimesheetPage;

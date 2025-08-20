'use client';

import React, {useState} from 'react';
import {
    Box,
    Tab,
    Tabs,
} from '@mui/material';

import 'react-day-picker/dist/style.css';
import '../../../../global.css';

import TimesheetList from './timesheet';
import TimeClock from './time-clock';

const TimesheetPage = () => {
    const [value, setValue] = useState(0);

    const handleTabChange = (event: any, newValue: any) => {
        setValue(newValue);
    };

    return (
        <Box p={2}>
            <Tabs
                value={value}
                onChange={handleTabChange}
                aria-label="minimal-tabs"
                sx={{
                    minHeight: 36,
                    '& .MuiTabs-indicator': {
                        backgroundColor: '#007bff',
                        height: 2,
                    },
                    '& .MuiTab-root': {
                        minHeight: 36,
                        textTransform: 'none',
                        fontSize: 14,
                        fontWeight: 400,
                        color: '#555',
                        padding: '0 8px',
                    },
                    '& .Mui-selected': {
                        color: '#007bff',
                        fontWeight: 600,
                    }
                }}
            >
                <Tab label="Timesheets" />
                <Tab label="Time Clock" />
            </Tabs>

            {value === 0 && (
                <TimesheetList />
            )}

            {value === 1 && (
                <TimeClock />
            )}
        </Box>
    );
};

export default TimesheetPage;

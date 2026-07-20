"use client";

import React, { useState } from "react";
import {
    Box,
    Drawer,
    Snackbar,
    Typography,
} from "@mui/material";
import {
    IconSettings,
    IconCalendarWeek,
    IconTiltShift,
    IconCoinPound,
    IconMapPinCog,
    IconUserCog,
    IconDoorExit,
    IconCalendarOff,
    IconCategoryPlus,
} from '@tabler/icons-react';
import GeneralSetting from './menus/general';
import ShiftLists from './menus/shift/index';
import ShiftManagement from './menus/shift/shift-management';
import Payroll from './menus/payroll';
import RateSetting from "./menus/rate-setting";
import PenaltySettings from "./menus/penalty-setting";
import BookkeeperSetting from "./menus/bookkeeper-setting";
import LeaveList from './menus/leaves/list';
import HolidayList from './menus/holidays/list';
import CategoryList from './menus/expense-categories/list';

const menuItems = [
    { icon: <IconSettings size={18} />, label: "General" },
    { icon: <IconTiltShift size={18} />, label: "Shift" },
    // { icon: <IconTiltShift size={18} />, label: "Shift Management" },
    { icon: <IconCalendarWeek size={18} />, label: "Payroll" },
    { icon: <IconCoinPound size={18} />, label: "Rate Settings" },
    { icon: <IconMapPinCog size={18} />, label: "Penalty Setting" },
    { icon: <IconUserCog size={18} />, label: "Bookkeeper Setting" },
    // { icon: <IconDoorExit size={18} />, label: "Leaves" },
    // { icon: <IconCalendarOff size={18} />, label: "Holidays" },
    { icon: <IconCategoryPlus size={18} />, label: "Expense Category" },
];

interface SettingsProps {
    settingOpen: boolean;
    onClose: () => void;
}

const Settings: React.FC<SettingsProps> = ({ settingOpen, onClose }) => {
    const [activeMenuItem, setActiveMenuItem] = useState<string>("General");
    const [openSnackbar, setOpenSnackbar] = useState(false);

    const handleMenuItemClick = (label: string) => {
        setActiveMenuItem(label);
    };

    const handleSaveSuccess = () => {
        setOpenSnackbar(true);
    };

    return (
        <>
            <Drawer
                anchor="bottom"
                open={settingOpen}
                onClose={onClose}
                PaperProps={{
                    sx: {
                        borderTopLeftRadius: 12,
                        borderTopRightRadius: 12,
                        height: "90vh",
                        display: "flex",
                        flexDirection: "column",
                    },
                }}
            >
                {/* Header */}
                <Box
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    sx={{
                        borderBottom: '1px solid #e0e0e0',
                        p: 2,
                        gap: 1,
                        color: '#7D92A9',
                        position: "sticky",
                        top: 0,
                        zIndex: 1000,
                        bgcolor: "#fff",
                    }}
                >
                    <IconSettings size={24} />
                    <Typography>Settings</Typography>
                </Box>

                {/* Main Content */}
                <Box
                    display="flex"
                    flex="1"
                    sx={{ overflow: "hidden" }}
                >
                    <Box
                        sx={{
                            width: 240,
                            borderRight: "1px solid #e0e0e0",
                            p: 1,
                            overflowY: "auto",
                            bgcolor: "#fff",
                            '&::-webkit-scrollbar': {
                                width: '6px',
                            },
                            '&::-webkit-scrollbar-track': {
                                background: 'transparent',
                            },
                            '&::-webkit-scrollbar-thumb': {
                                background: '#c1c1c1',
                                borderRadius: '3px',
                            },
                            '&::-webkit-scrollbar-thumb:hover': {
                                background: '#a8a8a8',
                            },
                        }}
                    >
                        {menuItems.map((item, i) => (
                            <Box
                                key={i}
                                sx={{
                                    p: 1,
                                    borderRadius: 1,
                                    cursor: "pointer",
                                    bgcolor: activeMenuItem === item.label ? "#eaf5ff" : "transparent",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                    "&:hover": { bgcolor: "#f6f7f7" },
                                    fontSize: 14,
                                    color: activeMenuItem === item.label ? '#203040' : '#7D92A9',
                                }}
                                onClick={() => handleMenuItemClick(item.label)}
                            >
                                {item.icon}
                                {item.label}
                            </Box>
                        ))}
                    </Box>

                    <Box
                        sx={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            overflow: "hidden",
                        }}
                    >
                        {activeMenuItem === "General" && (
                            <GeneralSetting onSaveSuccess={handleSaveSuccess} />
                        )}
                        {/*{activeMenuItem === "Leaves" && (*/}
                        {/*    <LeaveList />*/}
                        {/*)}*/}
                        {/*{activeMenuItem === "Holidays" && (*/}
                        {/*    <HolidayList />*/}
                        {/*)}*/}
                        {activeMenuItem === "Shift" && (
                            <ShiftLists />
                        )}
                        {/* {activeMenuItem === "Shift Management" && (
                            <ShiftManagement />
                        )} */}
                        {activeMenuItem === "Payroll" && (
                            <Payroll />
                        )}
                        {activeMenuItem === "Expense Category" && (
                            <CategoryList />
                        )}
                        {activeMenuItem === "Rate Settings" && (
                            <RateSetting />
                        )}
                        {activeMenuItem === "Penalty Setting" && (
                            <PenaltySettings />
                        )}
                        {activeMenuItem === "Bookkeeper Setting" && (
                            <BookkeeperSetting onSaveSuccess={handleSaveSuccess}/>
                        )}
                        {/* {activeMenuItem === 'Geolocation' && (
                            <Geofence onSaveSuccess={handleSaveSuccess} />
                        )} */}
                    </Box>
                </Box>
            </Drawer>

            {/* Snackbar for Save Confirmation */}
            <Snackbar
                open={openSnackbar}
                autoHideDuration={3000}
                onClose={() => setOpenSnackbar(false)}
                message="Settings saved!"
            />
        </>
    );
};

export default Settings;

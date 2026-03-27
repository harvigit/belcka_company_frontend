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
    IconAlertTriangle,
    IconAlertOctagon,
    IconFirstAidKit,
} from '@tabler/icons-react';
import HazardList from './menus/hazards';
import IncidentTypeList from './menus/incident-types';
import ThreatLevelList from './menus/threat-levels';

const menuItems = [
    { icon: <IconAlertTriangle size={18} />, label: "Hazards" },
    { icon: <IconFirstAidKit size={18} />, label: "Incident Types" },
    { icon: <IconAlertOctagon size={18} />, label: "Threat Levels" },
];

interface SettingsProps {
    settingOpen: boolean;
    companyId: number;
    onClose: () => void;
}

const Settings: React.FC<SettingsProps> = ({ settingOpen, companyId, onClose }) => {
    const [activeMenuItem, setActiveMenuItem] = useState<string>("Hazards");
    const [openSnackbar, setOpenSnackbar] = useState(false);

    const handleMenuItemClick = (label: string) => {
        setActiveMenuItem(label);
    };

    const renderContent = () => {
        switch (activeMenuItem) {
            case "Hazards":
                return <HazardList companyId={companyId} />;
            case "Incident Types":
                return <IncidentTypeList companyId={companyId} />;
            case "Threat Levels":
                return <ThreatLevelList companyId={companyId} />;
            default:
                return null;
        }
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
                    <Typography>Health Safety Settings</Typography>
                </Box>

                {/* Main Content */}
                <Box display="flex" flex="1" sx={{ overflow: "hidden" }}>
                    {/* Sidebar Nav */}
                    <Box
                        sx={{
                            width: 240,
                            borderRight: "1px solid #e0e0e0",
                            p: 1,
                            overflowY: "auto",
                            bgcolor: "#fff",
                            '&::-webkit-scrollbar': { width: '6px' },
                            '&::-webkit-scrollbar-track': { background: 'transparent' },
                            '&::-webkit-scrollbar-thumb': { background: '#c1c1c1', borderRadius: '3px' },
                            '&::-webkit-scrollbar-thumb:hover': { background: '#a8a8a8' },
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

                    {/* Right Panel */}
                    <Box
                        sx={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            overflow: "hidden",
                        }}
                    >
                        {renderContent()}
                    </Box>
                </Box>
            </Drawer>

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

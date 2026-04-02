"use client";

import React, { useEffect, useState } from "react";
import {
    Box,
    Typography,
    CircularProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableRow,
    Paper,
} from "@mui/material";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import api from "@/utils/axios";
import toast from "react-hot-toast";
import IOSSwitch from "@/app/components/common/IOSSwitch";

interface GeofencePenaltyProps {
    companyId: number;
    active: boolean;
    userId: number;
    isShow?: boolean;
    disableDateFilter?: boolean;
}

interface SettingItem {
    key: string;
    label: string;
    value: boolean;
}

const GeofencePenalty: React.FC<GeofencePenaltyProps> = ({companyId, active, userId}) => {
    const { data: session } = useSession();
    const user = session?.user as User & {
        company_id?: number | null;
        user_role_id?: number | null;
    };

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState<string | null>(null);

    const [penaltySettings, setPenaltySettings] = useState<SettingItem[]>([
        { key: "auto_stop_work_penalty", label: "Automatically stop work penalty", value: false },
        { key: "stop_work_outside_penalty", label: "Stop work outside of working area penalty", value: false },
    ]);

    const [geofenceSettings, setGeofenceSettings] = useState<SettingItem[]>([
        { key: "geofence_main_setting", label: "Geofence main setting", value: false },
        { key: "start_work_within_geofence", label: "Only allow to start work within geofence boundary", value: false },
        { key: "stop_work_within_geofence", label: "Only allow to stop work within geofence boundary", value: false },
    ]);

    const isGeofenceMainEnabled = geofenceSettings.find(
        (item) => item.key === "geofence_main_setting"
    )?.value ?? false;

    const fetchSettings = async () => {
        if (!active) return;
        setLoading(true);
        try {
            const res = await api.get(
                `user/get-geofence-penalty-settings?user_id=${userId}&company_id=${companyId}`
            );
            if (res.data?.IsSuccess && res.data?.info) {
                const info = res.data.info;
                setPenaltySettings((prev) =>
                    prev.map((item) => ({
                        ...item,
                        value: info[item.key] ?? item.value,
                    }))
                );
                setGeofenceSettings((prev) =>
                    prev.map((item) => ({
                        ...item,
                        value: info[item.key] ?? item.value,
                    }))
                );
            }
        } catch (err) {
            console.error("Failed to fetch geofence settings", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, [active, userId, companyId]);

    const handleToggle = async (
        section: "penalty" | "geofence",
        key: string,
        newValue: boolean
    ) => {
        setSaving(key);

        if (section === "penalty") {
            setPenaltySettings((prev) =>
                prev.map((item) =>
                    item.key === key ? { ...item, value: newValue } : item
                )
            );
        } else {
            setGeofenceSettings((prev) =>
                prev.map((item) => {
                    if (item.key === key) return { ...item, value: newValue };

                    if (key === "geofence_main_setting" && !newValue) {
                        return { ...item, value: false };
                    }

                    return item;
                })
            );
        }

        try {
            const payload: Record<string, unknown> = {
                user_id: userId,
                company_id: companyId,
                [key]: newValue,
            };

            if (key === "geofence_main_setting" && !newValue) {
                payload["start_work_within_geofence"] = false;
                payload["stop_work_within_geofence"] = false;
            }

            const res = await api.post("user/update-geofence-penalty-settings", payload);
            if (res.data?.IsSuccess) {
                toast.success(res.data.message || "Setting updated");
            } else {
                setGeofenceSettings((prev) =>
                    prev.map((item) =>
                        item.key === key ? { ...item, value: !newValue } : item
                    )
                );
            }
        } catch (err) {
            console.error("Failed to update setting", err);
            // Revert on error
            if (section === "penalty") {
                setPenaltySettings((prev) =>
                    prev.map((item) =>
                        item.key === key ? { ...item, value: !newValue } : item
                    )
                );
            } else {
                setGeofenceSettings((prev) =>
                    prev.map((item) =>
                        item.key === key ? { ...item, value: !newValue } : item
                    )
                );
            }
        } finally {
            setSaving(null);
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
                <CircularProgress />
            </Box>
        );
    }

    const SectionHeader = ({ label }: { label: string }) => (
        <TableRow>
            <TableCell
                colSpan={2}
                sx={{
                    backgroundColor: "#dde3e8",
                    py: 1.2,
                    px: 2.5,
                    borderBottom: "none",
                }}
            >
                <Typography
                    sx={{
                        fontSize: "14px",
                        color: "#5a6a7a",
                        fontWeight: 400,
                    }}
                >
                    {label}
                </Typography>
            </TableCell>
            <TableCell
                sx={{
                    backgroundColor: "#dde3e8",
                    py: 1.2,
                    px: 2.5,
                    borderBottom: "none",
                    width: 120,
                    textAlign: "right",
                }}
            >
                <Typography
                    sx={{
                        fontSize: "14px",
                        color: "#5a6a7a",
                        fontWeight: 400,
                    }}
                >
                    Action
                </Typography>
            </TableCell>
        </TableRow>
    );

    return (
        <Box p={3}>
            <TableContainer
                component={Paper}
                elevation={0}
                sx={{
                    border: "1px solid #e0e6ec",
                    borderRadius: "10px",
                    overflow: "hidden",
                }}
            >
                <Table>
                    <TableBody>
                        <SectionHeader label="Penalty Setting" />
                        {penaltySettings.map((item, index) => (
                            <TableRow
                                key={item.key}
                                sx={{
                                    "&:hover": { backgroundColor: "#f9fafb" },
                                    borderBottom: index === penaltySettings.length - 1 ? "none" : "1px solid #eef0f3",
                                }}
                            >
                                <TableCell
                                    colSpan={2}
                                    sx={{
                                        py: 2,
                                        px: 2.5,
                                        border: "none",
                                        borderBottom: "1px solid #eef0f3",
                                    }}
                                >
                                    <Typography
                                        sx={{
                                            fontSize: "14px",
                                            fontWeight: 600,
                                            color: "#2c3e50",
                                        }}
                                    >
                                        {item.label}
                                    </Typography>
                                </TableCell>
                                <TableCell
                                    sx={{
                                        py: 2,
                                        px: 2.5,
                                        width: 120,
                                        textAlign: "right",
                                        border: "none",
                                        borderBottom: "1px solid #eef0f3",
                                    }}
                                >
                                    <IOSSwitch
                                        checked={item.value}
                                        disabled={saving === item.key}
                                        onChange={() =>
                                            handleToggle("penalty", item.key, !item.value)
                                        }
                                    />
                                </TableCell>
                            </TableRow>
                        ))}

                        {/* Geofence Section Header */}
                        <SectionHeader label="Geofence Setting" />

                        {geofenceSettings.map((item, index) => (
                            <TableRow
                                key={item.key}
                                sx={{
                                    "&:hover": { backgroundColor: "#f9fafb" },
                                }}
                            >
                                <TableCell
                                    colSpan={2}
                                    sx={{
                                        py: 2,
                                        px: 2.5,
                                        border: "none",
                                        borderBottom:
                                            index === geofenceSettings.length - 1
                                                ? "none"
                                                : "1px solid #eef0f3",
                                    }}
                                >
                                    <Typography
                                        sx={{
                                            fontSize: "14px",
                                            fontWeight: 600,
                                            color: item.key !== "geofence_main_setting" && !isGeofenceMainEnabled ? "#aab4be" : "#2c3e50", 
                                        }}
                                    >
                                        {item.label}
                                    </Typography>
                                </TableCell>
                                <TableCell
                                    sx={{
                                        py: 2,
                                        px: 2.5,
                                        width: 120,
                                        textAlign: "right",
                                        border: "none",
                                        borderBottom: index === geofenceSettings.length - 1 ? "none" : "1px solid #eef0f3",
                                    }}
                                >
                                    <IOSSwitch
                                        checked={item.value}
                                        disabled={
                                        saving === item.key ||
                                        (item.key !== "geofence_main_setting" && !isGeofenceMainEnabled)
                                    }
                                        onChange={() =>
                                        handleToggle("geofence", item.key, !item.value)
                                    }
                                        />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default GeofencePenalty;

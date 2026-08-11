"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
    Box,
    Typography,
    Select,
    MenuItem,
    FormControl,
    Button,
    CircularProgress,
} from "@mui/material";
import { IconRefresh, IconInfoCircle } from "@tabler/icons-react";
import api from "@/utils/axios";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

interface PayrollSettings {
    payrollCycle: string;
}

interface PayrollState extends PayrollSettings {
    isSaving: boolean;
    isLoading: boolean;
}

interface PayrollProps {
    onSaveSuccess?: () => void;
}

const selectSx = {
    minWidth: 180,
    fontSize: 14,
    "& .MuiOutlinedInput-notchedOutline": {
        borderColor: "#d1d5db",
        borderRadius: "8px",
    },
    "&:hover .MuiOutlinedInput-notchedOutline": {
        borderColor: "#1976d2",
    },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
        borderColor: "#1976d2",
        borderWidth: "1.5px",
    },
    "& .MuiSelect-select": {
        py: "8px",
        px: "14px",
    },
    "& .MuiSvgIcon-root": {
        color: "#1976d2",
    },
};

const dropdownMenuProps = {
    PaperProps: {
        sx: {
            borderRadius: "10px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
            border: "1.5px solid #e5e7eb",
            mt: 0.5,
            "& .MuiMenuItem-root": {
                fontSize: 14,
                color: "#374151",
                "&.Mui-selected": {
                    backgroundColor: "#eaf5ff",
                    color: "#1976d2",
                    fontWeight: 500,
                    "&:hover": { backgroundColor: "#eaf5ff" },
                },
                "&:hover": { backgroundColor: "#f9fafb" },
            },
        },
    },
};

export default function Payroll({ onSaveSuccess }: PayrollProps) {
    const { t } = useTranslation();
    const [state, setState] = useState<PayrollState>({
        payrollCycle: "",
        isSaving: false,
        isLoading: true,
    });

    const [payrollOptions, setPayrollOptions] = useState<
        { label: string; value: string }[]
    >([]);

    useEffect(() => {
        let mounted = true;

        const fetchSettings = async () => {
            try {
                const response = await api.get("/setting/get-payroll-settings");

                if (response.data?.IsSuccess && mounted) {
                    const { payroll_cycle, payroll_cycle_options } = response.data.data;

                    setState((prev) => ({
                        ...prev,
                        payrollCycle: payroll_cycle || "",
                        isLoading: false,
                    }));

                    setPayrollOptions(payroll_cycle_options || []);
                } else if (mounted) {
                    setState((prev) => ({ ...prev, isLoading: false }));
                }
            } catch (error) {
                console.error("Error fetching payroll settings:", error);
                if (mounted) {
                    toast.error(t("Could not load payroll settings"));
                    setState((prev) => ({ ...prev, isLoading: false }));
                }
            }
        };

        fetchSettings();

        return () => {
            mounted = false;
        };
    }, []);

    const handleSave = useCallback(async () => {
        if (!state.payrollCycle) {
            toast.error(t("Please select a payroll cycle"));
            return;
        }

        setState((prev) => ({ ...prev, isSaving: true }));

        try {
            const payload = {
                payroll_cycle: state.payrollCycle,
            };

            const response = await api.post("/setting/save-payroll-settings", payload);

            if (response.data?.IsSuccess) {
                toast.success(response.data.message || t("Payroll settings saved successfully"));
                onSaveSuccess?.();
            } else {
                toast.error(response.data?.message || t("Failed to save settings"));
            }
        } catch (error) {
            console.error("Error saving payroll settings:", error);
            toast.error(t("Failed to save payroll settings"));
        } finally {
            setState((prev) => ({ ...prev, isSaving: false }));
        }
    }, [state.payrollCycle, onSaveSuccess]);

    if (state.isLoading) {
        return (
            <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                height="100%"
            >
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <Box sx={{ flex: 1, overflowY: "auto", p: 3, backgroundColor: "#fff" }}>
                <Box sx={{ maxWidth: 680, mx: "auto" }}>

                    {/* Payroll Cycle Row */}
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            py: 2,
                            px: 1.5,
                            border: "2px solid #e5e7eb",
                            borderRadius: "8px",
                            my: 1,
                            backgroundColor: "#fafafa",
                        }}
                    >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                            <IconRefresh size={20} color="#1976d2" stroke={1.8} />
                            <Typography
                                sx={{ fontSize: 15, fontWeight: 500, color: "#111827" }}
                            >
                                {t('Payroll cycle')}
                            </Typography>
                        </Box>

                        <FormControl size="small">
                            <Select
                                value={state.payrollCycle}
                                onChange={(e) =>
                                    setState((prev) => ({
                                        ...prev,
                                        payrollCycle: e.target.value as string,
                                    }))
                                }
                                sx={selectSx}
                                MenuProps={dropdownMenuProps}
                                disabled={state.isSaving}
                            >
                                {payrollOptions.map((opt) => (
                                    <MenuItem key={opt.value} value={opt.value}>
                                        {t(opt.label)}
                                    </MenuItem>
                                ))}
                                {payrollOptions.length === 0 && (
                                    <MenuItem disabled value="">
                                        {t('No options available')}
                                    </MenuItem>
                                )}
                            </Select>
                        </FormControl>
                    </Box>

                    {/* Warning Note */}
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 1,
                            mt: 1.5,
                            px: 1.5,
                            py: 1.2,
                            backgroundColor: "#fffbeb",
                            border: "1.5px solid #fcd34d",
                            borderRadius: "8px",
                        }}
                    >
                        <IconInfoCircle
                            size={18}
                            color="#b45309"
                            stroke={1.8}
                            style={{ marginTop: 1, flexShrink: 0 }}
                        />
                        <Typography sx={{ fontSize: 13.5, color: "#92400e", lineHeight: 1.5 }}>
                            {t('Changing the payroll period may impact the calculations of timesheet.')}
                        </Typography>
                    </Box>

                </Box>
            </Box>

            <Box
                sx={{
                    borderTop: "1px solid #e0e0e0",
                    p: 2,
                    bgcolor: "#fff",
                    position: "sticky",
                    bottom: 0,
                    zIndex: 1000,
                    textAlign: "right",
                }}
            >
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSave}
                    disabled={state.isSaving}
                    sx={{
                        minWidth: 140,
                        bgcolor: "#1976d2",
                        color: "#fff",
                        "&:hover": { bgcolor: "#1565c0" },
                        "&:disabled": { bgcolor: "#ccc" },
                    }}
                >
                    {state.isSaving ? (
                        <>
                            <CircularProgress
                                size={16}
                                sx={{ mr: 1, color: "inherit" }}
                            />
                            {t('Saving...')}
                        </>
                    ) : (
                        t('Save changes')
                    )}
                </Button>
            </Box>
        </Box>
    );
}

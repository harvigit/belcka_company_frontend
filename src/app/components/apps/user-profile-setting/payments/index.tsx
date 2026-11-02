"use client";

import React, { useEffect, useState } from "react";
import { Box, Tabs, Tab, Divider } from "@mui/material";
import PayslipsList from "./components/payslips/index";
import InvoicesList from "./components/invoices/index";
import PaymentsList from "./components/payments/index";
import PermissionGuard from "@/app/auth/PermissionGuard";
import { useTranslation } from "react-i18next";

interface PayslipListingProps {
  companyId: number | null;
  active: boolean;
  userId: any;
  isShow: boolean;
  disableDateFilter?: boolean;
  readOnly?: boolean;
  // Set when the parent page already wraps this in the same PermissionGuard.
  skipPermissionGuard?: boolean;
}

const Payments: React.FC<PayslipListingProps> = ({companyId, active, userId, isShow, disableDateFilter = false, readOnly = false, skipPermissionGuard = false}) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState(0);
    // On the user details page every tab is mounted up front and hidden; wait
    // until this one is first opened before loading its guard and lists.
    const [hasBeenActive, setHasBeenActive] = useState(active);

    useEffect(() => {
        if (active) setHasBeenActive(true);
    }, [active]);

    if (!hasBeenActive) return null;

    const content = (
            <Box>
                <Tabs
                    className="user-tabs"
                    aria-label="Sidebar Tabs"
                    value={activeTab}
                    onChange={(_, val) => setActiveTab(val)}
                    sx={{
                        textTransform: "none",
                        borderRadius: "10px",
                        px: 3,
                        py: 0.5,
                        fontSize: "14px",
                        fontWeight: 600,
                        transition: "all 0.3s ease",
                    }}
                >
                    <Tab label={t("Payslips")} sx={{ fontWeight: 600 }} />
                    <Tab label={t("Payments")} sx={{ fontWeight: 600 }} />
                    <Tab label={t("Invoices")} sx={{ fontWeight: 600 }} />
                </Tabs>

                <Divider />

                <Box mt={2}>
                    {activeTab === 0 && <PayslipsList userId={userId} isShow={isShow} disableDateFilter={disableDateFilter} readOnly={readOnly} />}
                    {activeTab === 1 && <PaymentsList userId={userId} isShow={isShow} disableDateFilter={disableDateFilter} />}
                    {activeTab === 2 && <InvoicesList userId={userId} isShow={isShow} disableDateFilter={disableDateFilter} readOnly={readOnly} />}
                </Box>
            </Box>
    );

    if (skipPermissionGuard) return content;

    return (
        <PermissionGuard permission={userId && !Number.isNaN(userId) ? "Users" : "Payments"}>
            {content}
        </PermissionGuard>
    );
};

export default Payments;

"use client";

import React, { useState } from "react";
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
}

const Payments: React.FC<PayslipListingProps> = ({companyId, active, userId, isShow, disableDateFilter = false, readOnly = false}) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState(0);

    return (
        <PermissionGuard permission={userId && !Number.isNaN(userId) ? "Users" : "Payments"}>
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
        </PermissionGuard>
    );
};

export default Payments;

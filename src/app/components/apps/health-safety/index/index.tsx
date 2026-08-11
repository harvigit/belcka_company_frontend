'use client';

import React, { useState } from 'react';
import { Box, List, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { IconTool, IconAlertTriangle, IconBook } from '@tabler/icons-react';
import { useSession } from 'next-auth/react';
import { User } from 'next-auth';
import { useTranslation } from 'react-i18next';

import NearMissReporting from '../near-miss-reporting';
import ReportIncident from '../report-incident';
import InductionTraining from '../induction-training';
import BlankCard from '@/app/components/shared/BlankCard';

const menuItems = [
    { key: 'near-miss',           label: 'Near Miss Reporting', icon: <IconTool size={18} /> },
    { key: 'report-incident',     label: 'Report Incident',     icon: <IconAlertTriangle size={18} /> },
    { key: 'induction-training',  label: 'Induction & Training',icon: <IconBook size={18} /> },
];

const HealthSafety = () => {
    const { t } = useTranslation();
    const [activeKey, setActiveKey] = useState('near-miss');

    const session = useSession();
    const user = session.data?.user as User & { company_id: number };
    const companyId: number = user?.company_id;

    return (
        <Box sx={{ height: 'calc(100vh - 100px)', display: 'flex', overflow: 'hidden' }}>
            {/* ── Sidebar ── */}
            <Box sx={{ width: 220, minWidth: 220, pt: 1, overflowY: 'auto', backgroundColor: '#fff' }}>
                <List disablePadding>
                    {menuItems.map((item) => {
                        const isActive = activeKey === item.key;
                        return (
                            <ListItemButton
                                key={item.key}
                                onClick={() => setActiveKey(item.key)}
                                sx={{
                                    mx: 1, my: 0.5, borderRadius: '8px',
                                    bgcolor: isActive ? 'primary.main' : 'transparent',
                                    color: isActive ? '#fff' : 'text.primary',
                                    '&:hover': { bgcolor: isActive ? 'primary.main' : 'action.hover' },
                                    '& .MuiListItemIcon-root': { color: isActive ? '#fff' : 'text.secondary', minWidth: 32 },
                                }}
                            >
                                <ListItemIcon>{item.icon}</ListItemIcon>
                                <ListItemText
                                    primary={t(item.label)}
                                    primaryTypographyProps={{ fontSize: '0.82rem', fontWeight: isActive ? 600 : 400 }}
                                />
                            </ListItemButton>
                        );
                    })}
                </List>
            </Box>

            {/* ── Content ── */}
            <BlankCard>
                {activeKey === 'near-miss' && <NearMissReporting companyId={companyId} />}
                {activeKey === 'report-incident' && <ReportIncident companyId={companyId} />}
                {activeKey === 'induction-training' && <InductionTraining companyId={companyId} />}
            </BlankCard>
        </Box>
    );
};

export default HealthSafety;

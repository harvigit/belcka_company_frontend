'use client';

import * as React from 'react';
import PageContainer from '@/app/components/container/PageContainer';
import {Grid, Tabs, Tab, Box, Stack} from '@mui/material';
import CreateWork from '@/app/components/apps/settings/tasks/list';
import LocationList from '@/app/components/apps/settings/locations/list';
import LeaveList from '@/app/components/apps/settings/leaves/list';
import {IconBell, IconMap, IconNotebook, IconDoorExit, IconLock, IconCategory} from '@tabler/icons-react';
import BlankCard from '@/app/components/shared/BlankCard';
import NotificationSettings from '@/app/components/apps/settings/notifications';
import PermissionSettings from '@/app/components/apps/settings/permissions';
import PermissionGuard from "@/app/auth/PermissionGuard";
import CategoryList from '@/app/components/apps/settings/expense-categories/list';
import { useSession } from 'next-auth/react';
import { User } from 'next-auth';
import TradeList from '@/app/components/apps/settings/trades/list';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const {children, value, index, ...other} = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`vertical-tabpanel-${index}`}
            aria-labelledby={`vertical-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{p: 2}}>{children}</Box>}
        </div>
    );
}

function a11yProps(index: number) {
    return {
        id: `vertical-tab-${index}`,
        'aria-controls': `vertical-tabpanel-${index}`,
    };
}

const AdminSetting = () => {
    const [value, setValue] = React.useState(0);

    const handleChange = (_: React.SyntheticEvent, newValue: number) => {
        setValue(newValue);
    };
    const session = useSession();
    const user = session.data?.user as User & { company_id?: number | null } & { user_role_id: number };
    
    return (
        <PermissionGuard permission="Settings">
            <PageContainer
                title="Account Setting"
                description="This is Account Setting"
            >
                <Grid container spacing={1}>
                    <Grid
                        container
                        display={'flex'}
                        size={{
                            xs: 12,
                            lg: 12,
                        }}
                    >
                        <Grid
                            size={{
                                xs: 12,
                                lg: 2,
                            }}
                        >
                            <BlankCard className="tab-balnkcard">
                                <Stack direction="row" mt={3} ml={2} mb={3} mr={2}>
                                    <Tabs
                                        className="admin-settings-tabs"
                                        orientation="vertical"
                                        variant="scrollable"
                                        value={value}
                                        onChange={handleChange}
                                    >
                                        <Tab
                                            className="admin-settings"
                                            color="textSecondary"
                                            iconPosition="start"
                                            icon={<IconNotebook size="20"/>}
                                            label="Templates"
                                            {...a11yProps(0)}
                                        />
                                        <Tab
                                            className="admin-settings"
                                            iconPosition="start"
                                            icon={<IconMap size="20"/>}
                                            label="Locations"
                                            {...a11yProps(1)}
                                        />
                                        <Tab
                                            className="admin-settings"
                                            iconPosition="start"
                                            icon={<IconDoorExit size="20"/>}
                                            label="Leaves"
                                            {...a11yProps(2)}
                                        />
                                        <Tab
                                            className="admin-settings"
                                            iconPosition="start"
                                            icon={<IconBell size="20"/>}
                                            label="Notification Setting"
                                            {...a11yProps(3)}
                                        />
                                        <Tab
                                            className="admin-settings"
                                            iconPosition="start"
                                            icon={<IconLock size="20"/>}
                                            label="Permissions"
                                            {...a11yProps(4)}
                                        />
                                        <Tab
                                            className="admin-settings"
                                            iconPosition="start"
                                            icon={<IconCategory size="20"/>}
                                            label="Expense Category"
                                            {...a11yProps(5)}
                                        />
                                        { user.user_role_id == 1 && (
                                         <Tab
                                            className="admin-settings"
                                            iconPosition="start"
                                            icon={<IconCategory size="20"/>}
                                            label="Comapny Trades"
                                            {...a11yProps(6)}
                                        />
                                        )}
                                    </Tabs>
                                </Stack>
                            </BlankCard>
                        </Grid>
                        <Grid
                            display={'flex'}
                            size={{
                                xs: 12,
                                lg: 10,
                            }}
                        >
                            <BlankCard>
                                <TabPanel value={value} index={0}>
                                    <CreateWork/>
                                </TabPanel>
                                <TabPanel value={value} index={1}>
                                    <LocationList/>
                                </TabPanel>
                                <TabPanel value={value} index={2}>
                                    <LeaveList/>
                                </TabPanel>
                                <TabPanel value={value} index={3}>
                                    <NotificationSettings/>
                                </TabPanel>
                                <TabPanel value={value} index={4}>
                                    <PermissionSettings/>
                                </TabPanel>
                                <TabPanel value={value} index={5}>
                                    <CategoryList />
                                </TabPanel>
                                { user.user_role_id == 1 && (
                                 <TabPanel value={value} index={6}>
                                    <TradeList />
                                </TabPanel>
                                )}
                            </BlankCard>
                        </Grid>
                    </Grid>
                </Grid>
            </PageContainer>
        </PermissionGuard>
    );
};

export default AdminSetting;

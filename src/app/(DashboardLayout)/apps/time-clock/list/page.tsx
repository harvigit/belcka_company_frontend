import React from 'react';
import PageContainer from '@/app/components/container/PageContainer';
import BlankCard from '@/app/components/shared/BlankCard';
import TimeClock from '@/app/components/apps/time-clock';
import PermissionGuard from '@/app/auth/PermissionGuard';
import {Box} from '@mui/material';

const TimeClockListing = () => {
    return (
        <PageContainer title="Time Clock List" description="This is Time Clock List">
            <BlankCard>
                <PermissionGuard permission="Bookkeeper">
                    <Box p={2} pt={0}>
                        <TimeClock/>
                    </Box>
                </PermissionGuard>
            </BlankCard>
        </PageContainer>
    );
};

export default TimeClockListing;

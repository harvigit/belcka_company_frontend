import React from 'react';
import PageContainer from '@/app/components/container/PageContainer';
import BlankCard from '@/app/components/shared/BlankCard';
import TimeTrack from '@/app/components/apps/time-tracking';
import PermissionGuard from '@/app/auth/PermissionGuard';

const TimeTracking = () => {
    return (
        <PageContainer title="Time Tracking" description="This is user time-track">
            <PermissionGuard permission="Time Tracking">
                <BlankCard>
                    <TimeTrack />
                </BlankCard>
            </PermissionGuard>
        </PageContainer>
    );
};

export default TimeTracking;

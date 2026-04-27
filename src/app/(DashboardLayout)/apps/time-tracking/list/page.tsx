import React from 'react';
import PageContainer from '@/app/components/container/PageContainer';
import BlankCard from '@/app/components/shared/BlankCard';
import TimeTrack from '@/app/components/apps/time-tracking';

const TimeTracking = () => {
    return (
        <PageContainer title="Time Tracking" description="This is user time-track">
            <BlankCard>
                <TimeTrack />
            </BlankCard>
        </PageContainer>
    );
};

export default TimeTracking;

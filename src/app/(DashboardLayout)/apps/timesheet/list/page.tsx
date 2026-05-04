import React from 'react';
import PageContainer from '@/app/components/container/PageContainer';
import BlankCard from '@/app/components/shared/BlankCard';
import TimesheetList from '@/app/components/apps/timesheet';

const TimesheetListing = () => {
    return (
        <PageContainer title="Timesheet List" description="This is Timesheet List">
            <BlankCard>
                <TimesheetList />
            </BlankCard>
        </PageContainer>
    );
};

export default TimesheetListing;

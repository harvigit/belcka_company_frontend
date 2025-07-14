import React from 'react';
import Breadcrumb from '@/app/(DashboardLayout)/layout/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/app/components/container/PageContainer';
import BlankCard from '@/app/components/shared/BlankCard';
import TimesheetList from '@/app/components/apps/timesheet/list';

const BCrumb = [
    {
        to: '/',
        title: 'Home',
    },
    {
        title: 'Timesheet List',
    },
];

const TimesheetListing = () => {
    return (
        <PageContainer title="Timesheet List" description="This is Timesheet List">
            {/*<Breadcrumb title="Timesheet List" items={BCrumb} />*/}
            <BlankCard>
                <TimesheetList />
            </BlankCard>
        </PageContainer>
    );
};

export default TimesheetListing;

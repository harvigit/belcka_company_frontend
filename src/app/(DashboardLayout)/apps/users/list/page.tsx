import React from 'react';
import PageContainer from '@/app/components/container/PageContainer';
import UserList from '@/app/components/apps/users/list';
import BlankCard from '@/app/components/shared/BlankCard';
import PermissionGuard from '@/app/auth/PermissionGuard';

const UserListing = () => {
    return (
        <PageContainer title="User list" description="this is User List">
            <PermissionGuard permission="Users">
                <BlankCard>
                    <UserList/>
                </BlankCard>
            </PermissionGuard>
        </PageContainer>
    );
};
export default UserListing;

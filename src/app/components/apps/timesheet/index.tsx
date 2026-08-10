'use client';

import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import 'react-day-picker/dist/style.css';
import '@/app/global.css';

import TimeClock from '@/app/components/apps/time-clock';
import PermissionGuard from '@/app/auth/PermissionGuard';
import { useSearchParams, useRouter } from 'next/navigation';

type QueryParams = {
    user_id: string | null;
    is_removed_user: boolean;
    is_archived_user: boolean;
    start_date: string | null;
    end_date: string | null;
    open: string | null;
    type: string | null;
    recordId: string | null;
};

const TimesheetPage = () => {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [isInitialized, setIsInitialized] = useState(false);

    const [queryParams, setQueryParams] = useState<QueryParams>({
        user_id: null,
        is_removed_user: false,
        is_archived_user: false,
        start_date: null,
        end_date: null,
        open: null,
        type: null,
        recordId: null,
    });

    useEffect(() => {
        if (!searchParams) return;

        const urlUserId = searchParams.get('user_id');
        const isRemovedUserParam = searchParams.get('is_removed_user');
        const isArchivedUserParam = searchParams.get('is_archived_user');

        let userId: string | null = null;
        let isRemoved = false;
        let isArchived = false;

        if (urlUserId || isRemovedUserParam || isArchivedUserParam) {
            isRemoved = isRemovedUserParam === 'true' || isRemovedUserParam === '1';
            isArchived = isArchivedUserParam === 'true' || isArchivedUserParam === '1';
            userId = urlUserId;

            sessionStorage.setItem(
                'timesheet_sensitive_params',
                JSON.stringify({
                    user_id: userId,
                    is_removed_user: isRemoved,
                    is_archived_user: isArchived,
                })
            );

            const newSearchParams = new URLSearchParams(searchParams);
            newSearchParams.delete('user_id');
            newSearchParams.delete('is_removed_user');
            newSearchParams.delete('is_archived_user');

            const newUrl = newSearchParams.toString()
                ? `/apps/timesheet/list?${newSearchParams.toString()}`
                : '/apps/timesheet/list';

            router.replace(newUrl);
        } else {
            const stored = sessionStorage.getItem('timesheet_sensitive_params');
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    userId = parsed.user_id || null;
                    isRemoved = parsed.is_removed_user || false;
                    isArchived = parsed.is_archived_user || false;
                } catch {
                    sessionStorage.removeItem('timesheet_sensitive_params');
                }
            }
        }

        setQueryParams({
            user_id: userId,
            is_removed_user: isRemoved,
            is_archived_user: isArchived,
            start_date: searchParams.get('start_date'),
            end_date: searchParams.get('end_date'),
            open: searchParams.get('open'),
            type: searchParams.get('type'),
            recordId: searchParams.get('id'),
        });

        setIsInitialized(true);
    }, [searchParams, router]);
    
    return (
        <PermissionGuard permission="Bookkeeper">
            <Box p={2} pt={0}>
                {isInitialized && (
                    <TimeClock
                        queryParams={queryParams}
                    />
                )}
            </Box>
        </PermissionGuard>
    );
};

export default TimesheetPage;

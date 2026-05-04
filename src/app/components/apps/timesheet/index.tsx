'use client';

import React, {useEffect, useState} from 'react';
import {Box} from '@mui/material';
import 'react-day-picker/dist/style.css';
import '@/app/global.css';

import TimeClock from '@/app/components/apps/time-clock/time-clock';
import PermissionGuard from '@/app/auth/PermissionGuard';
import {useSearchParams} from 'next/navigation';

type QueryParams = {
    user_id: string | null;
    start_date: string | null;
    end_date: string | null;
    open: string | null;
    type: string | null;
    recordId: string | null;
};

const TimesheetPage = () => {
    const [value, setValue] = useState(0);
    const searchParams = useSearchParams();

    const [queryParams, setQueryParams] = useState<QueryParams>({
        user_id: null,
        start_date: null,
        end_date: null,
        open: null,
        type: null,
        recordId: null,
    });

    useEffect(() => {
        if (!searchParams) return;

        setQueryParams({
            user_id: searchParams.get('user_id'),
            start_date: searchParams.get('start_date'),
            end_date: searchParams.get('end_date'),
            open: searchParams.get('open'),
            type: searchParams.get('type'),
            recordId: searchParams.get('id'),
        });
    }, [searchParams]);
    
    return (
        <PermissionGuard permission="Bookkeeper">
            <Box p={2} pt={0}>
                {value === 0 && <TimeClock queryParams={queryParams}/>}
            </Box>
        </PermissionGuard>
    );
};

export default TimesheetPage;

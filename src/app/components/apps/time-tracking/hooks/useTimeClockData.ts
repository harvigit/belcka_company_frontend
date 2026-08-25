import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import api from '@/utils/axios';
import {TimeClockDetailResponse, TimeClock} from '../types/timeClock';

export const useTimeClockData = (user_id: any) => {
    const [data, setData] = useState<TimeClock[]>([]);
    const [headerDetail, setHeaderDetail] = useState<TimeClockDetailResponse | null>(null);
    
    // Pay Rate Permission
    const [userHasRatePermission, setUserHasRatePermission] = useState<boolean>(false);

    // Payroll cycle
    const [payrollCycle, setPayrollCycle] = useState<string>('');

    const fetchPayrollCycle = useCallback(async (): Promise<void> => {
        try {
            const response = await api.get('/setting/get-payroll-settings');
            if (response.data?.IsSuccess) {
                setPayrollCycle(response.data.data?.payroll_cycle || '');
            }
        } catch (error) {
            console.error('Error fetching payroll cycle:', error);
        }
    }, []);

    const fetchTimeClockData = useCallback(async (start: Date | null, end: Date | null): Promise<void> => {
        try {
            if (!start || !end) return;

            const params: Record<string, string> = {
                user_id: user_id || '',
                start_date: format(start, 'dd/MM/yyyy'),
                end_date: format(end, 'dd/MM/yyyy'),
            };
            const response = await api.get('/time-clock/table-data', {params});

            if (response.data.IsSuccess) {
                setData(response.data.info || []);
                setHeaderDetail(response.data);
            
                setUserHasRatePermission(response.data.user_rate_permission);
            }
        } catch (error) {
            console.error('Error fetching timeClock data:', error);
        }
    }, [user_id]);
    
    return {
        data,
        setData,
        headerDetail,
        userHasRatePermission,
        fetchTimeClockData,
        payrollCycle,
        setPayrollCycle,
        fetchPayrollCycle,
    };
};

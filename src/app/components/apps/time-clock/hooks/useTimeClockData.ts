import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import api from '@/utils/axios';
import {ConflictDetail, Shift, Project, TimeClockDetailResponse} from '@/app/components/apps/time-clock/types/timeClock';
import { TimeClock } from '@/app/components/apps/time-clock/time-clock';

export const useTimeClockData = (user_id: any, currency: string, isRemovedUser?: boolean) => {
    const [data, setData] = useState<TimeClock[]>([]);
    const [headerDetail, setHeaderDetail] = useState<TimeClockDetailResponse | null>(null);
    const [pendingRequestCount, setPendingRequestCount] = useState<number>(0);
    const [totalConflicts, setTotalConflicts] = useState<number>(0);
    const [conflictDetails, setConflictDetails] = useState<ConflictDetail[]>([]);
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [leaveRequestCount, setLeaveRequestCount] = useState<number>(0);
    const [penaltyAppealCount, setPenaltyAppealCount] = useState<number>(0);

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

    const fetchTimeClockData = useCallback(async (start: Date, end: Date): Promise<void> => {
        try {
            const params: Record<string, string> = {
                user_id: user_id || '',
                start_date: format(start, 'dd/MM/yyyy'),
                end_date: format(end, 'dd/MM/yyyy'),
            };

            if (isRemovedUser) {
                params.is_removed_user = '1';
            }

            
            const response = await api.get('/time-clock/details', {params});

            if (response.data.IsSuccess) {
                setData(response.data.info || []);
                setHeaderDetail(response.data);
                setPendingRequestCount(response.data.pending_request_count || 0);
                setLeaveRequestCount(response.data.total_leave_requests || 0);
                setPenaltyAppealCount(response.data.pending_penalty_appeal_count || 0);
                setUserHasRatePermission(response.data.user_rate_permission);

                await fetchConflicts(start, end, user_id);

                fetchTimeClockResources(response.data.company_id);
            }
        } catch (error) {
            console.error('Error fetching timeClock data:', error);
        }
    }, [user_id]);

    const fetchConflicts = useCallback(async (start: Date, end: Date, userId?: any): Promise<void> => {
        try {
            const params: Record<string, string> = {
                start_date: format(start, 'dd/MM/yyyy'),
                end_date: format(end, 'dd/MM/yyyy'),
            };
            if (userId) {
                params.user_id = userId;
            }

            const response = await api.get('/time-clock/conflicts', {params});

            if (response.data.IsSuccess) {
                setConflictDetails(response.data.conflicts || []);
                setTotalConflicts(response.data.total_conflicts || 0);
            }
        } catch (error) {
            console.error('Error fetching conflicts:', error);
            setConflictDetails([]);
            setTotalConflicts(0);
        }
    }, []);

    const fetchTimeClockResources = async (companyId: number): Promise<void> => {
        try {
            const response = await api.get('/time-clock/resources', {params: {companyId}});
            if (response.data.IsSuccess) {
                setShifts(response.data.shifts || []);
                setProjects(response.data.projects || []);
            }
        } catch (error) {
            console.error('Error fetching timeClock resources:', error);
        }
    };

    return {
        data,
        setData,
        headerDetail,
        pendingRequestCount,
        setPendingRequestCount,
        totalConflicts,
        setTotalConflicts,
        conflictDetails,
        leaveRequestCount,
        setLeaveRequestCount,
        penaltyAppealCount,
        setPenaltyAppealCount,
        userHasRatePermission,
        setUserHasRatePermission,
        shifts,
        projects,
        fetchTimeClockData,
        fetchConflicts,
        payrollCycle,
        setPayrollCycle,
        fetchPayrollCycle,
    };
};

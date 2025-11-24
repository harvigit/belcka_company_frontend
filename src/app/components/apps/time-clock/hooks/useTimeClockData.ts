import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import api from '@/utils/axios';
import {ConflictDetail, Shift, Project, TimeClockDetailResponse, LeaveRequestDetail} from '@/app/components/apps/time-clock/types/timeClock';
import { TimeClock } from '@/app/components/apps/time-clock/time-clock';

export const useTimeClockData = (user_id: any, currency: string) => {
    const [data, setData] = useState<TimeClock[]>([]);
    const [headerDetail, setHeaderDetail] = useState<TimeClockDetailResponse | null>(null);
    const [pendingRequestCount, setPendingRequestCount] = useState<number>(0);
    const [totalConflicts, setTotalConflicts] = useState<number>(0);
    const [conflictDetails, setConflictDetails] = useState<ConflictDetail[]>([]);
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [leaveRequestCount, setLeaveRequestCount] = useState<number>(0);
    const [leaveRequestDetails, setLeaveRequestDetails] = useState<LeaveRequestDetail[]>([]);

    const fetchTimeClockData = useCallback(async (start: Date, end: Date): Promise<void> => {
        try {
            const params: Record<string, string> = {
                user_id: user_id || '',
                start_date: format(start, 'dd/MM/yyyy'),
                end_date: format(end, 'dd/MM/yyyy'),
            };
            const response = await api.get('/time-clock/details', {params});

            if (response.data.IsSuccess) {
                setData(response.data.info || []);
                setHeaderDetail(response.data);
                setPendingRequestCount(response.data.pending_request_count || 0);
                setTotalConflicts(response.data.total_conflicts || 0);
                setConflictDetails(response.data.conflicts || []);
                fetchTimeClockResources(response.data.company_id);
                setLeaveRequestCount(response.data.total_leave_requests || 0);
                setLeaveRequestDetails(response.data.pending_leave_requests || []);
            }
        } catch (error) {
            console.error('Error fetching timeClock data:', error);
        }
    }, [user_id]);

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
        leaveRequestDetails,
        shifts,
        projects,
        fetchTimeClockData,
    };
};

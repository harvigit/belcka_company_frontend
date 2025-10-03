import {TimeClock} from '../time-clock';

export type DailyBreakdown = {
    isMoreThanWork: boolean;
    isLessThanWork: boolean;
    is_requested: boolean;
    is_edited: boolean;
    timesheet_light_id: number;
    rowsData?: any[];
    checkin_time: any;
    checkout_time: any;
    total_hours: any;
    rowType: 'week' | 'day';
    weeklyTotalHours?: string;
    weeklyPayableAmount?: string;
    weekLabel?: string;
    date?: string;
    shift?: string;
    shift_id?: number | string;
    project?: string;
    typeOfWork?: string;
    start?: string;
    end?: string;
    totalHours?: string;
    priceWorkAmount?: string;
    dailyTotal?: string;
    payableAmount?: string;
    regular?: string;
    employeeNotes?: string;
    managerNotes?: string;
    parsedDate?: Date | null | string;
    address?: string;
    check_in?: string;
    check_out?: string;
    isFirst?: boolean;
    rowSpan?: number;
    date_added?: string;
    worklog_id?: string;
    status?: number;
    userChecklogs?: CheckLog[];
    allUserChecklogs?: CheckLog[];
};

export interface TimeClockDetailsProps {
    open: boolean;
    timeClock: TimeClock | null;
    user_id: any;
    currency: string;
    allUsers: TimeClock[];
    onClose: () => void;
    onUserChange?: (user: TimeClock) => void;
}

export type TimeClockDetailResponse = {
    conflicts: any[];
    company_id: number;
    IsSuccess: boolean;
    info: TimeClock[];
    type_of_works: any[];
    shifts: any[];
    projects: any[];
    total_hours?: number;
    total_break_hours?: number;
    payable_hours?: number;
    total_payable_amount?: number;
    worked_days?: number;
    pending_request_count?: number;
    total_conflicts?: number;
};

export type TimeClockResourcesResponse = {
    IsSuccess: boolean;
    shifts: Shift[];
};

export interface Shift {
    id: number;
    name: string;
}

export interface Project {
    id: number;
    name: string;
}

export interface ConflictItem {
    user_id: number;
    date: string;
    start: string;
    end: string;
    shift_name: string;
    shift_id: string;
    color?: string;
    worklog_id?: number;
    project?: string;
}

export interface ConflictDetail {
    formatted_date: string;
    date: string;
    items: ConflictItem[];
}

export type CheckLog = {
    pricework_amount: React.ReactNode;
    task_name: string;
    checklog_id: number;
    date_added: string;
    address_id: number;
    address_name: string;
    checkin_time: string;
    checkout_time: string;
    total_hours: number;
};

export type EditingWorklog = {
    worklogId: string;
    start: string;
    end: string;
    shift_id: number | string;
    editingField?: 'start' | 'end' | 'shift';
};

export type NewRecord = {
    date: string;
    shift_id: number | string;
    project_id: number | string;
    start: string;
    end: string;
};

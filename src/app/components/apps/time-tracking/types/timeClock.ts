export type TimeClock = {
    company_id: string;
    week_range: any;
    user_id: any;
    conflicts: string;
    user_name: string;
    user_code: string;
    name_on_account: string;
    sort_code: string;
    account_number: string;
    utr_name: string;
    utr_number: string;
    nin_number: string;
    trade_name: string;
    type: string;
    user_thumb_image: string;
    start_date: string;
    end_date: string;
    days: Record<string, any>;
    payable_total_hours: string;
    total_hours?: string | number;
    total_break_hours?: string | number;
    weekly_total_hours: string | number;
    daylog_payable_amount: number;
    pricework_total_amount: number;
    total_expense_amount: number;
    cis_amount: number;
    gross_amount: number;
    net_payable_amount: number;
    total_adjustment_amount: number;
    total_payable_amount: number;
    status_text: string;
    status_color?: string;
    user_status_color: string;

    timesheet_light_ids: string;
    weekly_payable_amount: number;

    has_leave_request?: boolean;
    has_expense_request?: boolean;
    has_worklog_request?: boolean;
};

export type DailyBreakdown = {
    total_break_hours?: null | string;
    adjustment_id?: number;
    adjustment: string;
    cis_amount: number;
    gross_amount: number;
    timesheet_ids: string;
    isMoreThanWork: boolean;
    isLessThanWork: boolean;
    is_requested: boolean;
    is_penalty_appealed: boolean;
    is_penalty_edited: boolean;
    is_edited: boolean;
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
    penaltyHours?: string;
    priceWork?: string;
    expense?: string;
    checkIns?: string;
    dailyTotal?: string;
    // expenseAmount?: string;
    netPayableAmount?: string;
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
    status_text?: string;
    status_color?: string;
    userChecklogs?: CheckLog[];
    allUserChecklogs?: CheckLog[];
    has_pending_worklog_request?: boolean;
    has_pending_leave_request?: boolean;
    is_timesheet_locked?: boolean;
    timesheet_status?: string;
};

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
    total_leave_requests?: number;
    pending_leave_requests?: LeaveRequestDetail[];
};

export interface Shift {
    id: number;
    name: string;
}

export interface Project {
    id: number;
    name: string;
}

export interface LeaveRequestDetail {
    is_delete_request: any;
    note: any;
    user_leave_id: number;
    leave_id: number;
    user_id: number;
    first_name: string;
    last_name: string;
    user_thumb_image: string;
    leave_type: string;
    leave_type_id: number;
    is_allday_leave: boolean;
    start_date: string;
    end_date: string;
    display_date: string;
    start_time: string | null;
    end_time: string | null;
    request_status: string;
    manager_note: string;
    total_time_of_days: string;
    work_hours: number;
    created_at: string;
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

export type RecordType = 'worklog' | 'expense' | 'leave' | 'adjustment';

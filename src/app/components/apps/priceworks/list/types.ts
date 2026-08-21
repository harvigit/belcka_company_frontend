export type PriceworkStatus = 'pending' | 'approved' | 'sent' | 'rejected';

export type PriceworkTabKey = 'all' | PriceworkStatus;

export type PriceworkTabItem = {
    key: PriceworkTabKey;
    label: string;
    count: number;
};

export type PriceworkAttachment = {
    id: number;
    pricework_id?: number;
    image_url?: string | null;
    thumb_url?: string | null;
};

export type PriceworkActivityLog = {
    id: number;
    title?: string | null;
    action?: string | null;
    date_time?: string | null;
    pricework_user_id?: number | null;
    pricework_user_name?: string | null;
    pricework_user_image?: string | null;
    pricework_user_thumb_image?: string | null;
    action_user_id?: number | null;
    action_user_name?: string | null;
    action_user_image?: string | null;
    action_user_thumb_image?: string | null;
    old_data?: Record<string, any> | null;
    new_data?: Record<string, any> | null;
};

export type PriceworkApiRow = {
    id: number;
    pricework_id?: number | null;
    record_type?: 'pricework' | 'timesheet_light' | string | null;
    timesheet_light_id?: number | null;
    user_worklog_id?: number | null;
    user_checklog_id?: number | null;
    user_id?: number | null;
    user_name?: string | null;
    user_image?: string | null;
    user_thumb_image?: string | null;
    trade_id?: number | null;
    trade_name?: string | null;
    project_id?: number | null;
    project_name?: string | null;
    address_id?: number | null;
    address_name?: string | null;
    team_id?: number | null;
    team_name?: string | null;
    task_id?: number | null;
    category_id?: number | null;
    category_name?: string | null;
    sub_category_id?: number | null;
    sub_category_name?: string | null;
    unit_id?: number | null;
    unit_name?: string | null;
    work_type?: string | null;
    amount_per_unit?: number | string | null;
    work_complete?: number | string | null;
    pricework_amount?: number | string | null;
    pricework_date?: string | null;
    note?: string | null;
    attachment_count?: number | null;
    attachments?: PriceworkAttachment[];
    before_attachments?: PriceworkAttachment[];
    after_attachments?: PriceworkAttachment[];
    currency?: string | null;
    timesheet_id?: number | null;
    status?: PriceworkStatus | string | number | null;
    status_value?: string | number | null;
    created_at?: string | null;
};

export type PriceworkDetail = PriceworkApiRow & {
    company_id?: number;
    status_text?: PriceworkStatus | string | null;
    timesheet_status?: string | null;
    status_updated_by?: number | null;
    status_updated_by_name?: string | null;
    status_updated_at?: string | null;
    attachments?: PriceworkAttachment[];
    activity_logs?: PriceworkActivityLog[];
};

export const getInitials = (name?: string | null) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
};

export const normalizePriceworkStatus = (
    value: PriceworkApiRow['status'],
): PriceworkStatus => {
    if (value === null || value === undefined || value === '') return 'pending';
    if (typeof value === 'number') {
        if (value === 2) return 'approved';
        if (value === 3) return 'rejected';
        if (value === 4) return 'sent';
        return 'pending';
    }
    const key = String(value).toLowerCase();
    if (key === 'approved' || key === '2') return 'approved';
    if (key === 'rejected' || key === '3') return 'rejected';
    if (key === 'sent' || key === '4') return 'sent';
    return 'pending';
};

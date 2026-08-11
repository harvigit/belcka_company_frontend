export type ExpenseStatus = 'pending' | 'approved' | 'sent' | 'rejected';

export type ExpenseTabKey = 'all' | ExpenseStatus;

export type ExpenseTabItem = {
    key: ExpenseTabKey;
    label: string;
    count: number;
};

/** Raw row shape from `expense/list-web` */
export type ExpenseApiRow = {
    id: number;
    total_amount: number;
    currency?: string;
    receipt_date?: string | null;
    date_added?: string | null;
    timesheet_date?: string | null;
    user_id?: number;
    user_name?: string | null;
    user_image?: string | null;
    user_thumb_image?: string | null;
    project_id?: number;
    project_name?: string | null;
    category_id?: number;
    category_name?: string | null;
    trade_id?: number | null;
    trade_name?: string | null;
    team_id?: number | null;
    team_name?: string | null;
    address_id?: number;
    address_name?: string | null;
    is_transport_category?: boolean | null;
    car_register_number?: string | null;
    note?: string | null;
    attachment_count?: number;
    status?: ExpenseStatus | string | number | null;
    status_value?: string | number | null;
    can_edit?: boolean | null;
    can_reject?: boolean | null;
    status_updated_by?: number | null;
    status_updated_by_name?: string | null;
    status_updated_at?: string | null;
    sent_by?: number | null;
    sent_by_name?: string | null;
    sent_at?: string | null;
};

export type ExpenseListItem = {
    id: number;
    date: string;
    submittedBy: {
        name: string;
        role: string;
        initials: string;
        avatarColor?: string;
        avatarUrl?: string | null;
    };
    project: string;
    address: string;
    category: string;
    receiptDate: string;
    carRegisterNumber?: string | null;
    description: string;
    amount: number;
    currency: string;
    status: ExpenseStatus;
    canEdit?: boolean;
    canReject?: boolean;
    attachmentCount: number;
    statusUpdatedBy?: number | null;
    statusUpdatedByName?: string | null;
    statusUpdatedAt?: string | null;
    sentBy?: number | null;
    sentByName?: string | null;
    sentAt?: string | null;
};

export type ExpenseActivityLog = {
    id: number;
    title?: string | null;
    action?: string | null;
    date_time?: string | null;
    expense_user_id?: number | null;
    expense_user_name?: string | null;
    expense_user_image?: string | null;
    expense_user_thumb_image?: string | null;
    action_user_id?: number | null;
    action_user_name?: string | null;
    action_user_image?: string | null;
    action_user_thumb_image?: string | null;
};

export type ExpenseDetail = ExpenseApiRow & {
    company_id?: number;
    added_by?: number;
    added_by_user_name?: string | null;
    added_by_user_image?: string | null;
    added_by_user_thumb_image?: string | null;
    status_text?: ExpenseStatus;
    attachments?: Array<{
        id: number;
        expense_id: number;
        image_url?: string | null;
        thumb_url?: string | null;
        type?: string | null;
    }>;
    activity_logs?: ExpenseActivityLog[];
};

export const getInitials = (name?: string | null): string => {
    if (!name?.trim()) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
};

export const capitalizeExpenseValue = (value?: string | null): string => {
    const text = value?.trim();
    if (!text) return '-';

    return text.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
};

export const normalizeExpenseStatus = (
    value: ExpenseApiRow['status'],
): ExpenseStatus | null => {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') {
        // Common numeric codes used elsewhere in the app — adjust when API is wired
        if (value === 1) return 'pending';
        if (value === 2) return 'approved';
        if (value === 3) return 'rejected';
        if (value === 4) return 'sent';
        return null;
    }
    const key = String(value).toLowerCase();
    if (key === 'pending' || key === 'approved' || key === 'rejected' || key === 'sent') {
        return key;
    }
    return null;
};

import { FormRecord, PublishTeamsOption, PublishUsersOption } from '../types';

export type FormEntry = {
    id: number;
    submitted_by_id: number;
    data?: Record<string, any>;
    created_at: string;
    submittedBy?: {
        id: number;
        first_name?: string;
        last_name?: string;
        name?: string;
        email?: string;
        user_image?: string | null;
        user_thumb_image?: string | null;
        image?: string | null;
        trade_name?: string | null;
        status_color?: string | null;
    };
};

export type FormPublishTarget = {
    selected_teams?: PublishTeamsOption[] | string | string[];
    selected_users?: PublishUsersOption[] | string | string[];
    group_assignment_mode?: string;
};

export type DetailsForm = FormRecord & {
    created_at?: string;
    updated_at?: string;
    formEntry?: FormEntry[];
    publishTarget?: FormPublishTarget | null;
    publish_target?: FormPublishTarget | null;
};

export type UserRow = {
    id: number;
    first_name: string;
    last_name: string;
    email?: string;
    user_thumb_image?: string | null;
    user_image?: string | null;
    trade_name?: string | null;
    status_color?: string | null;
    assigned_teams: string[];
    submitted: boolean;
    submissions: number;
    last_submitted?: string | null;
    source: 'assigned' | 'submitted';
};

export type SubmissionListItem = {
    entry: FormEntry;
    user_id: number;
    name: string;
    email?: string;
    avatar?: string | null;
    trade_name?: string | null;
    status_color?: string | null;
    initials: string;
    submitted_at?: string;
};

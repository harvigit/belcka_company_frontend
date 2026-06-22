export type FormConditionOperator = 'empty' | 'not_empty';
export type FormConditionJoin = 'if' | 'and' | 'or';
export type LegacyConditionOperator = 'equals' | 'not_equals' | 'contains' | FormConditionOperator;

export type FormFieldCondition = {
    fieldId: string;
    operator: FormConditionOperator;
    joinWith?: FormConditionJoin;
};

export type FormField = {
    id: string;
    label: string;
    type: string;
    description?: string;
    required?: boolean;
    options?: string[];
    optionImages?: string[];
    optionSortMode?: 'custom' | 'az';
    minValue?: number;
    maxValue?: number;
    ratingStarCount?: number;
    ratingMinLabel?: string;
    ratingMaxLabel?: string;
    locationStampCapture?: boolean;
    multipleSelection?: boolean;
    imageSource?: 'camera' | 'gallery' | 'both';
    videoSource?: 'camera' | 'gallery' | 'both';
    scannerSource?: 'camera' | 'gallery' | 'both';
    locationSelectBy?: 'current' | 'manual';
    allowMultipleUploads?: boolean;
    dateIncludeDate?: boolean;
    dateIncludeTime?: boolean;
    formulaExpression?: string;
    showOnlyIf?: boolean;
    conditionFieldId?: string;
    conditionOperator?: LegacyConditionOperator;
    conditionValue?: string;
    conditions?: FormFieldCondition[];
    fields?: FormField[];
};

export type FormStatus = 'DRAFT' | 'PUBLISHED' | 'SCHEDULED' | 'ARCHIVED';

export type FormRecord = {
    id: number;
    name: string;
    status: FormStatus;
    status_text?: string;
    fields: FormField[];
    assigned_to?: string | null;
    assignedTo?: string | null;
    entries: number;
    views: number;
    createdAt: string;
    created_at?: string;
    created_by?: {
        id: number;
        first_name: string;
        last_name: string;
        name?: string;
        trade_name?: string;
        image?: string | null;
        createdBy_image?: string | null;
        user_image?: string | null;
        createdBy_thumb_image?: string | null;
        status_color?: string | null;
    };
    administrators?: {
        admin_thumb_image?: string | null;
        user_image?: string | null;
        id: number;
        first_name: string;
        last_name: string;
        email?: string;
        name?: string;
        image?: string | null;
        admin_image?: string | null;
        trade_name?: string | null;
        status_color?: string | null;
    }[];
    publishTarget?: unknown;
    publish_target?: unknown;
};

export type FormTemplate = {
    id: number;
    name: string;
    description?: string;
    category: string;
    fields: FormField[];
};

export type FieldDraft = {
    label: string;
    description: string;
    required: boolean;
    options: string[];
    optionImages: string[];
    optionSortMode: 'custom' | 'az';
    minValue: number;
    maxValue: number;
    ratingStarCount: number;
    ratingMinLabel: string;
    ratingMaxLabel: string;
    locationStampCapture: boolean;
    multipleSelection: boolean;
    imageSource: 'camera' | 'gallery' | 'both';
    videoSource: 'camera' | 'gallery' | 'both';
    scannerSource: 'camera' | 'gallery' | 'both';
    locationSelectBy: 'current' | 'manual';
    allowMultipleUploads: boolean;
    dateIncludeDate: boolean;
    dateIncludeTime: boolean;
    formulaExpression: string;
    showOnlyIf: boolean;
    conditionFieldId: string;
    conditionOperator: LegacyConditionOperator;
    conditionValue: string;
    conditions: FormFieldCondition[];
};

export type PublishUsersOption = {
    id: string;
    name: string;
    user_image?: string | null;
    user_thumb_image?: string | null;
    trade_name?: string | null;
    status_color?: string | null;
    memberCount?: number;
};

export type PublishTeamsOption = {
    memberCount?: number;
    id: string;
    name: string;
    userIds?: string[];
};

export type PublishOption = PublishUsersOption | PublishTeamsOption;

export type PublishSettings = {
    publishMode: 'now' | 'schedule';
    publishDate: string;
    publishTime: string;
    notifyUsers: boolean;
    notificationMessage: string;
    showOnFeed: boolean;
    feedBy: string;
    sendReminder: boolean;
    reminderDate: string;
    reminderTime: string;
    scheduleRemoval: boolean;
    removalDate: string;
    removalTime: string;
};

export type PublishWizardState = {
    selectedTeams: PublishTeamsOption[];
    selectedUsers: PublishUsersOption[];
    groupAssignmentMode: 'dynamic' | 'fixed';
    settings: PublishSettings;
};

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

export type FormRecord = {
    id: number;
    name: string;
    status: 'DRAFT' | 'PUBLISHED' | 'SCHEDULED' | 'ARCHIVED';
    fields: FormField[];
    assigned_to?: string | null;
    assignedTo?: string | null;
    entries: number;
    views: number;
    createdAt: string;
    createdBy?: {
        id: number;
        first_name: string;
        last_name: string;
        email?: string;
        image?: string | null;
    };
    administrators?: {
        id: number;
        first_name: string;
        last_name: string;
        email?: string;
        image?: string | null;
    }[];
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

export type PublishOption = {
    id: string;
    name: string;
    image?: string | null;
    memberCount?: number;
};

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
    selectedGroups: PublishOption[];
    selectedUsers: PublishOption[];
    groupAssignmentMode: 'dynamic' | 'fixed';
    settings: PublishSettings;
};

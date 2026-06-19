import {defaultLabelForType, emptyDraftForType} from './formBuilderConstants';
import {FieldDraft, FormField, PublishOption, PublishTeamsOption, PublishUsersOption, PublishWizardState} from '../types';
import {timeInputValue, todayInputValue} from '../list/formUtils';

const fieldToDraft = (field: FormField): FieldDraft => ({
    label: field.label || defaultLabelForType(field.type),
    description: field.description || '',
    required: Boolean(field.required),
    options: field.options?.length ? field.options : emptyDraftForType(field.type).options,
    optionImages: field.optionImages?.length ? field.optionImages : emptyDraftForType(field.type).optionImages,
    optionSortMode: field.optionSortMode === 'az' ? 'az' : 'custom',
    minValue: typeof field.minValue === 'number' ? field.minValue : emptyDraftForType(field.type).minValue,
    maxValue: typeof field.maxValue === 'number' ? field.maxValue : emptyDraftForType(field.type).maxValue,
    ratingStarCount: Math.min(5, Math.max(3, typeof field.ratingStarCount === 'number' ? field.ratingStarCount : emptyDraftForType(field.type).ratingStarCount)),
    ratingMinLabel: field.ratingMinLabel || emptyDraftForType(field.type).ratingMinLabel,
    ratingMaxLabel: field.ratingMaxLabel || emptyDraftForType(field.type).ratingMaxLabel,
    locationStampCapture: Boolean(field.locationStampCapture),
    multipleSelection: Boolean(field.multipleSelection),
    imageSource: field.imageSource || 'both',
    videoSource: field.videoSource || 'both',
    scannerSource: field.scannerSource || 'both',
    locationSelectBy: field.locationSelectBy || 'current',
    allowMultipleUploads: Boolean(field.allowMultipleUploads),
    dateIncludeDate: field.dateIncludeDate !== false,
    dateIncludeTime: Boolean(field.dateIncludeTime),
    formulaExpression: field.formulaExpression || '',
    showOnlyIf: Boolean(field.showOnlyIf),
    conditionFieldId: field.conditionFieldId || '',
    conditionOperator: field.conditionOperator === 'not_empty' ? 'not_empty' : 'empty',
    conditionValue: field.conditionValue || '',
    conditions: Array.isArray(field.conditions)
        ? field.conditions.map((condition, index) => ({
            ...condition,
            joinWith: index === 0 ? 'if' : condition.joinWith === 'or' ? 'or' : 'and',
        }))
        : field.conditionFieldId
            ? [{
                fieldId: field.conditionFieldId,
                operator: field.conditionOperator === 'not_empty' ? 'not_empty' : 'empty',
                joinWith: 'if'
            }]
            : [],
});

const createDefaultPublishWizardState = (): PublishWizardState => ({
    selectedTeams: [],
    selectedUsers: [],
    groupAssignmentMode: 'dynamic',
    settings: {
        publishMode: 'now',
        publishDate: todayInputValue(),
        publishTime: timeInputValue(),
        notifyUsers: true,
        notificationMessage: 'Form has been assigned to you. Please complete it before work starts.',
        showOnFeed: true,
        feedBy: 'app',
        sendReminder: true,
        reminderDate: todayInputValue(),
        reminderTime: timeInputValue(),
        scheduleRemoval: false,
        removalDate: todayInputValue(),
        removalTime: timeInputValue(),
    },
});

const normalizePublishSettings = (settings: Record<string, any> | null | undefined, defaults: PublishWizardState['settings']) => ({
    ...defaults,
    publishMode: ((settings?.publish_mode ?? settings?.publishMode) === 'schedule' ? 'schedule' : 'now') as 'now' | 'schedule',
    publishDate: settings?.publish_date ?? settings?.publishDate ?? defaults.publishDate,
    publishTime: settings?.publish_time ?? settings?.publishTime ?? defaults.publishTime,
    notifyUsers: Boolean(settings?.notify_users ?? settings?.notifyUsers ?? defaults.notifyUsers),
    notificationMessage: settings?.notification_message ?? settings?.notificationMessage ?? defaults.notificationMessage,
    showOnFeed: Boolean(settings?.show_on_feed ?? settings?.showOnFeed ?? defaults.showOnFeed),
    feedBy: settings?.feed_by ?? settings?.feedBy ?? defaults.feedBy,
    sendReminder: Boolean(settings?.send_reminder ?? settings?.sendReminder ?? defaults.sendReminder),
    reminderDate: settings?.reminder_date ?? settings?.reminderDate ?? defaults.reminderDate,
    reminderTime: settings?.reminder_time ?? settings?.reminderTime ?? defaults.reminderTime,
    scheduleRemoval: Boolean(settings?.schedule_removal ?? settings?.scheduleRemoval ?? defaults.scheduleRemoval),
    removalDate: settings?.removal_date ?? settings?.removalDate ?? defaults.removalDate,
    removalTime: settings?.removal_time ?? settings?.removalTime ?? defaults.removalTime,
});

const splitCommaIds = (value: unknown) => typeof value === 'string'
    ? value.split(',').map((id) => id.trim()).filter(Boolean)
    : [];

const getPublishOptionId = (item: unknown) => {
    if (item === null || item === undefined) return '';
    if (typeof item === 'string' || typeof item === 'number') return String(item);
    if (typeof item !== 'object') return '';

    const record = item as Record<string, any>;
    return String(record.id ?? record.user_id ?? record.team_id ?? '').trim();
};

const selectedIdsToString = (items: unknown) => {
    const ids = Array.isArray(items)
        ? items.map(getPublishOptionId)
        : splitCommaIds(items);

    return ids.filter(Boolean).join(',');
};

const normalizeStoredTeams = (value: unknown, fallback: PublishTeamsOption[]): PublishTeamsOption[] => {
    const items = Array.isArray(value) ? value : splitCommaIds(value);
    if (!items.length) return fallback;

    return items
        .map((item: any) => {
            const id = getPublishOptionId(item);
            if (!id) return null;

            if (item && typeof item === 'object') {
                const name = item.name || item.title || item.team_name || `Team ${id}`;
                return {
                    ...item,
                    id,
                    name,
                    userIds: Array.isArray(item.userIds) ? item.userIds.map(String) : [],
                };
            }

            return {id, name: `Team ${id}`, userIds: []};
        })
        .filter(Boolean) as PublishTeamsOption[];
};

const normalizeStoredUsers = (value: unknown, fallback: PublishUsersOption[]): PublishUsersOption[] => {
    const items = Array.isArray(value) ? value : splitCommaIds(value);
    if (!items.length) return fallback;

    return items
        .map((item: any) => {
            const id = getPublishOptionId(item);
            if (!id) return null;

            if (item && typeof item === 'object') {
                const name = item.name || item.user_name || `${item.first_name || ''} ${item.last_name || ''}`.trim() || `User ${id}`;
                return {...item, id, name};
            }

            return {id, name: `User ${id}`};
        })
        .filter(Boolean) as PublishUsersOption[];
};

const normalizePublishTargetState = (parsed: Record<string, any>, defaults: PublishWizardState): PublishWizardState => ({
    selectedTeams: normalizeStoredTeams(
        parsed.selected_teams ?? parsed.selectedTeams ?? parsed.selected_groups ?? parsed.selectedGroups,
        defaults.selectedTeams,
    ),
    selectedUsers: normalizeStoredUsers(
        parsed.selected_users ?? parsed.selectedUsers,
        defaults.selectedUsers,
    ),
    groupAssignmentMode: (parsed.group_assignment_mode ?? parsed.groupAssignmentMode) === 'fixed' ? 'fixed' : 'dynamic',
    settings: normalizePublishSettings(
        parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : null,
        defaults.settings,
    ),
});

const parsePublishWizardState = (assignedTo: unknown, fields?: unknown, publishTarget?: unknown): PublishWizardState => {
    const defaults = createDefaultPublishWizardState();
    if (publishTarget && typeof publishTarget === 'object') {
        return normalizePublishTargetState(publishTarget as Record<string, any>, defaults);
    }

    if (fields && typeof fields === 'object' && !Array.isArray(fields)) {
        const fieldsObject = fields as Record<string, any>;
        if (fieldsObject.__publishTarget && typeof fieldsObject.__publishTarget === 'object') {
            return normalizePublishTargetState(fieldsObject.__publishTarget, defaults);
        }
    }

    if (!assignedTo || typeof assignedTo !== 'string') return defaults;

    try {
        const parsed = JSON.parse(assignedTo);
        return normalizePublishTargetState(parsed, defaults);
    } catch {
        return defaults;
    }
};

const initialsFor = (name: string) => name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || '?';

const normalizeUserOptions = (data: any): PublishOption[] => {
    const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];

    console.log(list, 'listlistlistlistlistlistlist')
    return list
        .map((user: any) => {
            const id = user.id ?? user.user_id;
            const name = user.name || user.user_name || `${user.first_name || ''} ${user.last_name || ''}`.trim();

            console.log(user, 'useruseruseruser')
            return id && name ? {
                id: String(id),
                name,
                user_image: user.user_image || null,
                user_thumb_image: user.user_image || user.user_thumb_image || null,
                trade_name: user.trade_name || user.tradeName || null,
                status_color: user.status_color || user.statusColor || null,
            } : null;
        })
        .filter(Boolean) as PublishOption[];
};

const normalizeTeamOptions = (data: any): PublishOption[] => {
    const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
    return list
        .map((team: any) => {
            const id = team.id ?? team.team_id;
            const name = team.title || team.name || team.team_name;
            const memberUsers = Array.isArray(team.users)
                ? team.users
                : Array.isArray(team.team_members)
                    ? team.team_members
                    : [];
            const userIds = memberUsers
                .map((user: any) => user?.id ?? user?.user_id)
                .filter((userId: unknown) => userId !== undefined && userId !== null)
                .map(String);
            const memberCount = Number(team.team_member_count ?? team.member_count ?? userIds.length);
            return id && name ? {
                id: String(id),
                name,
                memberCount: Number.isFinite(memberCount) ? memberCount : 0,
                userIds,
            } : null;
        })
        .filter(Boolean) as PublishOption[];
};

const toggleOption = (current: PublishOption[], option: PublishOption) =>
    current.some((item) => item.id === option.id)
        ? current.filter((item) => item.id !== option.id)
        : [...current, option];

const buildPublishTargetPayload = (state: PublishWizardState) => ({
    selected_teams: selectedIdsToString(state.selectedTeams),
    selected_users: selectedIdsToString(state.selectedUsers),
    group_assignment_mode: state.groupAssignmentMode,
    settings: {
        publish_mode: state.settings.publishMode,
        publish_date: state.settings.publishDate,
        publish_time: state.settings.publishTime,
        notify_users: state.settings.notifyUsers,
        notification_message: state.settings.notificationMessage,
        show_on_feed: state.settings.showOnFeed,
        feed_by: state.settings.feedBy,
        send_reminder: state.settings.sendReminder,
        reminder_date: state.settings.reminderDate,
        reminder_time: state.settings.reminderTime,
        schedule_removal: state.settings.scheduleRemoval,
        removal_date: state.settings.removalDate,
        removal_time: state.settings.removalTime,
    },
});

export {
    buildPublishTargetPayload,
    createDefaultPublishWizardState,
    fieldToDraft,
    initialsFor,
    normalizeTeamOptions,
    normalizeUserOptions,
    parsePublishWizardState,
    toggleOption,
};

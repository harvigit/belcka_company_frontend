import React from 'react';
import { Chip } from '@mui/material';
import { FormField, FormRecord } from '../types';
import { getFormUserName } from '../common/FormUserIdentity';
import { DetailsForm, FormEntry, UserRow } from './formDetailsTypes';

export const statusChip = (status?: FormRecord['status']) => {
    if (status === 'PUBLISHED') {
        return <Chip label="Published" size="small" color="success"/>;
    }
    
    if (status === 'SCHEDULED') {
        return <Chip label="Scheduled" size="small" color="warning"/>;
    }
    
    if (status === 'ARCHIVED') {
        return <Chip label="Archived" size="small" color="default"/>;
    }
    
    return <Chip label="Draft" size="small" color="default" />;
};

export const fullName = (user?: { first_name?: string; last_name?: string; }) => {
    return getFormUserName(user);
};

export const splitName = (name?: string, email?: string) => {
    const source = (name || email || '-').trim();
    const [firstName, ...rest] = source.split(/\s+/);
    
    return {firstName: firstName || '-', lastName: rest.join(' ')};
};

export const getPublishTarget = (form: DetailsForm | null) => 
    form?.publishTarget || form?.publish_target || null;

export const getApiErrorMessage = (err: unknown, fallback: string) => {
    if (err && typeof err === 'object' && 'response' in err) {
        const response = (err as any).response;
        return response?.data?.message || fallback;
    }

    return fallback;
};

export const getFieldValue = (entry: FormEntry | null, fieldId: string) => {
    if (!entry?.data || typeof entry.data !== 'object') return undefined;
    
    return entry.data[fieldId];
};

export const groupChildFields = (field: FormField): FormField[] => (
    Array.isArray(field.fields) ? field.fields : []
);

const splitCommaIds = (value: unknown) => typeof value === 'string'
    ? value.split(',').map((id) => id.trim()).filter(Boolean)
    : [];

const normalizePublishedItems = (value: unknown) => {
    if (Array.isArray(value)) {
        return value.map((item) => {
            if (item && typeof item === 'object') return item;

            const id = String(item ?? '').trim();
            return id ? {id, name: `User ${id}`} : null;
        }).filter(Boolean);
    }

    return splitCommaIds(value).map((id) => ({
        id,
        name: `User ${id}`,
    }));
};

export const buildUserRows = (form: DetailsForm | null): UserRow[] => {
    if (!form) return [];

    const publishTarget = getPublishTarget(form);
    const entries = Array.isArray(form.formEntry) ? form.formEntry : [];
    const entryMap = new Map<number, FormEntry[]>();

    entries.forEach((entry: any) => {
        const userId = Number(entry.submitted_by_id || entry.submittedBy?.id);
        if (!userId) return;
        entryMap.set(userId, [...(entryMap.get(userId) || []), entry]);
    });

    const selectedTeams = Array.isArray(publishTarget?.selected_teams) ? publishTarget.selected_teams : [];
    const teamNamesByUserId = new Map<number, string[]>();

    selectedTeams.forEach((team: any) => {
        const teamUserIds = Array.isArray(team.userIds) ? team.userIds : [];
        teamUserIds.forEach((userId: any) => {
            const normalizedUserId = Number(userId);
            if (!normalizedUserId) return;

            teamNamesByUserId.set(normalizedUserId, [
                ...(teamNamesByUserId.get(normalizedUserId) || []),
                team.name,
            ]);
        });
    });

    const rows = new Map<number, UserRow>();

    normalizePublishedItems(publishTarget?.selected_users).forEach((user: any) => {
        const userId = Number(user.id);
        if (!userId) return;

        const userEntries = entryMap.get(userId) || [];
        const nameParts = splitName(user.name);

        console.log(user, 'useruseruseruseruser')
        rows.set(userId, {
            id: userId,
            first_name: nameParts.firstName,
            last_name: nameParts.lastName,
            user_thumb_image: user.user_thumb_image,
            user_image: user.user_image || user.user_thumb_image || null,
            trade_name: user.trade_name || null,
            status_color: user.status_color || null,
            assigned_teams: teamNamesByUserId.get(userId) || [],
            submitted: userEntries.length > 0,
            submissions: userEntries.length,
            last_submitted: userEntries[0]?.created_at || null,
            source: 'assigned',
        });
    });

    entries.forEach((entry: any) => {
        const userId = Number(entry.submitted_by_id || entry.submittedBy?.id);
        if (!userId || rows.has(userId)) return;

        rows.set(userId, {
            id: userId,
            first_name: entry.submittedBy?.first_name || splitName(undefined, entry.submittedBy?.email).firstName,
            last_name: entry.submittedBy?.last_name || '',
            email: entry.submittedBy?.email,
            user_thumb_image: entry.submittedBy?.user_image || entry.submittedBy?.user_thumb_image || entry.submittedBy?.image || null,
            user_image: entry.submittedBy?.user_image || entry.submittedBy?.user_thumb_image || entry.submittedBy?.image || null,
            trade_name: entry.submittedBy?.trade_name || null,
            status_color: entry.submittedBy?.status_color || null,
            assigned_teams: teamNamesByUserId.get(userId) || [],
            submitted: true,
            submissions: entryMap.get(userId)?.length || 1,
            last_submitted: entryMap.get(userId)?.[0]?.created_at || entry.created_at,
            source: 'submitted',
        });
    });

    return Array.from(rows.values()).sort((a, b) => Number(b.submitted) - Number(a.submitted) || a.first_name.localeCompare(b.last_name));
};

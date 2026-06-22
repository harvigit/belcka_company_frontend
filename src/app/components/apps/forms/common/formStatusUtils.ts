import { FormRecord, FormStatus } from '../types';

const FORM_STATUS_BY_NUMBER: Record<number, FormStatus> = {
    1: 'DRAFT',
    2: 'PUBLISHED',
    3: 'SCHEDULED',
    4: 'ARCHIVED',
};

const FORM_STATUS_BY_TEXT: Record<string, FormStatus> = {
    draft: 'DRAFT',
    published: 'PUBLISHED',
    scheduled: 'SCHEDULED',
    archived: 'ARCHIVED',
};

export const normalizeFormStatus = (status: unknown, statusText?: unknown): FormStatus => {
    const textStatus = String(statusText || '').trim().toLowerCase();
    if (FORM_STATUS_BY_TEXT[textStatus]) return FORM_STATUS_BY_TEXT[textStatus];

    if (typeof status === 'number' && FORM_STATUS_BY_NUMBER[status]) {
        return FORM_STATUS_BY_NUMBER[status];
    }

    if (typeof status === 'string') {
        const normalized = status.trim();
        const fromText = FORM_STATUS_BY_TEXT[normalized.toLowerCase()];
        if (fromText) return fromText;

        const fromNumber = FORM_STATUS_BY_NUMBER[Number(normalized)];
        if (fromNumber) return fromNumber;

        const upperStatus = normalized.toUpperCase();
        if (['DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED'].includes(upperStatus)) {
            return upperStatus as FormStatus;
        }
    }

    return 'DRAFT';
};

export const normalizeFormRecord = <T extends Partial<FormRecord> & Record<string, any>>(form: T): T & { status: FormStatus } => ({
    ...form,
    status: normalizeFormStatus(form?.status, form?.status_text),
    createdAt: form?.createdAt ?? form?.created_at,
});

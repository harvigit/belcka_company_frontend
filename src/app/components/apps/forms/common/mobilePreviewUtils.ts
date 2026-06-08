import {FormField} from './types';

export type LocationPreview = {
    source?: 'current' | 'manual';
    latitude: string | number;
    longitude: string | number;
    accuracy?: number;
};

export type FilePreview = {
    name: string;
    url: string;
    mimeType?: string;
    preview?: string;
    size?: number;
};

export type AudioRecordingPreview = FilePreview;

export type DateTimePreview = {
    date?: string;
    time?: string;
};

export type PreviewValue = string | string[] | number | FilePreview | FilePreview[] | LocationPreview | DateTimePreview | null;
export type PreviewValues = Record<string, PreviewValue>;
export type PreviewErrors = Record<string, string>;

export const NON_INPUT_TYPES = new Set(['Description', 'Formula', 'Group']);

export const flattenFormFields = (fields: FormField[]): FormField[] => fields.flatMap((field) => [
    field,
    ...(field.fields?.length ? flattenFormFields(field.fields) : []),
]);

export const getFieldOptions = (field: FormField, fallback: string[] = []) => {
    const options = Array.isArray(field.options)
        ? field.options.map((option) => option.trim()).filter(Boolean)
        : [];

    return options.length ? options : fallback;
};

export const isLocationPreview = (value: PreviewValue): value is LocationPreview => (
    value !== null
    && typeof value === 'object'
    && !Array.isArray(value)
    && 'latitude' in value
    && 'longitude' in value
);

export const isFilePreview = (value: PreviewValue): value is FilePreview => (
    value !== null
    && typeof value === 'object'
    && !Array.isArray(value)
    && 'name' in value
    && 'url' in value
);

export const isFilePreviewArray = (value: PreviewValue): value is FilePreview[] => (
    Array.isArray(value) && value.every((item) => isFilePreview(item as PreviewValue))
);

export const isAudioRecordingPreview = (value: PreviewValue): value is AudioRecordingPreview => isFilePreview(value);

export const isDateTimePreview = (value: PreviewValue): value is DateTimePreview => (
    value !== null
    && typeof value === 'object'
    && !Array.isArray(value)
    && ('date' in value || 'time' in value)
);

export const isEmptyValue = (value: PreviewValue) => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (typeof value === 'number') return false;
    if (Array.isArray(value)) return value.length === 0;
    if (isLocationPreview(value)) return !String(value.latitude || '').trim() || !String(value.longitude || '').trim();
    if (isDateTimePreview(value)) return !value.date && !value.time;
    if (isFilePreview(value)) return !value.url;
    return false;
};

export const fieldConditionMatches = (field: FormField, values: PreviewValues) => {
    if (!field.showOnlyIf) return true;

    const conditions = Array.isArray(field.conditions) && field.conditions.length
        ? field.conditions
        : field.conditionFieldId
            ? [{fieldId: field.conditionFieldId, operator: field.conditionOperator === 'not_empty' ? 'not_empty' : 'empty', joinWith: 'if' as const}]
            : [];

    if (!conditions.length) return true;

    return conditions.reduce<boolean | null>((result, condition, index) => {
        const matches = condition.operator === 'not_empty'
            ? !isEmptyValue(values[condition.fieldId] ?? null)
            : isEmptyValue(values[condition.fieldId] ?? null);

        if (index === 0 || result === null) return matches;
        return condition.joinWith === 'or' ? result || matches : result && matches;
    }, null) ?? true;
};

export const calculateFormulaValue = (field: FormField, fields: FormField[], values: PreviewValues) => {
    const expression = field.formulaExpression?.trim();
    if (!expression) return '';

    const withValues = fields.reduce((nextExpression, currentField) => {
        const rawValue = values[currentField.id];
        const numericValue = typeof rawValue === 'number'
            ? rawValue
            : typeof rawValue === 'string'
                ? Number(rawValue)
                : 0;

        const safeValue = Number.isFinite(numericValue) ? numericValue : 0;
        return nextExpression
            .replaceAll(currentField.id, String(safeValue))
            .replaceAll(currentField.label, String(safeValue));
    }, expression);

    if (!/^[\d+\-*/().\s]+$/.test(withValues)) return expression;

    try {
        const result = Function(`"use strict"; return (${withValues});`)();
        return Number.isFinite(result) ? String(result) : '';
    } catch {
        return expression;
    }
};

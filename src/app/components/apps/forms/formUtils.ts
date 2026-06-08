import {FormField, FormFieldCondition} from './common/types';

export const stripHtml = (value: string) => value
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const fieldDisplayLabel = (field: FormField) => {
    const text = field.type === 'Description' ? stripHtml(field.label) : field.label;
    return text || field.type;
};

export const fieldConditions = (field: FormField): FormFieldCondition[] => {
    if (Array.isArray(field.conditions) && field.conditions.length) {
        return field.conditions.map((condition, index) => ({
            ...condition,
            joinWith: index === 0 ? 'if' : condition.joinWith === 'or' ? 'or' : 'and',
        }));
    }

    return field.conditionFieldId
        ? [{
            fieldId: field.conditionFieldId,
            operator: field.conditionOperator === 'not_empty' ? 'not_empty' : 'empty',
            joinWith: 'if',
        }]
        : [];
};

export const todayInputValue = () => new Date().toISOString().slice(0, 10);

export const timeInputValue = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

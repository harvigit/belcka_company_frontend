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

const isFormulaTokenChar = (value: string) => /[a-zA-Z0-9_]/.test(value);

const replaceFormulaFieldLabels = (expression: string, fieldLabels: string[]) => {
    let nextExpression = '';
    let index = 0;

    while (index < expression.length) {
        const matchedLabel = fieldLabels.find((label) => {
            if (!expression.startsWith(label, index)) return false;

            const previousChar = expression[index - 1] || '';
            const nextChar = expression[index + label.length] || '';
            const startsWithTokenChar = isFormulaTokenChar(label[0] || '');
            const endsWithTokenChar = isFormulaTokenChar(label[label.length - 1] || '');

            return (!startsWithTokenChar || !previousChar || !isFormulaTokenChar(previousChar))
                && (!endsWithTokenChar || !nextChar || !isFormulaTokenChar(nextChar));
        });

        if (matchedLabel) {
            nextExpression += '1';
            index += matchedLabel.length;
            continue;
        }

        nextExpression += expression[index];
        index += 1;
    }

    return nextExpression;
};

export const getFormulaExpressionError = (expression: string, numberFields: FormField[]) => {
    const formula = expression.trim();
    if (!formula) return '';

    const fieldLabels = numberFields
        .map((field) => fieldDisplayLabel(field).trim())
        .filter(Boolean)
        .sort((a, b) => b.length - a.length);

    const expressionWithoutFields = replaceFormulaFieldLabels(formula, fieldLabels);

    return /^[0-9+\-*/().\s]+$/.test(expressionWithoutFields)
        ? ''
        : "Formula isn't a valid one";
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

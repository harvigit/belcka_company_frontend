export const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const validateAndFormatTime = (value: string): string => {
    if (!value || value.trim() === '') return '';

    const digits = value.replace(/\D/g, '');
    if (digits.length === 0) return '';

    let hours = 0;
    let minutes = 0;

    if (digits.length === 1) {
        hours = parseInt(digits);
        minutes = 0;
    } else if (digits.length === 2) {
        const num = parseInt(digits);
        if (num <= 23) {
            hours = num;
            minutes = 0;
        } else {
            hours = parseInt(digits[0]);
            minutes = parseInt(digits[1]) * 10;
        }
    } else if (digits.length === 3) {
        const firstTwo = parseInt(digits.slice(0, 2));
        if (firstTwo <= 23) {
            hours = firstTwo;
            minutes = parseInt(digits[2]) * 10;
        } else {
            hours = parseInt(digits[0]);
            minutes = parseInt(digits.slice(1, 3));
        }
    } else {
        hours = parseInt(digits.slice(0, 2));
        minutes = parseInt(digits.slice(2, 4));
    }

    hours = Math.min(hours, 23);
    minutes = Math.min(minutes, 59);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

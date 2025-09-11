export const isRecordLocked = (log: any): boolean => {
    return log?.status === 6 || log?.status === '6';
};

export const isRecordUnlocked = (log: any): boolean => {
    return log?.status === 7 || log?.status === '7' || (log?.status && log.status !== 6 && log.status !== '6');
};

export const sanitizeDateTime = (dateTime: string): string => {
    return dateTime && dateTime !== 'Invalid DateTime' ? dateTime : '--';
};

export const formatHour = (val: string | number | null | undefined, isPricework: boolean = false): string => {
    if (val === null || val === undefined) return isPricework ? '--' : '00:00';
    if (isPricework) return '--';

    const str = val.toString().trim();
    if (/^\d{1,2}:\d{1,2}(\.\d+)?$/.test(str)) {
        const [h, m] = str.split(':');
        const minutes = parseFloat(m) || 0;
        return `${h.padStart(2, '0')}:${Math.floor(minutes).toString().padStart(2, '0')}`;
    }

    const num = parseFloat(str);
    if (!isNaN(num)) {
        const h = Math.floor(num);
        const m = Math.round((num - h) * 60);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }
    return isPricework ? '--' : '00:00';
};

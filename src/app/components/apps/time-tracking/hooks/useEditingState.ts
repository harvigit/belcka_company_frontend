import { useState, useCallback } from 'react';
import {EditingWorklog} from '../types/timeClock';

export const useEditingState = () => {
    const [editingWorklogs, setEditingWorklogs] = useState<{ [key: string]: EditingWorklog }>({});
    const [savingWorklogs, setSavingWorklogs] = useState<Set<string>>(new Set());

    const startEditingField = useCallback((worklogId: string, field: 'start' | 'end', log: any) => {
        if (log?.status === 6 || log?.status === '6') return;

        setEditingWorklogs(prev => ({
            ...prev,
            [worklogId]: {
                worklogId,
                start: log.start || '',
                end: log.end || '',
                shift_id: log.shift_id || '',
                editingField: field,
            }
        }));
    }, []);

    const cancelEditingField = useCallback((worklogId: string) => {
        setEditingWorklogs(prev => {
            const newState = {...prev};
            delete newState[worklogId];
            return newState;
        });
    }, []);

    const updateEditingField = useCallback((worklogId: string, field: keyof EditingWorklog, value: string) => {
        setEditingWorklogs(prev => ({
            ...prev,
            [worklogId]: {
                ...prev[worklogId],
                [field]: value
            }
        }));
    }, []);

    return {
        editingWorklogs,
        savingWorklogs,
        setSavingWorklogs,
        startEditingField,
        cancelEditingField,
        updateEditingField,
    };
};

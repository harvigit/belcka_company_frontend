import { useState, useCallback } from 'react';
import {EditingWorklog} from '@/app/components/apps/time-clock/types/timeClock';

export const useEditingState = () => {
    const [editingWorklogs, setEditingWorklogs] = useState<{ [key: string]: EditingWorklog }>({});
    const [savingWorklogs, setSavingWorklogs] = useState<Set<string>>(new Set());
    const [editingShifts, setEditingShifts] = useState<{
        [key: string]: { shift_id: number | string; editingField: 'shift' }
    }>({});

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

    const startEditingShift = useCallback((worklogId: string, currentShiftId: number | string, log: any) => {
        if (log?.status === 6 || log?.status === '6') return;

        setEditingShifts(prev => ({
            ...prev,
            [worklogId]: {
                shift_id: currentShiftId || '',
                editingField: 'shift',
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

    const cancelEditingShift = useCallback((worklogId: string) => {
        setEditingShifts(prev => {
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

    const updateEditingShift = useCallback((worklogId: string, shiftId: number | string) => {
        setEditingShifts(prev => ({
            ...prev,
            [worklogId]: {
                ...prev[worklogId],
                shift_id: shiftId
            }
        }));
    }, []);

    return {
        editingWorklogs,
        savingWorklogs,
        setSavingWorklogs,
        editingShifts,
        startEditingField,
        startEditingShift,
        cancelEditingField,
        cancelEditingShift,
        updateEditingField,
        updateEditingShift,
    };
};

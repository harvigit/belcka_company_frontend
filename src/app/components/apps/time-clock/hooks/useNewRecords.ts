import { useState, useCallback } from 'react';
import {NewRecord} from '@/app/components/apps/time-clock/types/timeClock';

export const useNewRecords = () => {
    const [newRecords, setNewRecords] = useState<{ [key: string]: NewRecord }>({});
    const [savingNewRecords, setSavingNewRecords] = useState<Set<string>>(new Set());

    const startAddingNewRecord = useCallback((date: string, projects: any, shifts: any) => {
        const recordKey = `new-${date}-${Date.now()}`;
        const defaultShiftId = shifts.length > 0 ? shifts[0].id : '';
        const defaultProjectId = projects.length > 0 ? projects[0].id : '';
        
        setNewRecords(prev => ({
            ...prev,
            [recordKey]: {
                date,
                shift_id: defaultShiftId,
                project_id: defaultProjectId,
                start: '',
                end: '',
            }
        }));
    }, []);

    const updateNewRecord = useCallback((recordKey: string, field: keyof NewRecord, value: string | number) => {
        setNewRecords(prev => ({
            ...prev,
            [recordKey]: {
                ...prev[recordKey],
                [field]: value
            }
        }));
    }, []);

    const cancelNewRecord = useCallback((recordKey: string) => {
        setNewRecords(prev => {
            const newState = {...prev};
            delete newState[recordKey];
            return newState;
        });
    }, []);

    const clearNewRecords = useCallback(() => {
        setNewRecords({});
    }, []);

    return {
        newRecords,
        savingNewRecords,
        setSavingNewRecords,
        startAddingNewRecord,
        updateNewRecord,
        cancelNewRecord,
        clearNewRecords,
    };
};

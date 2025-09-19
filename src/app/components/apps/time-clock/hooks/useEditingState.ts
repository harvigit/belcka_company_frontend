import { useState, useCallback } from 'react';
import {EditingWorklog} from '@/app/components/apps/time-clock/types/timeClock';

export const useEditingState = () => {
    const [editingWorklogs, setEditingWorklogs] = useState<{ [key: string]: EditingWorklog }>({});
    const [savingWorklogs, setSavingWorklogs] = useState<Set<string>>(new Set());
    const [editingShifts, setEditingShifts] = useState<{
        [key: string]: { shift_id: number | string; editingField: 'shift' }
    }>({});
    
    const [editingProjects, setEditingProjects] = useState<{
        [key: string]: { project_id: number | string; editingField: 'project' }
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

    const startEditingProject = useCallback((worklogId: string, currentProjectId: number | string, log: any) => {
        if (log?.status === 6 || log?.status === '6') return;

        setEditingProjects(prev => ({
            ...prev,
            [worklogId]: {
                project_id: currentProjectId || '',
                editingField: 'project',
            }
        }));
    }, []);
    
    const updateEditingProject = useCallback((worklogId: string, projectId: number | string) => {
        setEditingProjects(prev => ({
            ...prev,
            [worklogId]: {
                ...prev[worklogId],
                project_id: projectId
            }
        }));
    }, []);

    const cancelEditingProject = useCallback((worklogId: string) => {
        setEditingProjects(prev => {
            const newState = {...prev};
            delete newState[worklogId];
            return newState;
        });
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
        editingProjects,
        startEditingProject,
        updateEditingProject,
        cancelEditingProject,
    };
};

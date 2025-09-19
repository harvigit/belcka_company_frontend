import React from 'react';
import { Box, FormControl, Select, MenuItem } from '@mui/material';
import {Project} from '@/app/components/apps/time-clock/types/timeClock';

interface EditableProjectCellProps {
    worklogId: string;
    currentProjectId: number | string;
    currentProjectName: string;
    log: any;
    projects: Project[];
    editingProjects: { [key: string]: { project_id: number | string; editingField: 'project' } };
    savingWorklogs: Set<string>;
    startEditingProject: (worklogId: string, currentProjectId: number | string, log: any) => void;
    updateEditingProject: (worklogId: string, projectId: number | string) => void;
    saveProjectChanges: (worklogId: string, originalLog: any) => void;
    cancelEditingProject: (worklogId: string) => void;
}

const EditableProjectCell: React.FC<EditableProjectCellProps> = ({
                                                                 worklogId,
                                                                 currentProjectId,
                                                                 currentProjectName,
                                                                 log,
                                                                 projects,
                                                                 editingProjects,
                                                                 savingWorklogs,
                                                                 startEditingProject,
                                                                 updateEditingProject,
                                                                 saveProjectChanges,
                                                                 cancelEditingProject,
                                                             }) => {
    const editingData = editingProjects[worklogId];
    const isEditing = editingData && editingData.editingField === 'project';
    const isSaving = savingWorklogs.has(worklogId);
    const isLocked = log?.status === 6 || log?.status === '6';

    if (isEditing && !isLocked) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: '32px' }}>
                <FormControl size="small" sx={{ minWidth: '100px', width: '100%', maxWidth: '100px' }}>
                    <Select
                        value={editingData.project_id || ''}
                        onChange={(e) => updateEditingProject(worklogId, e.target.value)}
                        onBlur={() => saveProjectChanges(worklogId, log)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                saveProjectChanges(worklogId, log);
                            } else if (e.key === 'Escape') {
                                e.preventDefault();
                                cancelEditingProject(worklogId);
                            }
                        }}
                        autoFocus
                        disabled={isSaving}
                        sx={{
                            height: '32px',
                            '& .MuiSelect-select': { fontSize: '0.875rem', py: '6px', px: '8px', textAlign: 'center' },
                            '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e0e0e0' }
                        }}
                    >
                        {projects.map((project) => (
                            <MenuItem key={project.id} value={project.id}>
                                {project.name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>
        );
    }

    return (
        <Box
            onClick={() => !isLocked && startEditingProject(worklogId, currentProjectId, log)}
            sx={{
                py: 0.5,
                fontSize: '0.875rem',
                cursor: isLocked ? 'not-allowed' : 'pointer',
                minHeight: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: isLocked ? 0.6 : 1,
                '&:hover': !isLocked ? { borderRadius: '4px', backgroundColor: 'rgba(0,0,0,0.04)' } : {},
            }}
            title={isLocked ? 'This worklog is locked and cannot be edited' : 'Click to edit project'}
        >
            {currentProjectName || '--'}
        </Box>
    );
}; 
export default EditableProjectCell;

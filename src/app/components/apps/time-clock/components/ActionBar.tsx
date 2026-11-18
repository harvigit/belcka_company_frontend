import React from 'react';
import { Box, Stack, IconButton, Typography, Button } from '@mui/material';
import {IconX, IconLock, IconLockOpen, IconTrash} from '@tabler/icons-react';
import {useTranslation} from 'react-i18next';
import ActionPermissionTooltip from './ActionPermissionTooltip';

interface ActionBarProps {
    selectedRows: Set<string>;
    onClearSelection: () => void;
    onLockClick: () => void;
    onUnlockClick: () => void;
    onDeleteClick: () => void;
    getSelectedRowsLockStatus: () => { hasLockedRows: boolean; hasUnlockedRows: boolean };
    getSelectedRowsWorklogs: () => { hasWorklogs: boolean; };
    disabled?: boolean;
    // Which actions the signed-in user may run (Bookkeeper Setting → Timesheet actions)
    actionAccess: { lock: boolean; unlock: boolean; delete: boolean };
}

const ActionBar: React.FC<ActionBarProps> = ({
                                                 selectedRows,
                                                 onClearSelection,
                                                 onLockClick,
                                                 onUnlockClick,
                                                 onDeleteClick,
                                                 getSelectedRowsLockStatus,
                                                 getSelectedRowsWorklogs,
                                                 disabled = false,
                                                 actionAccess,
                                             }) => {
    const {t} = useTranslation();

    if (selectedRows.size === 0) return null;

    const { hasLockedRows, hasUnlockedRows } = getSelectedRowsLockStatus();
    const { hasWorklogs } = getSelectedRowsWorklogs();

    return (
        <Box
            sx={{
                position: 'fixed',
                bottom: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                px: 3,
                py: 1.5,
                zIndex: 1000,
                minWidth: '400px',
                border: '1px solid #e0e0e0',
            }}
        >
            <Stack direction="row" alignItems="center" spacing={2}>
                <IconButton
                    size="small"
                    onClick={onClearSelection}
                    disabled={disabled}
                    sx={{ color: '#666', '&:hover': { bgcolor: 'grey.100' } }}
                >
                    <IconX size={16} />
                </IconButton>

                <Typography variant="body2" fontWeight={600} color="text.primary">
                    {selectedRows.size} Selected
                </Typography>

                <Box sx={{ flexGrow: 1 }} />

                <Stack direction="row" spacing={1.5}>
                    <ActionPermissionTooltip
                        allowed={actionAccess.lock}
                        title={t("You don't have permission to lock timesheets")}
                    >
                    <Button
                        size="small"
                        variant="outlined"
                        color="success"
                        sx={{
                            px: 2.5,
                            textTransform: 'none',
                            fontWeight: 600,
                            borderRadius: '8px',
                            '&:hover': { boxShadow: '0 2px 8px rgba(46, 125, 50, 0.2)' }
                        }}
                        onClick={onLockClick}
                        disabled={disabled || !actionAccess.lock}
                        // disabled={hasLockedRows}
                    >
                        <IconLock size={16} />
                        <Typography variant="caption" sx={{ ml: 0.5, fontWeight: 600 }}>
                            Lock
                        </Typography>
                    </Button>
                    </ActionPermissionTooltip>

                    <ActionPermissionTooltip
                        allowed={actionAccess.unlock}
                        title={t("You don't have permission to unlock timesheets")}
                    >
                    <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        sx={{
                            px: 2.5,
                            textTransform: 'none',
                            fontWeight: 600,
                            borderRadius: '8px',
                            '&:hover': { boxShadow: '0 2px 8px rgba(211, 47, 47, 0.2)' }
                        }}
                        onClick={onUnlockClick}
                        disabled={disabled || !actionAccess.unlock}
                        // disabled={hasUnlockedRows}
                    >
                        <IconLockOpen size={16} />
                        <Typography variant="caption" sx={{ ml: 0.5, fontWeight: 600 }}>
                            Unlock
                        </Typography>
                    </Button>
                    </ActionPermissionTooltip>

                    <ActionPermissionTooltip
                        allowed={actionAccess.delete}
                        title={t("You don't have permission to delete timesheets")}
                    >
                    <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        sx={{
                            px: 2.5,
                            textTransform: 'none',
                            fontWeight: 600,
                            borderRadius: '8px',
                            '&:hover': { boxShadow: '0 2px 8px rgba(211, 47, 47, 0.2)' }
                        }}
                        onClick={onDeleteClick}
                        disabled={disabled || !hasWorklogs || !actionAccess.delete}
                    >
                        <IconTrash size={16} />
                        <Typography variant="caption" sx={{ ml: 0.5, fontWeight: 600 }}>
                            Delete
                        </Typography>
                    </Button>
                    </ActionPermissionTooltip>
                </Stack>
            </Stack>
        </Box>
    );
}
export default ActionBar;

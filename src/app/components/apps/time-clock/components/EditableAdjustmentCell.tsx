import React, { useState } from 'react';
import { Box, TextField, Tooltip, Typography } from '@mui/material';
import { IconMinus } from '@tabler/icons-react';

interface EditableAdjustmentCellProps {
    date: string;
    currentAmount: number | null | undefined;
    currency: string;
    isLocked: boolean;
    onSave: (date: string, amount: number) => Promise<void>;
}

const EditableAdjustmentCell: React.FC<EditableAdjustmentCellProps> = ({date, currentAmount, currency, isLocked, onSave}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const tooltipStyles = {
        '& .MuiTooltip-arrow': { color: '#1a1f29' },
    };

    const openEditor = () => {
        if (isLocked) return;
        setValue(currentAmount !== 0 && currentAmount != null ? String(currentAmount) : '');
        setIsEditing(true);
    };

    const handleCommit = async () => {
        const parsed = parseFloat(value);
        const finalValue = isNaN(parsed) ? 0 : parsed;
        if (finalValue !== (currentAmount ?? 0)) {
            setIsSaving(true);
            try {
                await onSave(date, finalValue);
            } finally {
                setIsSaving(false);
            }
        }
        setIsEditing(false);
    };

    const handleCancel = () => setIsEditing(false);

    if (isEditing) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '32px',
                    margin: '0 auto',
                }}
            >
                <TextField
                    type="text"
                    value={value}
                    placeholder="-10 / 10"
                    variant="outlined"
                    size="small"
                    autoFocus
                    disabled={isSaving}
                    onChange={(e) => {
                        const raw = e.target.value;
                        if (/^-?\d*\.?\d*$/.test(raw) || raw === '-' || raw === '') {
                            setValue(raw);
                        }
                    }}
                    onBlur={handleCommit}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); handleCommit(); }
                        else if (e.key === 'Escape') { e.preventDefault(); handleCancel(); }
                    }}
                    sx={{
                        width: 'auto',
                        minWidth: '75px',
                        '& .MuiInputBase-root': {
                            height: '32px',
                            fontSize: '0.875rem',
                            borderRadius: '4px',
                        },
                        '& .MuiInputBase-input': {
                            p: '6px 8px',
                            textAlign: 'center',
                        },
                        '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: isSaving ? 'grey.500' : '#1976d2',
                        },
                    }}
                    inputProps={{ step: 'any' }}
                />
            </Box>
        );
    }

    const hasValue = currentAmount !== undefined && currentAmount !== null && currentAmount !== 0;
    const isPositive = (currentAmount ?? 0) > 0;

    const cellContent = (
        <Box
            onClick={openEditor}
            sx={{
                py: 0.5,
                fontSize: '0.875rem',
                cursor: isLocked ? 'not-allowed' : 'text',
                minHeight: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                opacity: isLocked ? 0.6 : 1,
                borderRadius: '4px',
                px: '8px',
                '&:hover': !isLocked ? { boxShadow: '0 0 0 1px #1976d2' } : {},
            }}
        >
            {hasValue && !isPositive && ('-')}
            <Typography variant="body2">
                {hasValue ? `${currency}${Math.abs(currentAmount!)}` : '--'}
            </Typography>
        </Box>
    );

    return (
        <Tooltip
            title={isLocked ? 'This record is locked and cannot be edited' : ''}
            arrow
            placement="top"
            sx={tooltipStyles}
        >
            <Box>{cellContent}</Box>
        </Tooltip>
    );
};

export default EditableAdjustmentCell;

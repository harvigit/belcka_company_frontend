import React, { useState } from 'react';
import {
    Box,
    Stack,
    Avatar,
    Typography,
    Button,
    Menu,
    MenuItem,
    Select,
    SelectChangeEvent,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    IconButton,
} from '@mui/material';
import { IconChevronLeft, IconChevronRight, IconHandStop, IconX, IconChevronUp, IconChevronDown } from '@tabler/icons-react';
import DateRangePickerBox from '@/app/components/common/DateRangePickerBox';

interface TimeClock {
    user_name: string;
    user_thumb_image?: string;
    trade_name?: string;
}

interface TimeClockHeaderProps {
    selectedRows: Set<string>;
    timeClock: TimeClock;
    allUsers: TimeClock[];
    currentUserIndex: number;
    startDate: Date | null;
    endDate: Date | null;
    pendingRequestCount: number;
    totalConflicts: number;
    filterValue: string;
    onPreviousUser: () => void;
    onNextUser: () => void;
    onDateRangeChange: (range: { from: Date | null; to: Date | null }) => void;
    onPendingRequest: () => void;
    onConflicts: () => void;
    onFilterChange: (value: string) => void;
    onExportData: (option: string) => void;
    onAddLeave: () => void;
}

const TimeClockHeader: React.FC<TimeClockHeaderProps> = ({
                                                             selectedRows,
                                                             timeClock,
                                                             allUsers,
                                                             currentUserIndex,
                                                             startDate,
                                                             endDate,
                                                             pendingRequestCount,
                                                             totalConflicts,
                                                             onPreviousUser,
                                                             onNextUser,
                                                             onDateRangeChange,
                                                             onPendingRequest,
                                                             onConflicts,
                                                             filterValue,
                                                             onFilterChange,
                                                             onExportData,
                                                             onAddLeave,
                                                         }) => {
    const canGoToPrevious = currentUserIndex > 0;
    const canGoToNext = currentUserIndex >= 0 && currentUserIndex < allUsers.length - 1;

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [addDropDown, setAddDropDown] = useState<null | HTMLElement>(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedExportOption, setSelectedExportOption] = useState<string | null>(null);


    const open = Boolean(anchorEl);
    const openAddleave = Boolean(addDropDown);

    const handleFilterChange = (event: SelectChangeEvent<string>) => {
        onFilterChange(event.target.value);
    };

    const handleExportClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleAddClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAddDropDown(event.currentTarget);
    };

    const handleAddClose = () => {
        setAddDropDown(null);
    };

    const handleAddLeaveClick = () => {
        setAddDropDown(null);
        onAddLeave();
    };

    const handleExportClose = (option: string) => {
        if (option) {
            setSelectedExportOption(option);
            if (totalConflicts > 0 || pendingRequestCount > 0) {
                setOpenDialog(true);
            } else {
                onExportData(option);
            }
        }
        setAnchorEl(null);
    };

    const handleDialogClose = () => {
        setOpenDialog(false);
        setSelectedExportOption(null);
    };

    const handleExportAnyway = () => {
        if (selectedExportOption) {
            onExportData(selectedExportOption);
        }
        setOpenDialog(false);
        setSelectedExportOption(null);
    };

    if (!allUsers.length || currentUserIndex < 0 || currentUserIndex >= allUsers.length) {
        return <Typography>No users available</Typography>;
    }

    return (
        <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Navigation Row */}
            {allUsers.length > 1 && (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    {canGoToPrevious ? (
                        <Box
                            role="button"
                            aria-label={`Go to previous user: ${allUsers[currentUserIndex - 1]?.user_name}`}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                cursor: 'pointer',
                                px: 2,
                                py: 1,
                                borderRadius: '25px',
                                backgroundColor: 'white',
                                border: '2px solid #e0e0e0',
                                transition: 'all 0.2s ease',
                            }}
                            onClick={onPreviousUser}
                        >
                            <IconChevronLeft size={20} color="#8b8a8a" />
                            <Avatar
                                src={allUsers[currentUserIndex - 1]?.user_thumb_image}
                                alt={allUsers[currentUserIndex - 1]?.user_name}
                                sx={{ width: 28, height: 28, mx: 1 }}
                            />
                            <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.85rem' }}>
                                {allUsers[currentUserIndex - 1]?.user_name}
                            </Typography>
                        </Box>
                    ) : (
                        <Box sx={{ width: '200px' }} />
                    )}

                    {canGoToNext ? (
                        <Box
                            role="button"
                            aria-label={`Go to next user: ${allUsers[currentUserIndex + 1]?.user_name}`}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                cursor: 'pointer',
                                px: 2,
                                py: 1,
                                borderRadius: '25px',
                                backgroundColor: 'white',
                                border: '2px solid #e0e0e0',
                                transition: 'all 0.2s ease',
                            }}
                            onClick={onNextUser}
                        >
                            <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.85rem' }}>
                                {allUsers[currentUserIndex + 1]?.user_name}
                            </Typography>
                            <Avatar
                                src={allUsers[currentUserIndex + 1]?.user_thumb_image}
                                alt={allUsers[currentUserIndex + 1]?.user_name}
                                sx={{ width: 28, height: 28, mx: 1 }}
                            />
                            <IconChevronRight size={20} color="#8b8a8a" />
                        </Box>
                    ) : (
                        <Box sx={{ width: '200px' }} />
                    )}
                </Box>
            )}

            {/* Main Header Content */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap">
                <Stack direction="row" alignItems="center" spacing={2}>
                    <Avatar src={timeClock.user_thumb_image} alt={timeClock.user_name} sx={{ width: 40, height: 40 }} />
                    <Box>
                        <Typography variant="h6" fontWeight={600}>
                            {timeClock.user_name}
                        </Typography>
                        <Typography color="textSecondary" variant="body2">
                            {timeClock.trade_name}
                        </Typography>
                    </Box>
                    <Stack mt={3} mx={2} mb={3} direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1.5, sm: 2 }} alignItems="center">
                        <DateRangePickerBox from={startDate} to={endDate} onChange={onDateRangeChange} />
                    </Stack>
                    <Stack mt={3} mx={2} mb={3} direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1.5, sm: 2 }} alignItems="center">
                        <Select
                            value={filterValue}
                            onChange={handleFilterChange}
                            size="small"
                            sx={{
                                width: 150,
                                '& .MuiOutlinedInput-root': {
                                    height: 40,
                                    fontSize: '0.875rem',
                                },
                                '& .MuiSelect-select': {
                                    padding: '8px 12px',
                                },
                            }}
                        >
                            <MenuItem value="all">All Days</MenuItem>
                            <MenuItem value="lock">Lock Days</MenuItem>
                            <MenuItem value="unlock">Unlock Days</MenuItem>
                        </Select>
                    </Stack>
                </Stack>

                <Stack direction="row" spacing={1}>
                    <Button
                        size="small"
                        variant="outlined"
                        color="primary"
                        sx={{
                            p: 1,
                            '&:hover': {
                                backgroundColor: 'transparent',
                                borderColor: 'inherit',
                                boxShadow: 'none',
                                color: '#1e4db7',
                            },
                        }}
                        onClick={handleAddClick}
                        endIcon={openAddleave ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
                    >
                        <Typography sx={{ fontWeight: 600 }}>
                            Add
                        </Typography>
                    </Button>
                    <Menu
                        anchorEl={addDropDown}
                        open={openAddleave}
                        onClose={handleAddClose}
                        anchorOrigin={{
                            vertical: 'bottom',
                            horizontal: 'right',
                        }}
                        transformOrigin={{
                            vertical: 'top',
                            horizontal: 'right',
                        }}
                    >
                        <MenuItem onClick={handleAddLeaveClick}>Add Leave</MenuItem>
                    </Menu>

                    {selectedRows.size > 0 && (
                        <>
                            <Button
                                size="small"
                                variant="outlined"
                                color="primary"
                                sx={{
                                    px: 2,
                                    '&:hover': {
                                        backgroundColor: 'transparent',
                                        borderColor: 'inherit',
                                        boxShadow: 'none',
                                        color: '#1e4db7',
                                    },
                                }}
                                onClick={handleExportClick}
                                endIcon={open ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
                            >
                                <Typography sx={{ fontWeight: 600 }}>
                                    Export
                                </Typography>
                            </Button>
                            <Menu
                                anchorEl={anchorEl}
                                open={open}
                                onClose={() => handleExportClose('')}
                                anchorOrigin={{
                                    vertical: 'bottom',
                                    horizontal: 'right',
                                }}
                                transformOrigin={{
                                    vertical: 'top',
                                    horizontal: 'right',
                                }}
                            >
                                <MenuItem onClick={() => handleExportClose('excel')}>Excel</MenuItem>
                                <MenuItem onClick={() => handleExportClose('pdf')}>PDF</MenuItem>
                            </Menu>
                        </>
                    )}

                    {totalConflicts > 0 && (
                        <Button
                            variant="outlined"
                            sx={{
                                borderRadius: '50px',
                                borderColor: '#f28b82',
                                px: 1.5,
                                py: 0.5,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                textTransform: 'none',
                                '&:hover': { backgroundColor: 'transparent', borderColor: '#f28b82' },
                            }}
                            onClick={onConflicts}
                        >
                            <Box
                                sx={{
                                    backgroundColor: '#e53935',
                                    color: 'white',
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    width: 20,
                                    height: 20,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '50%',
                                }}
                            >
                                {totalConflicts}
                            </Box>
                            <Typography sx={{ fontWeight: 600, color: '#e53935', fontSize: '14px' }}>
                                Conflicts
                            </Typography>
                        </Button>
                    )}

                    {pendingRequestCount > 0 && (
                        <Button
                            size="small"
                            variant="outlined"
                            color="warning"
                            sx={{
                                px: 2,
                                '&:hover': {
                                    backgroundColor: 'transparent',
                                    borderColor: 'inherit',
                                    boxShadow: 'none',
                                    color: '#fdc90f',
                                },
                            }}
                            onClick={onPendingRequest}
                        >
                            <Typography sx={{ fontWeight: 600 }}>
                                Pending Requests ({pendingRequestCount})
                            </Typography>
                        </Button>
                    )}
                </Stack>
            </Stack>

            {(totalConflicts > 0 || pendingRequestCount > 0) && (
                <Dialog
                    open={openDialog}
                    onClose={handleDialogClose}
                    sx={{
                        '& .MuiDialog-paper': {
                            borderRadius: '12px',
                            maxWidth: { xs: '90%', sm: '500px' },
                        },
                    }}
                >
                    <IconButton
                        aria-label="Close dialog"
                        onClick={handleDialogClose}
                        sx={{
                            position: 'absolute',
                            right: 8,
                            top: 8,
                            color: '#999',
                        }}
                    >
                        <IconX />
                    </IconButton>

                    <DialogContent sx={{ textAlign: 'center', padding: '30px' }}>
                        <Box
                            sx={{
                                backgroundColor: '#fff3e0',
                                color: '#ff9800',
                                width: 56,
                                height: 56,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '50%',
                                margin: '0 auto 16px',
                            }}
                        >
                            <IconHandStop size={32} />
                        </Box>

                        <Typography
                            variant="h6"
                            sx={{
                                fontWeight: 600,
                                fontSize: '20px',
                                color: '#1a1a1a',
                                marginBottom: '12px',
                            }}
                        >
                            {totalConflicts + pendingRequestCount} unresolved issues
                        </Typography>

                        <DialogContentText
                            sx={{
                                color: '#666',
                                fontSize: '14px',
                                lineHeight: '1.5',
                            }}
                        >
                            Resolve conflicts and pending requests before exporting, or choose to ignore and proceed with exporting.
                        </DialogContentText>
                    </DialogContent>

                    <DialogActions sx={{ justifyContent: 'center', padding: '0 30px 30px', gap: 2 }}>
                        <Button
                            onClick={handleDialogClose}
                            variant="text"
                            sx={{
                                color: '#666',
                                textTransform: 'none',
                                fontSize: '14px',
                                fontWeight: 500,
                                padding: '8px 24px',
                                '&:hover': {
                                    backgroundColor: '#E7ECF7',
                                    color: '#666',
                                },
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleExportAnyway}
                            variant="contained"
                            sx={{
                                backgroundColor: '#0091ea',
                                textTransform: 'none',
                                fontSize: '14px',
                                fontWeight: 500,
                                padding: '8px 24px',
                                borderRadius: '6px',
                                boxShadow: 'none',
                                '&:hover': {
                                    backgroundColor: '#0081d5',
                                    boxShadow: 'none',
                                },
                            }}
                        >
                            Export anyway
                        </Button>
                    </DialogActions>
                </Dialog>
            )}
        </Box>
    );
};

export default TimeClockHeader;

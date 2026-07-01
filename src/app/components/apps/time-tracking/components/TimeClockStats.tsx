import React, {useState} from 'react';
import {
    Box,
    Typography,
    IconButton,
    Popover,
    TextField,
    FormGroup,
    FormControlLabel,
    Checkbox,
    Button, Menu, MenuItem,
} from '@mui/material';
import {
    IconChevronDown,
    IconChevronUp,
    IconEye,
    IconLayoutSidebarLeftExpand,
    IconLayoutSidebarRightExpand,
} from '@tabler/icons-react';
import {TimeClockDetailResponse} from '../types/timeClock';
import DateRangePickerBox from '@/app/components/common/DateRangePickerBox';

interface TimeClockStatsProps {
    startDate: Date | null;
    endDate: Date | null;
    onDateRangeChange: (range: { from: Date | null; to: Date | null }) => void;
    payrollCycle?: string;
    headerDetail: TimeClockDetailResponse | null;
    currency: string;
    formatHour: (val: string | number | null | undefined, isPricework?: boolean) => string;
    table: any;
    search: string;
    setSearch: (value: string) => void;
    anchorEl: HTMLElement | null;
    handlePopoverOpen: (event: React.MouseEvent<HTMLElement>) => void;
    handlePopoverClose: () => void;
    userHasRatePermission: boolean;
    amountColumns: string[];
    onAddExpense: () => void;
    onAddWorklog: () => void;
    tableExpanded: boolean;
    onToggleTableExpanded: () => void;
}

const TimeClockStats: React.FC<TimeClockStatsProps> = ({
                                                           startDate,
                                                           endDate,
                                                           onDateRangeChange,
                                                           payrollCycle,
                                                           headerDetail,
                                                           currency,
                                                           formatHour,
                                                           table,
                                                           search,
                                                           setSearch,
                                                           anchorEl,
                                                           handlePopoverOpen,
                                                           handlePopoverClose,
                                                           userHasRatePermission,
                                                           amountColumns,
                                                           onAddExpense,
                                                           onAddWorklog,
                                                           tableExpanded,
                                                           onToggleTableExpanded,
                                                       }) => {
    
    const [addDropDown, setAddDropDown] = useState<null | HTMLElement>(null);
    
    const openAddSelect = Boolean(addDropDown);
    
    const headerDetails = [
        { value: formatHour(headerDetail?.payable_hours), label: 'Payable Hours' },
        // { value: `${currency}${headerDetail?.total_payable_amount || 0}`, label: 'Total Payable Amount' },
    ];
    
    const handleAddClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAddDropDown(event.currentTarget);
    };

    const handleAddClose = () => {
        setAddDropDown(null);
    };

    const handleExpenseClick = () => {
        setAddDropDown(null);
        onAddExpense();
    };

    const handleWorklogClick = () => {
        setAddDropDown(null);
        onAddWorklog();
    };
    
    return (
        <Box
            p={{ xs: 1.5, sm: 2 }}
            sx={{
                borderBottom: '1px solid #e0e0e0',
                display: 'grid',
                gridTemplateColumns: {
                    xs: '1fr',
                    xl: 'minmax(260px, auto) 1fr',
                },
                alignItems: 'center',
                columnGap: { xs: 0, xl: 2 },
                rowGap: { xs: 1.5, xl: 0 },
            }}
        >
            <Box sx={{ width: { xs: '100%', xl: 'auto' }, minWidth: 0 }}>
                <DateRangePickerBox
                    from={startDate}
                    to={endDate}
                    onChange={onDateRangeChange}
                    payrollCycle={payrollCycle}
                />
            </Box>

            <Box sx={{ minWidth: 0 }}>
                <Box
                    sx={{
                        display: 'grid',
                        gridAutoFlow: 'column',
                        gridAutoColumns: 'max-content',
                        alignItems: 'center',
                        justifyContent: { xs: 'space-between', xl: 'end' },
                        columnGap: { xs: 1, sm: 2, xl: 2.5 },
                        width: '100%',
                    }}
                >
                    {headerDetails.map((stat, index) => (
                        <Box
                            key={index}
                            textAlign="center"
                            sx={{ minWidth: { xs: 78, sm: 110 } }}
                        >
                            <Typography
                                sx={{
                                    fontSize: { xs: '0.95rem', sm: '1.1rem' },
                                    fontWeight: 700,
                                    color: '#8b939c',
                                    lineHeight: 1.2,
                                }}
                            >
                                {stat.value}
                            </Typography>
                            <Typography
                                sx={{
                                    fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                    color: 'text.secondary',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {stat.label}
                            </Typography>
                        </Box>
                    ))}

                    <IconButton
                        onClick={onToggleTableExpanded}
                        color="primary"
                        aria-label={tableExpanded ? 'Show work location map' : 'Hide work location map'}
                        sx={{
                            border: '1px solid #d5e0f0',
                            width: 36,
                            height: 36,
                        }}
                    >
                        {tableExpanded ? <IconLayoutSidebarLeftExpand size={20} /> : <IconLayoutSidebarRightExpand size={20} />}
                    </IconButton>

                    <Box sx={{ position: 'relative' }}>
                        <IconButton onClick={handlePopoverOpen} color='primary'>
                            <IconEye />
                        </IconButton>

                        <Popover
                            open={Boolean(anchorEl)}
                            anchorEl={anchorEl}
                            onClose={handlePopoverClose}
                            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                            PaperProps={{
                                sx: {
                                    width: 280,
                                    mt: 1,
                                    p: 1,
                                    borderRadius: 2,
                                    boxShadow: '0 12px 32px rgba(15, 23, 42, 0.14)',
                                    border: '1px solid #e5e7eb',
                                    maxHeight: 'min(420px, calc(100vh - 140px))',
                                    overflow: 'hidden',
                                }
                            }}
                        >
                            <TextField
                                size="small"
                                placeholder="Search columns..."
                                fullWidth
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                sx={{
                                    mb: 1,
                                    '& .MuiInputBase-root': {
                                        borderRadius: 1.5,
                                        backgroundColor: '#fff',
                                    },
                                }}
                            />

                            <Box
                                sx={{
                                    maxHeight: 'calc(min(420px, calc(100vh - 140px)) - 64px)',
                                    overflowY: 'auto',
                                    pr: 0.5,
                                }}
                            >
                                <FormGroup sx={{ gap: 0.25 }}>
                                    {table
                                        .getAllLeafColumns()
                                        .filter((col: any) => {
                                            const excludedColumns = ['conflicts'];
                                            if (excludedColumns.includes(col.id)) return false;

                                            if (!userHasRatePermission && amountColumns.includes(col.id)) return false;

                                            return col.id.toLowerCase().includes(search.toLowerCase());
                                        })
                                        .map((col: any) => (
                                            <FormControlLabel
                                                key={col.id}
                                                control={
                                                    <Checkbox
                                                        size="small"
                                                        checked={col.getIsVisible()}
                                                        onChange={col.getToggleVisibilityHandler()}
                                                        disabled={col.id === 'conflicts'}
                                                    />
                                                }
                                                label={
                                                    col.columnDef.meta?.label ||
                                                    (typeof col.columnDef.header === 'string' && col.columnDef.header.trim() !== ''
                                                        ? col.columnDef.header
                                                        : col.id
                                                            .replace(/([A-Z])/g, ' $1')
                                                            .replace(/^./, (str: string) => str.toUpperCase())
                                                            .trim())
                                                }
                                                sx={{
                                                    m: 0,
                                                    px: 0.75,
                                                    py: 0.375,
                                                    borderRadius: 1.5,
                                                    alignItems: 'flex-start',
                                                    textTransform: 'none',
                                                    '&:hover': {
                                                        backgroundColor: '#f8fafc',
                                                    },
                                                    '& .MuiFormControlLabel-label': {
                                                        fontSize: '14px',
                                                        lineHeight: 1.35,
                                                    },
                                                }}
                                            />
                                        ))}
                                </FormGroup>
                            </Box>
                        </Popover>
                    </Box>

                    <Button
                        size="small"
                        variant="outlined"
                        color="primary"
                        sx={{
                            p: 1,
                            px: 1.5,
                            minWidth: { xs: 82, sm: 92 },
                            whiteSpace: 'nowrap',
                            '&:hover': {
                                backgroundColor: 'transparent',
                                borderColor: 'inherit',
                                boxShadow: 'none',
                                color: '#1e4db7',
                            },
                        }}
                        onClick={handleAddClick}
                        endIcon={openAddSelect ? <IconChevronUp size={20}/> : <IconChevronDown size={20}/>}
                    >
                        <Typography sx={{fontWeight: 600}}>Add</Typography>
                    </Button>
                    <Menu
                        anchorEl={addDropDown}
                        open={openAddSelect}
                        onClose={handleAddClose}
                        anchorOrigin={{vertical: 'bottom', horizontal: 'right'}}
                        transformOrigin={{vertical: 'top', horizontal: 'right'}}
                    >
                        <MenuItem onClick={handleExpenseClick}>Add Expense</MenuItem>
                        <MenuItem onClick={handleWorklogClick}>Add Worklog</MenuItem>
                    </Menu>
                </Box>
            </Box>
        </Box>
    );
};

export default TimeClockStats;

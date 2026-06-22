import React from 'react';
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    Divider,
    IconButton,
    InputAdornment,
    Paper,
    Stack,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tabs,
    Typography,
} from '@mui/material';
import { IconCalendar, IconDownload, IconSearch } from '@tabler/icons-react';
import dayjs from 'dayjs';
import CustomTextField from '@/app/components/forms/theme-elements/CustomTextField';
import FormUserIdentity from '../common/FormUserIdentity';
import FormDetailsDateRangeFilter, { DateRangeFilterValue } from './FormDetailsDateRangeFilter';
import ReadonlySubmissionPreview from './FormDetailsSubmissionPreview';
import { DetailsForm, FormEntry, SubmissionListItem, UserRow } from './formDetailsTypes';

const USER_FILTER_CONTROL_HEIGHT = 48;

const formatTimeTaken = (entry: FormEntry | null) => {
    if (!entry) return '--';

    const source = entry as any;
    const rawValue = source.time_taken ?? source.timeTaken ?? source.duration ?? source.duration_text ?? source.data?.time_taken ?? source.data?.timeTaken;
    if (rawValue !== undefined && rawValue !== null && rawValue !== '') return String(rawValue);

    const seconds = Number(source.duration_seconds ?? source.durationSeconds ?? source.data?.duration_seconds ?? source.data?.durationSeconds);
    if (!Number.isFinite(seconds) || seconds <= 0) return '--';

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);

    if (minutes <= 0) return `${remainingSeconds}s`;
    return `${minutes}m ${remainingSeconds}s`;
};

const FormDetailsListView = ({
                                 form,
                                 tab,
                                 onTabChange,
                                 submissionSearch,
                                 onSubmissionSearchChange,
                                 submissionDateFilter,
                                 onSubmissionDateFilterChange,
                                 filteredSubmissionItems,
                                 selectedEntry,
                                 selectedEntryId,
                                 onSelectEntry,
                                 selectedSubmissionItem,
                                 pdfGeneratingEntryId,
                                 onDownloadSubmissionPdf,
                                 userSearch,
                                 onUserSearchChange,
                                 userDateFilter,
                                 onUserDateFilterChange,
                                 userStatusFilter,
                                 onUserStatusFilterChange,
                                 filteredUsers,
                                 submittedCount,
                                 pendingCount,
                                 progress,
                                 userRowsLength,
                                 onOpenSubmissionViewer,
                             }: {
    form: DetailsForm;
    tab: number;
    onTabChange: (value: number) => void;
    submissionSearch: string;
    onSubmissionSearchChange: (value: string) => void;
    submissionDateFilter: DateRangeFilterValue;
    onSubmissionDateFilterChange: (value: DateRangeFilterValue) => void;
    filteredSubmissionItems: SubmissionListItem[];
    selectedEntry: FormEntry | null;
    selectedEntryId: number | null;
    onSelectEntry: (entryId: number) => void;
    selectedSubmissionItem: SubmissionListItem | null;
    pdfGeneratingEntryId: number | null;
    onDownloadSubmissionPdf: (item: SubmissionListItem | null) => void;
    userSearch: string;
    onUserSearchChange: (value: string) => void;
    userDateFilter: DateRangeFilterValue;
    onUserDateFilterChange: (value: DateRangeFilterValue) => void;
    userStatusFilter: string;
    onUserStatusFilterChange: (value: string) => void;
    filteredUsers: UserRow[];
    submittedCount: number;
    pendingCount: number;
    progress: number;
    userRowsLength: number;
    onOpenSubmissionViewer: (user: UserRow) => void;
}) => (
    <Paper
        elevation={0}
        sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
        }}
    >
        <Tabs
            value={tab}
            onChange={(_, value) => onTabChange(value)}
            sx={{
                px: 2,
                borderBottom: '1px solid',
                borderColor: 'divider',
                flexShrink: 0,
            }}
        >
            <Tab label="Submissions" />
            <Tab label="Users" />
        </Tabs>

        {tab === 0 && (
            <>
                <Box sx={{
                    flex: 1,
                    minHeight: 0,
                    display: 'grid',
                    gridTemplateColumns: {xs: '1fr', lg: '360px 1fr'},
                }}>
                    <Box
                        sx={{
                            minHeight: 0,
                            overflow: 'hidden',
                            borderRight: {lg: '1px solid'},
                            borderColor: {lg: 'divider'},
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        <Stack spacing={1.25} sx={{p: 1.5, borderBottom: '1px solid', borderColor: 'divider'}}>
                            <CustomTextField
                                size="small"
                                placeholder="Search submissions"
                                value={submissionSearch}
                                onChange={(event: React.ChangeEvent<HTMLInputElement>) => onSubmissionSearchChange(event.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <IconSearch size={18}/>
                                        </InputAdornment>
                                    ),
                                }}
                                fullWidth
                            />

                            <Box sx={{'& > button': {width: '100%'}}}>
                                <FormDetailsDateRangeFilter
                                    value={submissionDateFilter}
                                    onChange={onSubmissionDateFilterChange}
                                />
                            </Box>
                        </Stack>

                        <Box sx={{overflow: 'auto', p: 1.5, flex: 1, minHeight: 0}}>
                            <Typography fontWeight={800} mb={1.25}>Submissions {filteredSubmissionItems.length}</Typography>

                            <Stack spacing={1}>
                            {filteredSubmissionItems.length === 0 ? (
                                <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                                    <Typography>No submitted users found.</Typography>
                                </Box>
                            ) : filteredSubmissionItems.map((item) => {
                                const selected = selectedEntry?.id === item.entry.id;

                                return (
                                    <Box
                                        key={item.entry.id}
                                        onClick={() => onSelectEntry(item.entry.id)}
                                        sx={{
                                            p: 1.5,
                                            borderRadius: 2,
                                            cursor: 'pointer',
                                            bgcolor: selected ? '#EAF2FF' : 'transparent',
                                            color: 'inherit',
                                            border: '1px solid',
                                            borderColor: selected ? '#D5E5FF' : 'transparent',
                                            '&:hover': {
                                                bgcolor: selected ? '#EAF2FF' : 'action.hover',
                                            },
                                        }}
                                    >
                                        <Stack direction="row" alignItems="center" spacing={1.25}>
                                            <Box minWidth={0} flex={1}>
                                                <FormUserIdentity
                                                    user={{
                                                        name: item.name,
                                                        user_image: item.avatar,
                                                        trade_name: item.trade_name,
                                                    }}
                                                />
                                            </Box>
                                            <Box textAlign="right" flexShrink={0}>
                                                <Typography variant="caption" display="block">
                                                    {item.submitted_at ? dayjs(item.submitted_at).format('HH:mm') : '--'}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" display="block">
                                                    {item.submitted_at ? dayjs(item.submitted_at).format('DD/MM/YYYY') : ''}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    </Box>
                                );
                            })}
                            </Stack>
                        </Box>
                    </Box>

                    <Box sx={{ minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={2}
                            alignItems={{ xs: 'flex-start', sm: 'center' }}
                            justifyContent="space-between"
                            sx={{ px: 2, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}
                        >
                            <Stack direction="row" spacing={1.5} alignItems="center" minWidth={0}>
                                <Box sx={{minWidth: 0}}>
                                    <FormUserIdentity
                                        user={{
                                            name: filteredSubmissionItems.find((item) => item.entry.id === selectedEntryId)?.name || 'Submission',
                                            user_image: filteredSubmissionItems.find((item) => item.entry.id === selectedEntryId)?.avatar,
                                            trade_name: filteredSubmissionItems.find((item) => item.entry.id === selectedEntryId)?.trade_name,
                                        }}
                                    />
                                </Box>
                            </Stack>

                            <Stack
                                direction={{xs: 'column', sm: 'row'}}
                                spacing={{xs: 1, sm: 4}}
                                alignItems={{xs: 'flex-start', sm: 'center'}}
                                flexShrink={0}
                            >
                                <Stack direction="row" spacing={1} alignItems="flex-start">
                                    <IconCalendar size={18} color="#6B7280"/>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" display="block">
                                            Submitted on
                                        </Typography>
                                        <Typography variant="body2" color="text.primary">
                                            {selectedEntry?.created_at ? dayjs(selectedEntry.created_at).format('DD/MM/YYYY, hh:mm A') : '--'}
                                        </Typography>
                                    </Box>
                                </Stack>

                                <Stack direction="row" spacing={1} alignItems="flex-start">
                                    <span>
                                        <IconButton
                                            disabled={!selectedSubmissionItem || Boolean(pdfGeneratingEntryId)}
                                            onClick={() => onDownloadSubmissionPdf(selectedSubmissionItem)}
                                            sx={{
                                                width: 36,
                                                height: 36,
                                                border: '1px solid',
                                                borderColor: 'divider',
                                                bgcolor: '#fff',
                                            }}
                                        >
                                            {pdfGeneratingEntryId === selectedSubmissionItem?.entry.id ? (
                                                <CircularProgress size={18} thickness={5}/>
                                            ) : (
                                                <IconDownload size={18}/>
                                            )}
                                        </IconButton>
                                    </span>
                                </Stack>
                            </Stack>
                        </Stack>
                        <ReadonlySubmissionPreview form={form} entry={selectedEntry} />
                    </Box>
                </Box>
            </>
        )}

        {tab === 1 && (
            <>
                <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={1.5}
                    alignItems={{ xs: 'stretch', md: 'center' }}
                    sx={{ p: 2, flexWrap: { md: 'wrap' } }}
                >
                    <CustomTextField
                        size="small"
                        placeholder="Search"
                        value={userSearch}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) => onUserSearchChange(event.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <IconSearch size={18} />
                                </InputAdornment>
                            ),
                        }}
                        sx={{
                            width: { xs: '100%', md: 280 },
                            '& .MuiInputBase-root': {
                                height: USER_FILTER_CONTROL_HEIGHT,
                            },
                        }}
                    />

                    <Box
                        sx={{
                            width: { xs: '100%', md: 250 },
                            '& > button': {
                                width: '100%',
                                height: USER_FILTER_CONTROL_HEIGHT,
                                minHeight: USER_FILTER_CONTROL_HEIGHT,
                            },
                        }}
                    >
                        <FormDetailsDateRangeFilter
                            value={userDateFilter}
                            onChange={onUserDateFilterChange}
                        />
                    </Box>

                    <Paper
                        component="button"
                        variant="outlined"
                        onClick={() => onUserStatusFilterChange(userStatusFilter === 'submitted' ? 'all' : 'submitted')}
                        sx={{
                            width: { xs: '100%', md: 220 },
                            height: USER_FILTER_CONTROL_HEIGHT,
                            px: 1.75,
                            py: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            bgcolor: userStatusFilter === 'submitted' ? 'rgba(0, 194, 150, 0.12)' : 'background.paper',
                            borderColor: userStatusFilter === 'submitted' ? 'success.main' : 'divider',
                            borderRadius: 1,
                            cursor: 'pointer',
                            textAlign: 'left',
                            font: 'inherit',
                            color: 'inherit',
                            '&:hover': {
                                bgcolor: 'rgba(0, 194, 150, 0.08)',
                            },
                        }}
                    >
                        <Box minWidth={0}>
                            <Typography color="success.main" fontWeight={800} lineHeight={1.1}>{submittedCount}/{userRowsLength}</Typography>
                            <Typography color="success.main" variant="body2" fontWeight={600} noWrap>Submitted</Typography>
                        </Box>
                    </Paper>

                    <Paper
                        component="button"
                        variant="outlined"
                        onClick={() => onUserStatusFilterChange(userStatusFilter === 'pending' ? 'all' : 'pending')}
                        sx={{
                            width: { xs: '100%', md: 220 },
                            height: USER_FILTER_CONTROL_HEIGHT,
                            px: 1.75,
                            py: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            bgcolor: userStatusFilter === 'pending' ? 'rgba(255, 51, 102, 0.08)' : 'background.paper',
                            borderColor: userStatusFilter === 'pending' ? 'error.main' : 'divider',
                            borderRadius: 1,
                            cursor: 'pointer',
                            textAlign: 'left',
                            font: 'inherit',
                            color: 'inherit',
                            '&:hover': {
                                bgcolor: 'rgba(255, 51, 102, 0.06)',
                            },
                        }}
                    >
                        <Box minWidth={0}>
                            <Typography color="error.main" fontWeight={800} lineHeight={1.1}>{pendingCount}/{userRowsLength}</Typography>
                            <Typography variant="body2" fontWeight={600} noWrap>Did not submit</Typography>
                        </Box>
                    </Paper>
                </Stack>
                
                <Divider />

                <TableContainer sx={{ flex: 1, minHeight: 0 }}>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell>User</TableCell>
                                <TableCell>Assigned Team</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Submissions</TableCell>
                                <TableCell>Last submitted</TableCell>
                                <TableCell align="right"></TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {filteredUsers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6}>
                                        <Box sx={{ p: 4, textAlign: 'center' }}>
                                            <Typography color="text.secondary">No users found.</Typography>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ) : filteredUsers.map((user) => (
                                <TableRow key={`${user.source}-${user.id}`} hover>
                                    <TableCell>
                                        <FormUserIdentity
                                            user={{
                                                name: [user.first_name, user.last_name].filter(Boolean).join(' '),
                                                user_image: user.user_image || user.user_thumb_image,
                                                trade_name: user.trade_name,
                                            }}
                                        />
                                    </TableCell>

                                    <TableCell>
                                        {user.assigned_teams.length ? (
                                            <Stack direction="row" flexWrap="wrap" gap={0.75}>
                                                {user.assigned_teams.map((teamName) => (
                                                    <Chip key={teamName} size="small" label={teamName} />
                                                ))}
                                            </Stack>
                                        ) : '-'}
                                    </TableCell>

                                    <TableCell>
                                        {user.submitted
                                            ? <Chip size="small" label="Submitted" color="success" />
                                            : <Chip size="small" label="Did not submit" color="error" variant="outlined" />
                                        }
                                    </TableCell>

                                    <TableCell>{user.submissions}</TableCell>

                                    <TableCell>{user.last_submitted ? dayjs(user.last_submitted).format('DD/MM/YYYY HH:mm') : '--'}</TableCell>

                                    <TableCell align="right">
                                        <Button
                                            size="small"
                                            disabled={!user.submitted}
                                            onClick={() => onOpenSubmissionViewer(user)}
                                            sx={{
                                                textTransform: 'none',
                                                whiteSpace: 'nowrap',
                                                color: user.submitted ? 'primary.main' : 'text.disabled',
                                            }}
                                        >
                                            View submissions
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </>
        )}
    </Paper>
);

export default FormDetailsListView;

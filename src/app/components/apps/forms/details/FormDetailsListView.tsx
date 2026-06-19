import React from 'react';
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    IconButton,
    InputAdornment,
    LinearProgress,
    MenuItem,
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
    Tooltip,
    Typography,
} from '@mui/material';
import { IconDownload, IconSearch } from '@tabler/icons-react';
import dayjs from 'dayjs';
import CustomTextField from '@/app/components/forms/theme-elements/CustomTextField';
import FormUserIdentity from '../common/FormUserIdentity';
import FormDetailsDateRangeFilter, { DateRangeFilterValue } from './FormDetailsDateRangeFilter';
import ReadonlySubmissionPreview from './FormDetailsSubmissionPreview';
import { DetailsForm, FormEntry, SubmissionListItem, UserRow } from './formDetailsTypes';

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
                <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={1.5}
                    alignItems={{ xs: 'stretch', md: 'center' }}
                    sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}
                >
                    <CustomTextField
                        size="small"
                        placeholder="Search"
                        value={submissionSearch}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) => onSubmissionSearchChange(event.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <IconSearch size={18} />
                                </InputAdornment>
                            ),
                        }}
                        sx={{ width: { xs: '100%', md: 280 } }}
                    />

                    <FormDetailsDateRangeFilter
                        value={submissionDateFilter}
                        onChange={onSubmissionDateFilterChange}
                    />

                    <Typography variant="body2" fontWeight={700}>
                        {filteredSubmissionItems.length} submissions
                    </Typography>

                    <Box flex={1} />
                    <Tooltip title="Download">
                        <span>
                            <IconButton
                                disabled={!selectedSubmissionItem || Boolean(pdfGeneratingEntryId)}
                                onClick={() => onDownloadSubmissionPdf(selectedSubmissionItem)}
                                sx={{ border: '1px solid', borderColor: 'divider' }}
                            >
                                {pdfGeneratingEntryId === selectedSubmissionItem?.entry.id ? (
                                    <CircularProgress size={18} thickness={5} />
                                ) : (
                                    <IconDownload size={18} />
                                )}
                            </IconButton>
                        </span>
                    </Tooltip>
                </Stack>

                <Box sx={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '360px 1fr' } }}>
                    <Box sx={{ overflow: 'auto', p: 2 }}>
                        <Typography fontWeight={800} mb={1.5}>Submissions </Typography>

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
                                            bgcolor: selected ? 'primary.light' : 'transparent',
                                            color: 'inherit',
                                            border: '1px solid',
                                            borderColor: selected ? 'primary.light' : 'transparent',
                                            '&:hover': {
                                                bgcolor: selected ? 'primary.light' : 'action.hover',
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
                                            <Typography variant="caption">
                                                {item.submitted_at ? dayjs(item.submitted_at).format('HH:mm') : '--'}
                                            </Typography>
                                        </Stack>
                                    </Box>
                                );
                            })}
                        </Stack>
                    </Box>

                    <Box sx={{ minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={1}
                            alignItems={{ xs: 'flex-start', sm: 'center' }}
                            justifyContent="space-between"
                            sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}
                        >
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Box sx={{minWidth: 0}}>
                                    <FormUserIdentity
                                        user={{
                                            name: filteredSubmissionItems.find((item) => item.entry.id === selectedEntryId)?.name || 'Submission',
                                            user_image: filteredSubmissionItems.find((item) => item.entry.id === selectedEntryId)?.avatar,
                                            trade_name: filteredSubmissionItems.find((item) => item.entry.id === selectedEntryId)?.trade_name,
                                        }}
                                    />
                                    <Typography variant="caption" color="text.secondary">
                                        {selectedEntry?.created_at ? dayjs(selectedEntry.created_at).format('DD/MM/YYYY HH:mm') : 'No submission selected'}
                                        {selectedEntry ? `, Submission ID: ${selectedEntry.id}` : ''}
                                    </Typography>
                                </Box>
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
                    sx={{ p: 2 }}
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
                        sx={{ width: { xs: '100%', md: 280 } }}
                    />

                    <FormDetailsDateRangeFilter
                        value={userDateFilter}
                        onChange={onUserDateFilterChange}
                    />

                    <CustomTextField
                        select
                        size="small"
                        value={userStatusFilter}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) => onUserStatusFilterChange(event.target.value)}
                        sx={{ width: { xs: '100%', md: 170 } }}
                    >
                        <MenuItem value="all">Status filter</MenuItem>
                        <MenuItem value="submitted">Submitted</MenuItem>
                        <MenuItem value="pending">Did not submit</MenuItem>
                    </CustomTextField>

                    <Typography variant="body2" fontWeight={700} sx={{ ml: { md: 1 } }}>
                        {filteredUsers.length} users
                    </Typography>
                </Stack>

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ px: 2, pb: 2 }}>
                    <Paper
                        variant="outlined"
                        sx={{ flex: 1, p: 2, bgcolor: 'rgba(0, 194, 150, 0.08)', borderColor: 'transparent', borderRadius: 2 }}
                    >
                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                            <Box>
                                <Typography color="success.main" fontWeight={800}>{submittedCount}/{userRowsLength}</Typography>
                                <Typography color="success.main" variant="body2" fontWeight={600}>Submitted</Typography>
                            </Box>

                            <Typography variant="body2" color="text.secondary">{progress}%</Typography>
                        </Stack>

                        <LinearProgress variant="determinate" value={progress} color="success" sx={{ height: 8, borderRadius: 10 }} />
                    </Paper>

                    <Paper variant="outlined" sx={{ width: { xs: '100%', md: 350 }, p: 2, borderRadius: 2 }}>
                        <Typography color="error.main" fontWeight={800}>{pendingCount}/{userRowsLength}</Typography>
                        <Typography variant="body2" fontWeight={600}>Did not submit</Typography>
                    </Paper>
                </Stack>

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

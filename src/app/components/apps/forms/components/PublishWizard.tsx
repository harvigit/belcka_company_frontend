'use client';

import React, {useEffect, useMemo, useState} from 'react';
import {
    Avatar,
    Box,
    Button,
    Checkbox,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControlLabel,
    IconButton,
    InputAdornment,
    MenuItem,
    Paper,
    Radio,
    RadioGroup,
    Slide,
    Stack,
    Typography,
} from '@mui/material';
import {TransitionProps} from '@mui/material/transitions';
import {
    IconArrowForwardUp,
    IconBell,
    IconCalendar,
    IconChevronDown,
    IconHandStop,
    IconMicrophone,
    IconScan,
    IconX,
} from '@tabler/icons-react';
import api from '@/utils/axios';
import CustomTextField from '@/app/components/forms/theme-elements/CustomTextField';
import {PublishUsersOption, PublishTeamsOption, PublishSettings, PublishWizardState} from '../common';
import {initialsFor, normalizeTeamOptions, normalizeUserOptions, toggleOption} from '../common/formBuilderUtils';
import {useSession} from 'next-auth/react';

const DEFAULT_SETTINGS: PublishSettings = {
    publishMode: 'now',
    publishDate: '',
    publishTime: '',
    notifyUsers: false,
    notificationMessage: '',
    showOnFeed: false,
    feedBy: 'app',
    sendReminder: false,
    reminderDate: '',
    reminderTime: '',
    scheduleRemoval: false,
    removalDate: '',
    removalTime: '',
};
const EMPTY_DISABLED_USER_IDS = new Set<string>();

const normalizeState = (state: PublishWizardState | undefined | null): PublishWizardState => ({
    selectedTeams: state?.selectedTeams ?? [],
    selectedUsers: state?.selectedUsers ?? [],
    groupAssignmentMode: state?.groupAssignmentMode ?? 'dynamic',
    settings: state?.settings ? {...DEFAULT_SETTINGS, ...state.settings} : DEFAULT_SETTINGS,
});

const SlideUp = React.forwardRef(function SlideUp(
    props: TransitionProps & { children: React.ReactElement },
    ref: React.Ref<unknown>,
) {
    return <Slide direction="up" ref={ref} {...props} />;
});

const StepIndicator = ({step}: { step: number }) => {
    const labels = ['Assignees', 'Publish settings', 'Summary'];

    return (
        <Stack direction="row" alignItems="center" justifyContent="center" spacing={{xs: 0.75, sm: 2.5}}>
            {labels.map((label, index) => {
                const itemStep = index + 1;
                const active = step === itemStep;
                const complete = step > itemStep;
                return (
                    <React.Fragment key={label}>
                        {index > 0 && (
                            <Box sx={{
                                width: {xs: 34, sm: 72},
                                height: 1,
                                bgcolor: complete || active ? 'primary.main' : 'divider'
                            }}/>
                        )}
                        <Stack alignItems="center" spacing={0.5}>
                            <Box
                                sx={{
                                    width: 18,
                                    height: 18,
                                    borderRadius: '50%',
                                    border: '3px solid',
                                    borderColor: complete || active ? 'primary.main' : 'divider',
                                    bgcolor: complete ? 'primary.main' : 'background.paper',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fff',
                                    fontSize: 10,
                                }}
                            >
                                {complete ? '✓' : ''}
                            </Box>
                            <Typography fontSize={13} color={active || complete ? 'primary.main' : 'text.secondary'}>
                                {label}
                            </Typography>
                        </Stack>
                    </React.Fragment>
                );
            })}
        </Stack>
    );
};

const SelectableUsersListDialog = ({open, title, searchPlaceholder, users, selected, disabledUserIds, onClose, onChange}: {
    open: boolean;
    title: string;
    searchPlaceholder: string;
    users: PublishUsersOption[];
    selected: PublishUsersOption[];
    disabledUserIds?: Set<string>;
    onClose: () => void;
    onChange: (next: PublishUsersOption[]) => void;
}) => {
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (open) setSearch('');
    }, [open]);

    const safeOptions = useMemo(() => users ?? [], [users]);
    const safeSelected = selected ?? [];
    const safeDisabledUserIds = useMemo(
        () => disabledUserIds ?? EMPTY_DISABLED_USER_IDS,
        [disabledUserIds],
    );
    const selectableOptions = useMemo(
        () => safeOptions.filter((option) => !safeDisabledUserIds.has(option.id)),
        [safeDisabledUserIds, safeOptions],
    );

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return safeOptions;
        return safeOptions.filter((option) => option.name.toLowerCase().includes(q));
    }, [safeOptions, search]);

    const allSelected = selectableOptions.length > 0 && selectableOptions.every((option) =>
        safeSelected.some((item) => item.id === option.id),
    );
    const someSelected = selectableOptions.some((option) => safeSelected.some((item) => item.id === option.id));
    const toggleAll = () => {
        if (allSelected) {
            onChange(safeSelected.filter((selectedUser) => safeDisabledUserIds.has(selectedUser.id)));
            return;
        }

        const selectedById = new Map(safeSelected.map((selectedUser) => [selectedUser.id, selectedUser]));
        selectableOptions.forEach((option) => selectedById.set(option.id, option));
        onChange(Array.from(selectedById.values()).filter((option) => !safeDisabledUserIds.has(option.id)));
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                <CustomTextField
                    value={search}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)}
                    placeholder={searchPlaceholder}
                    fullWidth
                    InputProps={{
                        endAdornment: <InputAdornment position="end"><IconScan size={16}/></InputAdornment>,
                    }}
                />
                <Stack spacing={0.5} mt={1.5} sx={{maxHeight: 360, overflow: 'auto'}}>
                    <Stack direction="row" alignItems="center" spacing={1} px={0.5}>
                        <Checkbox
                            size="small"
                            checked={allSelected}
                            indeterminate={someSelected && !allSelected}
                            disabled={selectableOptions.length === 0}
                            onChange={toggleAll}
                        />
                        <Typography fontSize={14}>Select all</Typography>
                    </Stack>
                    {filtered.map((option) => {
                        const checked = safeSelected.some((item) => item.id === option.id);
                        const disabled = safeDisabledUserIds.has(option.id);
                        return (
                            <Stack
                                key={option.id}
                                direction="row"
                                alignItems="center"
                                spacing={1}
                                px={0.5}
                                py={0.75}
                                sx={{
                                    borderRadius: 1,
                                    opacity: disabled ? 0.55 : 1,
                                    '&:hover': {bgcolor: disabled ? 'transparent' : 'action.hover'},
                                }}
                            >
                                <Checkbox
                                    size="small"
                                    checked={checked}
                                    disabled={disabled}
                                    onChange={() => onChange(toggleOption(safeSelected, option))}
                                />
                                <Avatar
                                    src={option.user_thumb_image || undefined}
                                    sx={{width: 26, height: 26, fontSize: 11}}
                                >
                                    {initialsFor(option.name)}
                                </Avatar>
                                <Typography fontSize={14}>{option.name}</Typography>
                            </Stack>
                        );
                    })}
                    {filtered.length === 0 && (
                        <Typography color="text.secondary" fontSize={13} py={2} textAlign="center">
                            No records found.
                        </Typography>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Done</Button>
            </DialogActions>
        </Dialog>
    );
};

const SelectableTeamsListDialog = ({open, title, searchPlaceholder, teams, selected, onClose, onChange}: {
    open: boolean;
    title: string;
    searchPlaceholder: string;
    teams: PublishTeamsOption[];
    selected: PublishTeamsOption[];
    onClose: () => void;
    onChange: (next: PublishTeamsOption[]) => void;
}) => {
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (open) setSearch('');
    }, [open]);

    const safeOptions = useMemo(() => teams ?? [], [teams]);
    const safeSelected = selected ?? [];

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return safeOptions;
        return safeOptions.filter((option) => option.name.toLowerCase().includes(q));
    }, [safeOptions, search]);

    const allSelected = safeOptions.length > 0 && safeSelected.length === safeOptions.length;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                <CustomTextField
                    value={search}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)}
                    placeholder={searchPlaceholder}
                    fullWidth
                    InputProps={{
                        endAdornment: <InputAdornment position="end"><IconScan size={16}/></InputAdornment>,
                    }}
                />
                <Stack spacing={0.5} mt={1.5} sx={{maxHeight: 360, overflow: 'auto'}}>
                    <Stack direction="row" alignItems="center" spacing={1} px={0.5}>
                        <Checkbox
                            size="small"
                            checked={allSelected}
                            indeterminate={safeSelected.length > 0 && !allSelected}
                            onChange={() => onChange(allSelected ? [] : safeOptions)}
                        />
                        <Typography fontSize={14}>Select all</Typography>
                    </Stack>
                    {filtered.map((option) => {
                        const checked = safeSelected.some((item) => item.id === option.id);
                        return (
                            <Stack
                                key={option.id}
                                direction="row"
                                alignItems="center"
                                spacing={1}
                                px={0.5}
                                py={0.75}
                                sx={{borderRadius: 1, '&:hover': {bgcolor: 'action.hover'}}}
                            >
                                <Checkbox
                                    size="small"
                                    checked={checked}
                                    onChange={() => onChange(toggleOption(safeSelected, option))}
                                />
                                <Typography fontSize={14}>{option.name}</Typography>
                            </Stack>
                        );
                    })}
                    {filtered.length === 0 && (
                        <Typography color="text.secondary" fontSize={13} py={2} textAlign="center">
                            No records found.
                        </Typography>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Done</Button>
            </DialogActions>
        </Dialog>
    );
};

const PublishWizard = ({
                           open,
                           saving,
                           state: stateProp,
                           onChange,
                           onBackToEditor,
                           onConfirm,
                       }: {
    open: boolean;
    saving: boolean;
    state: PublishWizardState;
    onChange: (next: PublishWizardState) => void;
    onBackToEditor: () => void;
    onConfirm: () => void;
}) => {
    const session = useSession();
    const authUser = session.data?.user as any;
    const [step, setStep] = useState(1);
    const [users, setUsers] = useState<PublishUsersOption[]>([]);
    const [teams, setTeams] = useState<PublishTeamsOption[]>([]);
    const [userDialogOpen, setUserDialogOpen] = useState(false);
    const [teamDialogOpen, setTeamDialogOpen] = useState(false);
    const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);

    // Normalize state to ensure arrays are always defined
    const state = useMemo(() => normalizeState(stateProp), [stateProp]);

    useEffect(() => {
        if (!open) return;
        setStep(1);
        setCloseConfirmOpen(false);
    }, [open]);

    useEffect(() => {
        if (!open) return;

        const fetchResources = async () => {
            try {
                const [usersRes, teamsRes] = await Promise.all([
                    api.get('user/get-user-lists'),
                    api.get('team/get-team-member-list'),
                ]);
                setUsers(normalizeUserOptions(usersRes.data?.info) ?? []);
                setTeams(normalizeTeamOptions(teamsRes.data?.info) ?? []);
            } catch (error) {
                // silently fail; UI remains functional with empty lists
            }
        };

        fetchResources();
    }, [open]);

    const selectedTeamMemberCount = useMemo(() =>
            state.selectedTeams.reduce((sum, team) => {
                const currentTeam = teams.find((item) => item.id === team.id);
                return sum + Number(currentTeam?.memberCount ?? team.memberCount ?? 0);
            }, 0),
        [teams, state.selectedTeams]);
    const selectedTeamUserIds = useMemo(() => {
        const userIds = new Set<string>();
        state.selectedTeams.forEach((team) => {
            const currentTeam = teams.find((item) => item.id === team.id);
            const teamUserIds = currentTeam?.userIds ?? team.userIds ?? [];
            teamUserIds.forEach((userId) => userIds.add(String(userId)));
        });
        return userIds;
    }, [teams, state.selectedTeams]);

    const totalAssignees = state.selectedUsers.length + selectedTeamMemberCount;
    const selectedTargetCount = state.selectedUsers.length + state.selectedTeams.length;
    const canContinue = step !== 1 || selectedTargetCount > 0;

    const feedByOptions = useMemo(() => {
        const fullName = `${authUser?.first_name || authUser?.firstName || ''} ${authUser?.last_name || authUser?.lastName || ''}`.trim();
        return [
            {value: 'app', label: 'Posted by Belcka'},
            ...(authUser?.id && fullName ? [{value: String(authUser.id), label: `Posted by ${fullName}`}] : []),
        ];
    }, [authUser?.id, authUser?.first_name, authUser?.firstName, authUser?.last_name, authUser?.lastName]);

    const updateSettings = (updates: Partial<PublishSettings>) => {
        onChange({...state, settings: {...state.settings, ...updates}});
    };

    const updateSelectedTeams = (nextTeams: PublishTeamsOption[]) => {
        const nextTeamUserIds = new Set<string>();
        nextTeams.forEach((team) => {
            const currentTeam = teams.find((item) => item.id === team.id);
            const teamUserIds = currentTeam?.userIds ?? team.userIds ?? [];
            teamUserIds.forEach((userId) => nextTeamUserIds.add(String(userId)));
        });

        onChange({
            ...state,
            selectedTeams: nextTeams,
            selectedUsers: state.selectedUsers.filter((user) => !nextTeamUserIds.has(user.id)),
        });
    };

    const requestClose = () => {
        if (saving) return;
        setCloseConfirmOpen(true);
    };

    const discardPublishSettings = () => {
        setCloseConfirmOpen(false);
        onBackToEditor();
    };

    const chipList = (items: PublishUsersOption[] | undefined, onRemove: (id: string) => void) => (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {(items ?? []).map((item) => (
                <Chip
                    key={item.id}
                    label={item.name}
                    avatar={<Avatar src={item.user_thumb_image || undefined}>{initialsFor(item.name)}</Avatar>}
                    onDelete={() => onRemove(item.id)}
                    sx={{bgcolor: '#eaf5ff'}}
                />
            ))}
        </Stack>
    );

    const renderAssignees = () => (
        <Box sx={{width: '100%', maxWidth: 630}}>
            <Stack textAlign="center" spacing={1} mb={4}>
                <Typography fontWeight={700} fontSize={20}>Select assignees</Typography>
                <Typography color="text.secondary">You can select teams, specific users, or both</Typography>
            </Stack>
            <Paper elevation={0}
                   sx={{border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden'}}>
                <Stack spacing={2.5} p={3}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography fontWeight={700}>Smart Teams</Typography>
                        <Button variant="outlined" endIcon={<IconChevronDown size={16}/>}
                                onClick={() => setTeamDialogOpen(true)}>
                            Select Teams
                        </Button>
                    </Stack>
                    {chipList(state.selectedTeams, (id) => onChange({
                        ...state,
                        selectedTeams: state.selectedTeams.filter((team) => team.id !== id),
                    }))}
                    {state.selectedTeams.length > 0 && (
                        <RadioGroup
                            value={state.groupAssignmentMode}
                            onChange={(event) => onChange({
                                ...state,
                                groupAssignmentMode: event.target.value as 'dynamic' | 'fixed'
                            })}
                        >
                            <FormControlLabel
                                value="dynamic" control={<Radio size="small"/>}
                                label={<>
                                    <strong>Dynamic</strong>
                                    <Typography component="span" color="text.secondary">Current and future team members</Typography>
                                </>}
                            />
                            <FormControlLabel
                                value="fixed" control={<Radio size="small"/>}
                                label={<>
                                    <strong>Fixed</strong>
                                    <Typography component="span" color="text.secondary">Only current team members</Typography>
                                </>}
                            />
                        </RadioGroup>
                    )}
                </Stack>
                <Divider/>
                <Stack spacing={2.5} p={3}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography fontWeight={700}>Specific Users</Typography>
                        <Button
                            variant="outlined" 
                            endIcon={<IconChevronDown size={16}/>}
                            onClick={() => setUserDialogOpen(true)}
                        >
                            Select Users
                        </Button>
                    </Stack>
                    
                    {chipList(state.selectedUsers, (id) => onChange({
                        ...state,
                        selectedUsers: state.selectedUsers.filter((user) => user.id !== id),
                    }))}
                </Stack>
            </Paper>
            <Paper elevation={0} sx={{mt: 2, p: 3, borderRadius: 3, bgcolor: '#f5f6f7'}}>
                <Stack direction="row" spacing={2} alignItems="center">
                    <Typography fontSize={26} fontWeight={800}>{totalAssignees}</Typography>
                    <Box>
                        <Typography fontWeight={700}>Total assignees</Typography>
                        {state.groupAssignmentMode === 'dynamic' && state.selectedTeams.length > 0 && (
                            <Typography color="text.secondary" fontSize={13}>The current number may change when Dynamic
                                is selected</Typography>
                        )}
                    </Box>
                </Stack>
            </Paper>
        </Box>
    );

    const renderSettings = () => (
        <Stack spacing={0} sx={{width: '100%', maxWidth: 560}}>
            <Stack direction="row" spacing={2.5} alignItems="flex-start" py={2.25}>
                <Box sx={{
                    width: 42,
                    height: 42,
                    borderRadius: 2,
                    bgcolor: '#b64be4',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                }}>
                    <IconArrowForwardUp size={22}/>
                </Box>
                <Stack spacing={1.5} flex={1}>
                    <RadioGroup
                        row
                        value={state.settings.publishMode}
                        onChange={(event) => updateSettings({publishMode: event.target.value as 'now' | 'schedule'})}
                    >
                        <FormControlLabel value="now" control={<Radio size="small"/>} label="Publish now"/>
                        <FormControlLabel value="schedule" control={<Radio size="small"/>} label="Schedule Publish"/>
                    </RadioGroup>
                    {state.settings.publishMode === 'schedule' && (
                        <Stack direction={{xs: 'column', sm: 'row'}} spacing={1.5} alignItems={{sm: 'center'}}>
                            <Typography>Publish on:</Typography>
                            <CustomTextField type="date" value={state.settings.publishDate}
                                             onChange={(event: React.ChangeEvent<HTMLInputElement>) => updateSettings({publishDate: event.target.value})}/>
                            <Typography>At:</Typography>
                            <CustomTextField type="time" value={state.settings.publishTime}
                                             onChange={(event: React.ChangeEvent<HTMLInputElement>) => updateSettings({publishTime: event.target.value})}/>
                        </Stack>
                    )}
                </Stack>
            </Stack>
            <Divider/>
            <Stack direction="row" spacing={2.5} alignItems="flex-start" py={2.25}>
                <Box sx={{
                    width: 42,
                    height: 42,
                    borderRadius: 2,
                    bgcolor: '#08b8c7',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                }}>
                    <IconBell size={22}/>
                </Box>
                <Stack spacing={1} flex={1}>
                    <FormControlLabel
                        control={<Checkbox checked={state.settings.notifyUsers}
                                           onChange={(event) => updateSettings({notifyUsers: event.target.checked})}/>}
                        label="Notify users via push notification"
                    />
                    <CustomTextField
                        value={state.settings.notificationMessage}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) => updateSettings({notificationMessage: event.target.value})}
                        fullWidth
                        disabled={!state.settings.notifyUsers}
                    />
                </Stack>
            </Stack>
            <Divider/>
            <Stack direction="row" spacing={2.5} alignItems="flex-start" py={2.25}>
                <Box sx={{
                    width: 42,
                    height: 42,
                    borderRadius: 2,
                    bgcolor: '#ff2f6d',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                }}>
                    <IconMicrophone size={22}/>
                </Box>
                <Stack direction={{xs: 'column', sm: 'row'}} spacing={1.5} alignItems={{sm: 'center'}} flex={1}>
                    <FormControlLabel
                        control={<Checkbox checked={state.settings.showOnFeed}
                                           onChange={(event) => updateSettings({showOnFeed: event.target.checked})}/>}
                        label="Show on feed by"
                    />
                    <CustomTextField
                        select
                        value={state.settings.feedBy || 'app'}
                        disabled={!state.settings.showOnFeed}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) => updateSettings({feedBy: event.target.value})}
                        sx={{minWidth: {xs: '100%', sm: 260}}}
                    >
                        {feedByOptions.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                                {option.label}
                            </MenuItem>
                        ))}
                    </CustomTextField>
                </Stack>
            </Stack>
            <Divider/>
            <Stack direction="row" spacing={2.5} alignItems="flex-start" py={2.25}>
                <Box sx={{
                    width: 42,
                    height: 42,
                    borderRadius: 2,
                    bgcolor: '#5a76f0',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                }}>
                    <IconCalendar size={22}/>
                </Box>
                <Stack direction={{xs: 'column', sm: 'row'}} spacing={1.5} alignItems={{sm: 'center'}} flex={1}>
                    <FormControlLabel
                        control={<Checkbox checked={state.settings.sendReminder}
                                           onChange={(event) => updateSettings({sendReminder: event.target.checked})}/>}
                        label="Send a reminder if user didn't view by"
                    />
                    <CustomTextField type="date" value={state.settings.reminderDate}
                                     disabled={!state.settings.sendReminder}
                                     onChange={(event: React.ChangeEvent<HTMLInputElement>) => updateSettings({reminderDate: event.target.value})}/>
                    <Typography>At:</Typography>
                    <CustomTextField type="time" value={state.settings.reminderTime}
                                     disabled={!state.settings.sendReminder}
                                     onChange={(event: React.ChangeEvent<HTMLInputElement>) => updateSettings({reminderTime: event.target.value})}/>
                </Stack>
            </Stack>
            <Divider/>
            <Stack direction="row" spacing={2.5} alignItems="flex-start" py={2.25}>
                <Box sx={{
                    width: 42,
                    height: 42,
                    borderRadius: 2,
                    bgcolor: '#00b894',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                }}>
                    <IconX size={22}/>
                </Box>
                <Stack direction={{xs: 'column', sm: 'row'}} spacing={1.5} alignItems={{sm: 'center'}} flex={1}>
                    <FormControlLabel
                        control={<Checkbox checked={state.settings.scheduleRemoval}
                                           onChange={(event) => updateSettings({scheduleRemoval: event.target.checked})}/>}
                        label="Schedule removal from the app"
                    />
                    {state.settings.scheduleRemoval && (
                        <>
                            <CustomTextField type="date" value={state.settings.removalDate}
                                             onChange={(event: React.ChangeEvent<HTMLInputElement>) => updateSettings({removalDate: event.target.value})}/>
                            <Typography>At:</Typography>
                            <CustomTextField type="time" value={state.settings.removalTime}
                                             onChange={(event: React.ChangeEvent<HTMLInputElement>) => updateSettings({removalTime: event.target.value})}/>
                        </>
                    )}
                </Stack>
            </Stack>
        </Stack>
    );

    const renderSummary = () => (
        <Stack alignItems="center" spacing={2.5} sx={{width: '100%', maxWidth: 480, textAlign: 'center'}}>
            <Box sx={{
                width: 112,
                height: 112,
                borderRadius: '50%',
                bgcolor: '#e8f4ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <IconArrowForwardUp size={52} color="#1294f6"/>
            </Box>
            <Typography fontWeight={800} fontSize={20}>Your form is ready to go!</Typography>
            <Typography color="text.secondary">This form will be assigned to</Typography>
            <Stack direction="row" spacing={1} alignItems="stretch">
                <Stack spacing={1}>
                    <Paper elevation={0} sx={{px: 2, py: 1.5, bgcolor: '#f5f6f7', borderRadius: 2, textAlign: 'left'}}>
                        <Typography fontWeight={700}>{state.selectedTeams.length} Smart teams</Typography>
                        <Typography color="text.secondary" fontSize={12}>
                            {state.groupAssignmentMode === 'dynamic' ? 'Dynamic' : 'Fixed'} team assignment
                        </Typography>
                    </Paper>
                    <Paper elevation={0} sx={{px: 2, py: 1.5, bgcolor: '#f5f6f7', borderRadius: 2, textAlign: 'left'}}>
                        <Typography fontWeight={700}>{state.selectedUsers.length} Specific users</Typography>
                    </Paper>
                </Stack>
                <Paper elevation={0} sx={{
                    px: 4,
                    py: 2,
                    bgcolor: '#f5f6f7',
                    borderRadius: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                }}>
                    <Typography fontSize={34} fontWeight={800}>{totalAssignees}</Typography>
                    <Typography>Current assignees</Typography>
                </Paper>
            </Stack>
            {state.settings.notifyUsers && (
                <Paper elevation={0} sx={{p: 2, bgcolor: '#f5f6f7', borderRadius: 2, width: '100%', textAlign: 'left'}}>
                    <Typography fontWeight={700}>Notification</Typography>
                    <Typography>{state.settings.notificationMessage}</Typography>
                </Paper>
            )}
        </Stack>
    );

    return (
        <Dialog
            open={open}
            onClose={requestClose}
            fullScreen
            TransitionComponent={SlideUp}
            PaperProps={{
                sx: {
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    top: {xs: 0, sm: '40px'},
                    height: {xs: '100dvh', sm: 'calc(100dvh - 40px)'},
                    borderTopLeftRadius: {sm: 16},
                    borderTopRightRadius: {sm: 16},
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    m: 0,
                    maxWidth: '100%',
                    maxHeight: '100%',
                },
            }}
        >
            <Box sx={{height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper'}}>
                <Box sx={{
                    py: 1.75,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    textAlign: 'center',
                    position: 'relative'
                }}>
                    <Typography
                        fontWeight={600}>{step === 1 ? 'Publish By' : step === 2 ? 'Settings' : 'Summary'}</Typography>
                    <IconButton
                        onClick={requestClose}
                        disabled={saving}
                        size="small"
                        sx={{position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)'}}
                    >
                        <IconX size={18}/>
                    </IconButton>
                </Box>
                <Box sx={{
                    flex: 1,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'flex-start',
                    pt: {xs: 3, md: 6},
                    px: 2,
                    overflow: 'auto'
                }}>
                    {step === 1 && renderAssignees()}
                    {step === 2 && renderSettings()}
                    {step === 3 && renderSummary()}
                </Box>
                <Box sx={{
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    px: 2,
                    py: 1.5,
                    display: 'grid',
                    gridTemplateColumns: {xs: '72px 1fr 92px', sm: '120px 1fr 120px'},
                    alignItems: 'center'
                }}>
                    {step > 1 ? (
                        <Button variant="outlined" color="inherit" onClick={() => setStep((cur) => cur - 1)}>
                            Back
                        </Button>
                    ) : <Box/>}
                    <StepIndicator step={step}/>
                    {step < 3 ? (
                        <Button variant="contained" onClick={() => setStep((cur) => cur + 1)} disabled={!canContinue}
                                sx={{justifySelf: 'end'}}>
                            Next
                        </Button>
                    ) : (
                        <Button variant="contained" onClick={onConfirm} disabled={saving} sx={{justifySelf: 'end'}}>
                            {saving ? 'Saving…' : 'Confirm'}
                        </Button>
                    )}
                </Box>
            </Box>

            <SelectableTeamsListDialog
                open={teamDialogOpen}
                title="Select Teams"
                searchPlaceholder="Search teams"
                teams={teams}
                selected={state.selectedTeams}
                onClose={() => setTeamDialogOpen(false)}
                onChange={updateSelectedTeams}
            />

            <SelectableUsersListDialog
                open={userDialogOpen}
                title="Select Users"
                searchPlaceholder="Search users"
                users={users}
                selected={state.selectedUsers}
                disabledUserIds={selectedTeamUserIds}
                onClose={() => setUserDialogOpen(false)}
                onChange={(next) => onChange({
                    ...state,
                    selectedUsers: next.filter((user) => !selectedTeamUserIds.has(user.id)),
                })}
            />

            <Dialog
                open={closeConfirmOpen}
                onClose={() => !saving && setCloseConfirmOpen(false)}
                maxWidth="xs"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 2,
                        p: {xs: 2, sm: 3},
                    },
                }}
            >
                <IconButton
                    aria-label="close"
                    onClick={() => setCloseConfirmOpen(false)}
                    disabled={saving}
                    sx={{
                        position: 'absolute',
                        right: 12,
                        top: 12,
                        color: 'text.secondary',
                    }}
                >
                    <IconX size={18}/>
                </IconButton>
                <DialogContent sx={{textAlign: 'center', px: {xs: 1, sm: 2}, pt: 2.5, pb: 0}}>
                    <Box
                        sx={{
                            width: 72,
                            height: 72,
                            borderRadius: '50%',
                            bgcolor: '#fff1e5',
                            color: '#ff8a1f',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mx: 'auto',
                            mb: 2.5,
                        }}
                    >
                        <IconHandStop size={36}/>
                    </Box>
                    <Typography fontWeight={800} fontSize={20} mb={1.25}>
                        Are you sure?
                    </Typography>
                    <Typography color="text.secondary" fontWeight={500} sx={{maxWidth: 360, mx: 'auto'}}>
                        Publish settings are not saved yet. You can discard them or continue editing.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{justifyContent: 'center', gap: 1, px: 0, pt: 3, pb: 0}}>
                    <Button
                        variant="outlined"
                        color="error"
                        onClick={discardPublishSettings}
                        disabled={saving}
                        sx={{borderRadius: 999, px: 2}}
                    >
                        Discard
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => setCloseConfirmOpen(false)}
                        disabled={saving}
                        sx={{borderRadius: 999, px: 2.5, bgcolor: '#1294f6', '&:hover': {bgcolor: '#0B84DC'}}}
                    >
                        Continue editing
                    </Button>
                </DialogActions>
            </Dialog>
        </Dialog>
    );
};

export default PublishWizard;

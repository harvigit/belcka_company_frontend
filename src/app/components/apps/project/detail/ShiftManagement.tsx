import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {
    Box,
    Typography,
    TextField,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    CircularProgress,
    InputAdornment,
    Button,
    Avatar,
} from '@mui/material';
import {
    IconChevronDown,
    IconChevronRight,
    IconSearch,
    IconStar,
    IconStarFilled,
    IconX,
} from '@tabler/icons-react';
import api from '@/utils/axios';
import CustomCheckbox from '@/app/components/forms/theme-elements/CustomCheckbox';
import toast from 'react-hot-toast';
import {useTranslation} from 'react-i18next';

interface Shift {
    id: number;
    name: string;
    days: string;
    time: string;
    enabled: boolean;
}

interface UserMember {
    id: number;
    name: string;
    email: string;
    image: string;
    avatar?: string;
    user_image?: string;
    user_thumb_image?: string;
    user_id?: number;
    first_name?: string;
    last_name?: string;
}

interface Team {
    team_id: number;
    name: string;
    users: UserMember[];
}

interface ShiftManagementProps {
    projectId: number;
}

const ShiftManagement: React.FC<ShiftManagementProps> = ({projectId}) => {
    const {t} = useTranslation();

    const [teamUserSearch, setTeamUserSearch] = useState('');

    const [shifts, setShifts] = useState<Shift[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [teamsByShift, setTeamsByShift] = useState<Record<number, Team[]>>({});

    const [loadingTeams, setLoadingTeams] = useState(false);
    const [loadingShifts, setLoadingShifts] = useState(false);
    const [saving, setSaving] = useState(false);

    const [shiftAssignments, setShiftAssignments] = useState<
        Record<number, Set<number>>
    >({});

    const [primaryShiftId, setPrimaryShiftId] = useState<number | null>(null);

    const [openTeams, setOpenTeams] = useState<Record<number, boolean>>({});

    const fetchShifts = useCallback(async () => {
        try {
            setLoadingShifts(true);
            const response = await api.get('/setting/get-shift-settings');
            if (response.data?.IsSuccess) {
                const fetchedShifts: Shift[] = response.data.info
                    .filter((shift: any) => Boolean(shift.status))
                    .map((shift: any) => ({
                        id: shift.id,
                        name: shift.name,
                        days: shift.days
                            .filter((d: any) => d.status)
                            .map((d: any) => d.name.substring(0, 3))
                            .join(', '),
                        time: `${shift.start_time} - ${shift.end_time}`,
                        enabled: shift.status,
                    }));
                setShifts(fetchedShifts);
            }
        } catch (error) {
            console.error('Error fetching shifts:', error);
        } finally {
            setLoadingShifts(false);
        }
    }, []);

    const fetchTeams = useCallback(async (projectId: number): Promise<Team[]> => {
        try {
            const res = await api.get(
                `team/get-team-member-list?project_id=${projectId}`,
            );
            if (res.data?.info) {
                return (res.data.info?.data || res.data.info || res.data.data || []) as Team[];
            }
        } catch (error) {
            console.error('Error fetching teams:', error);
        }
        return [];
    }, []);

    const fetchShiftManagement = useCallback(async (projectId: number, shiftList: Shift[]) => {
        const initialAssignments = shiftList.reduce<Record<number, Set<number>>>((acc, shift) => {
            acc[shift.id] = new Set();
            return acc;
        }, {});

        try {
            const res = await api.get('/setting/shift-management', {
                params: {project_id: projectId},
            });

            if (res.data?.IsSuccess) {
                const assignments = res.data.info?.assignments || [];
                assignments.forEach((assignment: any) => {
                    const shiftId = Number(assignment.shift_id);
                    const userId = Number(assignment.user_id);
                    if (assignment.status && initialAssignments[shiftId]) {
                        initialAssignments[shiftId].add(userId);
                    }
                });
                const apiPrimaryShiftId = res.data.info?.primary_shift_id ? Number(res.data.info.primary_shift_id) : null;
                const primaryShiftExists = apiPrimaryShiftId
                    ? shiftList.some((shift) => shift.id === apiPrimaryShiftId)
                    : false;

                setPrimaryShiftId(primaryShiftExists ? apiPrimaryShiftId : null);
            } else {
                setPrimaryShiftId(null);
            }
        } catch (error) {
            console.error('Error fetching shift management:', error);
            setPrimaryShiftId(null);
        }

        setShiftAssignments(initialAssignments);
    }, []);

    useEffect(() => {
        fetchShifts();
    }, [fetchShifts]);

    useEffect(() => {
        const loadTeamsForProject = async () => {
            if (!projectId) {
                setTeams([]);
                setTeamsByShift({});
                setShiftAssignments({});
                setPrimaryShiftId(null);
                return;
            }

            try {
                setLoadingTeams(true);

                const mergedTeamList = await fetchTeams(projectId);
                const nextTeamsByShift = shifts.reduce<Record<number, Team[]>>((acc, shift) => {
                    acc[shift.id] = mergedTeamList;
                    return acc;
                }, {});

                setTeamsByShift(nextTeamsByShift);
                setTeams(mergedTeamList);
                await fetchShiftManagement(projectId, shifts);

                setOpenTeams((prev) => {
                    const next = {...prev};
                    mergedTeamList.forEach((team) => {
                        if (next[team.team_id] === undefined) {
                            next[team.team_id] = true;
                        }
                    });
                    return next;
                });
            } finally {
                setLoadingTeams(false);
            }
        };

        loadTeamsForProject();
    }, [projectId, fetchTeams, fetchShiftManagement, shifts]);

    const toggleTeamOpen = (teamId: number) => {
        setOpenTeams((prev) => ({...prev, [teamId]: !prev[teamId]}));
    };

    const getUserId = (member: UserMember) => Number(member.id || member.user_id);

    const getUserName = (member: UserMember) =>
        member.name ||
        `${member.first_name || ''} ${member.last_name || ''}`.trim() ||
        'Unknown User';

    const getUserAvatar = (member: UserMember) =>
        member.user_thumb_image || member.user_image || member.image || member.avatar;

    const getInitials = (name: string) =>
        name
            .split(' ')
            .filter(Boolean)
            .map((part) => part[0])
            .join('')
            .toUpperCase()
            .slice(0, 2) || 'U';

    const handleToggleUserShift = (shiftId: number, userId: number) => {
        setShiftAssignments((prev) => {
            const currentSet = new Set(prev[shiftId] || []);
            if (currentSet.has(userId)) {
                currentSet.delete(userId);
            } else {
                currentSet.add(userId);
            }
            return {...prev, [shiftId]: currentSet};
        });
    };

    const handleToggleTeamShift = (shiftId: number, team: Team) => {
        const teamUserIds = getEligibleTeamUserIds(shiftId, team);
        if (teamUserIds.length === 0) return;

        setShiftAssignments((prev) => {
            const currentSet = new Set(prev[shiftId] || []);
            const allAssigned = teamUserIds.every((id) => currentSet.has(id));

            if (allAssigned) {
                teamUserIds.forEach((id) => currentSet.delete(id));
            } else {
                teamUserIds.forEach((id) => currentSet.add(id));
            }
            return {...prev, [shiftId]: currentSet};
        });
    };

    const isTeamFullyAssigned = (shiftId: number, team: Team) => {
        const teamUserIds = getEligibleTeamUserIds(shiftId, team);
        if (teamUserIds.length === 0) return false;
        const currentSet = shiftAssignments[shiftId] || new Set();
        return teamUserIds.every((id) => currentSet.has(id));
    };

    const isTeamPartiallyAssigned = (shiftId: number, team: Team) => {
        const teamUserIds = getEligibleTeamUserIds(shiftId, team);
        if (teamUserIds.length === 0) return false;
        const currentSet = shiftAssignments[shiftId] || new Set();
        const assignedCount = teamUserIds.filter((id) => currentSet.has(id)).length;
        return assignedCount > 0 && assignedCount < teamUserIds.length;
    };

    const visibleShifts = shifts;

    const hasProject = Boolean(projectId);

    const filteredTeams = useMemo(() => {
        const searchValue = teamUserSearch.trim().toLowerCase();

        if (!searchValue) {
            return teams;
        }

        return teams.reduce<Team[]>((acc, team) => {
            const teamNameMatches = team.name?.toLowerCase().includes(searchValue);

            if (teamNameMatches) {
                acc.push(team);
                return acc;
            }

            const matchedUsers = (team.users || []).filter((member) =>
                getUserName(member).toLowerCase().includes(searchValue),
            );

            if (matchedUsers.length > 0) {
                acc.push({...team, users: matchedUsers});
            }

            return acc;
        }, []);
    }, [teamUserSearch, teams]);

    const getVisibleEligibleShiftUserIds = (shiftId: number) => {
        const userIds = filteredTeams.flatMap((team) => getEligibleTeamUserIds(shiftId, team));
        return Array.from(new Set(userIds));
    };

    const isShiftFullyAssigned = (shiftId: number) => {
        const userIds = getVisibleEligibleShiftUserIds(shiftId);
        if (userIds.length === 0) return false;
        const currentSet = shiftAssignments[shiftId] || new Set();
        return userIds.every((id) => currentSet.has(id));
    };

    const isShiftPartiallyAssigned = (shiftId: number) => {
        const userIds = getVisibleEligibleShiftUserIds(shiftId);
        if (userIds.length === 0) return false;
        const currentSet = shiftAssignments[shiftId] || new Set();
        const assignedCount = userIds.filter((id) => currentSet.has(id)).length;
        return assignedCount > 0 && assignedCount < userIds.length;
    };

    const handleToggleShiftUsers = (shiftId: number) => {
        const userIds = getVisibleEligibleShiftUserIds(shiftId);
        if (userIds.length === 0) return;

        setShiftAssignments((prev) => {
            const currentSet = new Set(prev[shiftId] || []);
            const allAssigned = userIds.every((id) => currentSet.has(id));

            if (allAssigned) {
                userIds.forEach((id) => currentSet.delete(id));
            } else {
                userIds.forEach((id) => currentSet.add(id));
            }

            return {...prev, [shiftId]: currentSet};
        });
    };

    function getShiftUserIdSet(shiftId: number) {
        return new Set((teamsByShift[shiftId] || []).flatMap((team) => (team.users || []).map(getUserId)));
    }

    function isUserAvailableForShift(shiftId: number, userId: number) {
        return getShiftUserIdSet(shiftId).has(userId);
    }

    function getEligibleTeamUserIds(shiftId: number, team: Team) {
        const availableUserIds = getShiftUserIdSet(shiftId);
        return (team.users || [])
            .map(getUserId)
            .filter((userId) => availableUserIds.has(userId));
    }

    const handleUpdateAssignments = async () => {
        if (saving) return;

        try {
            setSaving(true);

            const assignments = teams.flatMap((team) =>
                (team.users || []).flatMap((userMember) => {
                    const userId = getUserId(userMember);

                    return visibleShifts.map((shift) => ({
                        team_id: team.team_id,
                        user_id: userId,
                        shift_id: shift.id,
                        status: Boolean(shiftAssignments[shift.id]?.has(userId)),
                    }));
                }),
            );

            await api.post('/setting/save-shift-management', {
                project_id: projectId,
                primary_shift_id: primaryShiftId,
                assignments,
            });

            if (projectId) {
                await fetchShiftManagement(projectId, visibleShifts);
            }

            toast.success('Shift assignments updated successfully');
        } catch (error) {
            toast.error('Failed to update shift assignments');
        } finally {
            setSaving(false);
        }
    };

    const renderAssignmentCheckbox = (
        checked: boolean,
        onClick: () => void,
        disabled = false,
        indeterminate = false,
    ) => (
        <CustomCheckbox
            size="small"
            checked={checked}
            indeterminate={indeterminate}
            onChange={onClick}
            disabled={disabled}
            sx={{
                p: 0,
                m: 0,
            }}
        />
    );

    const checkboxCellSx = {
        p: 1,
        textAlign: 'center',
        verticalAlign: 'middle',
    };

    const checkboxCenterSx = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        minHeight: 24,
    };

    const teamColumnWidth = 240;
    const shiftColumnMinWidth = 120;
    const tableMinWidth = teamColumnWidth + visibleShifts.length * shiftColumnMinWidth;
    const shiftHeaderHeight = 66;

    return (
        <Box
            sx={{
                p: {xs: 1.5, md: 2},
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
                height: '100%',
                overflow: 'hidden',
                bgcolor: '#fff',
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    gap: 2,
                    py: 0.5,
                }}
            >
                <Box sx={{width: {xs: '100%', sm: 320}}}>
                    <TextField
                        fullWidth
                        size="small"
                        value={teamUserSearch}
                        onChange={(event) => setTeamUserSearch(event.target.value)}
                        placeholder={t('Search teams or users')}
                        disabled={!hasProject || loadingTeams}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <IconSearch size={18}/>
                                </InputAdornment>
                            ),
                            endAdornment: teamUserSearch ? (
                                <InputAdornment position="end">
                                    <IconButton
                                        size="small"
                                        onClick={() => setTeamUserSearch('')}
                                        edge="end"
                                        sx={{p: 0.25}}
                                    >
                                        <IconX size={16}/>
                                    </IconButton>
                                </InputAdornment>
                            ) : null,
                        }}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 1,
                                bgcolor: '#fff',
                                height: 38,
                                pr: teamUserSearch ? 0.5 : 1,
                            },
                            '& .MuiInputBase-input': {
                                px: 0.5,
                                fontSize: 13,
                            },
                        }}
                    />
                </Box>
                
                <Button
                    variant="contained"
                    onClick={handleUpdateAssignments}
                    disabled={!hasProject || saving || loadingTeams || loadingShifts || visibleShifts.length === 0}
                    startIcon={saving ? <CircularProgress size={14} color="inherit"/> : null}
                    sx={{
                        borderRadius: 1,
                        textTransform: 'none',
                        fontWeight: 600,
                        boxShadow: 'none',
                        minWidth: 100,
                    }}
                >
                    {saving ? t('Saving...') : t('Save Changes')}
                </Button>
            </Box>

            <Box
                sx={{
                    flex: 1,
                    minHeight: 0,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    bgcolor: '#fff',
                }}
            >
                {loadingShifts ? (
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            height: '100%',
                        }}
                    >
                        <CircularProgress/>
                    </Box>
                ) : (
                    <TableContainer
                        sx={{
                            flex: 1,
                            minHeight: 0,
                            overflowX: 'auto',
                            overflowY: 'auto',
                            '&::-webkit-scrollbar': {height: 8, width: 8},
                            '&::-webkit-scrollbar-thumb': {
                                background: '#c1c1c1',
                                borderRadius: 1,
                            },
                            '&::-webkit-scrollbar-track': {background: '#f5f5f5'},
                        }}
                    >
                        <Table
                            stickyHeader
                            size="small"
                            sx={{
                                tableLayout: 'fixed',
                                width: tableMinWidth,
                                minWidth: tableMinWidth,
                                maxWidth: tableMinWidth,
                                '& .MuiTableCell-root': {
                                    fontSize: 14,
                                    borderBottom: '1px solid rgba(224, 224, 224, 1)',
                                    color: '#203040',
                                },
                            }}
                        >
                            <colgroup>
                                <col style={{width: teamColumnWidth}}/>
                                {visibleShifts.map((shift) => (
                                    <col key={`shift-col-${shift.id}`} style={{width: shiftColumnMinWidth}}/>
                                ))}
                            </colgroup>
                            <TableHead>
                                <TableRow>
                                    <TableCell
                                        sx={{
                                            minWidth: teamColumnWidth,
                                            width: teamColumnWidth,
                                            bgcolor: '#f6f7f7',
                                            borderRight: '1px solid rgba(224, 224, 224, 1)',
                                            position: 'sticky',
                                            top: 0,
                                            left: 0,
                                            zIndex: 5,
                                            height: shiftHeaderHeight,
                                            py: 0.75,
                                            px: 1,
                                        }}
                                    >
                                        <Typography sx={{fontSize: 12, fontWeight: 700, color: '#203040'}}>
                                            {t('Team / User')}
                                        </Typography>
                                    </TableCell>
                                    {visibleShifts.length > 0 ? (
                                        visibleShifts.map((shift) => (
                                            <TableCell
                                                key={`shift-header-${shift.id}`}
                                                align="center"
                                                sx={{
                                                    minWidth: shiftColumnMinWidth,
                                                    width: shiftColumnMinWidth,
                                                    bgcolor: '#f6f7f7',
                                                    position: 'sticky',
                                                    top: 0,
                                                    zIndex: 4,
                                                    height: shiftHeaderHeight,
                                                    p: 0.75,
                                                }}
                                            >
                                                <Box 
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: 0.25,
                                                    }}
                                                >
                                                    <Box sx={{minWidth: 0}}>
                                                        <Typography
                                                            title={shift.name}
                                                            sx={{
                                                                px: 0.25,
                                                                py: 0.5,
                                                                fontSize: 12,
                                                                lineHeight: 1.2,
                                                                fontWeight: 700,
                                                                color: '#001532',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                        >
                                                            {shift.name}
                                                        </Typography>
                                                        <Typography sx={{px: 0.25, py: 0.5, fontSize: 10, lineHeight: 1.4, color: '#7D92A9'}}>
                                                            {shift.time || t('any time')}
                                                        </Typography>
                                                    </Box>
                                                    <IconButton
                                                        size="small"
                                                        disableRipple
                                                        disableFocusRipple
                                                        title={
                                                            primaryShiftId === shift.id
                                                                ? t('Primary shift')
                                                                : t('Set as primary shift')
                                                        }
                                                        aria-label={
                                                            primaryShiftId === shift.id
                                                                ? t('shift.isPrimary', {name: shift.name})
                                                                : t('shift.setAsPrimary', {name: shift.name})
                                                        }
                                                        onClick={() =>
                                                            setPrimaryShiftId(shift.id)
                                                        }
                                                        disabled={!hasProject}
                                                        sx={{
                                                            gridColumn: 2,
                                                            justifySelf: 'center',
                                                            p: 0,
                                                            width: 18,
                                                            height: 18,
                                                            minWidth: 18,
                                                            flexShrink: 0,
                                                            bgcolor: 'transparent',
                                                            color: primaryShiftId === shift.id ? '#F5A623' : '#7D92A9',
                                                            '&:hover, &:active, &:focus, &:focus-visible': {
                                                                bgcolor: 'transparent',
                                                            },
                                                            '&.Mui-disabled': {
                                                                bgcolor: 'transparent',
                                                                color: '#B9C5D0',
                                                            },
                                                        }}
                                                    >
                                                        {primaryShiftId === shift.id ? (
                                                            <IconStarFilled size={16}/>
                                                        ) : (
                                                            <IconStar size={16}/>
                                                        )}
                                                    </IconButton>

                                                </Box>
                                            </TableCell>
                                        ))
                                    ) : (
                                        <TableCell
                                            align="center"
                                            sx={{
                                                bgcolor: '#f6f7f7',
                                                position: 'sticky',
                                                top: 0,
                                                zIndex: 4,
                                            }}
                                        >
                                            {t('No active shifts')}
                                        </TableCell>
                                    )}
                                </TableRow>
                                <TableRow>
                                    <TableCell
                                        sx={{
                                            minWidth: teamColumnWidth,
                                            width: teamColumnWidth,
                                            bgcolor: '#f6f7f7',
                                            borderRight: '1px solid rgba(224, 224, 224, 1)',
                                            position: 'sticky',
                                            top: shiftHeaderHeight,
                                            left: 0,
                                            zIndex: 5,
                                            py: 0.75,
                                            px: 1,
                                        }}
                                    >
                                        <Typography sx={{fontSize: 12, fontWeight: 700, color: '#203040'}}>
                                            {t('Select All')}
                                        </Typography>
                                    </TableCell>
                                    {visibleShifts.length > 0 ? (
                                        visibleShifts.map((shift) => (
                                            <TableCell
                                                key={`select-all-${shift.id}`}
                                                align="center"
                                                sx={{
                                                    minWidth: shiftColumnMinWidth,
                                                    width: shiftColumnMinWidth,
                                                    bgcolor: '#f6f7f7',
                                                    position: 'sticky',
                                                    top: shiftHeaderHeight,
                                                    zIndex: 4,
                                                    py: 0.75,
                                                    px: 1,
                                                }}
                                            >
                                                <Box sx={checkboxCenterSx}>
                                                    {renderAssignmentCheckbox(
                                                        isShiftFullyAssigned(shift.id),
                                                        () => handleToggleShiftUsers(shift.id),
                                                        !hasProject || getVisibleEligibleShiftUserIds(shift.id).length === 0,
                                                        isShiftPartiallyAssigned(shift.id),
                                                    )}
                                                </Box>
                                            </TableCell>
                                        ))
                                    ) : (
                                        <TableCell
                                            align="center"
                                            sx={{
                                                bgcolor: '#f6f7f7',
                                                position: 'sticky',
                                                top: shiftHeaderHeight,
                                                zIndex: 4,
                                            }}
                                        />
                                    )}
                                </TableRow>
                            </TableHead>

                            <TableBody>
                                {loadingTeams ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={visibleShifts.length + 1}
                                            align="center"
                                            sx={{py: 5}}
                                        >
                                            <CircularProgress size={24}/>
                                        </TableCell>
                                    </TableRow>
                                ) : !hasProject ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={visibleShifts.length + 1}
                                            align="center"
                                            sx={{py: 5}}
                                        >
                                            <Typography color="text.secondary">
                                                {t('Project details are unavailable.')}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : teams.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={visibleShifts.length + 1}
                                            align="center"
                                            sx={{py: 5}}
                                        >
                                            <Typography color="text.secondary">
                                                {t('No teams assigned to this project.')}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredTeams.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={visibleShifts.length + 1}
                                            align="center"
                                            sx={{py: 5}}
                                        >
                                            <Typography color="text.secondary">
                                                {t('No teams or users match your search.')}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredTeams.map((team) => (
                                        <React.Fragment key={team.team_id}>
                                            <TableRow
                                                sx={{
                                                    bgcolor: '#fff',
                                                    '&:hover td': {bgcolor: '#f9fbfd'},
                                                }}
                                            >
                                                <TableCell
                                                    sx={{
                                                        position: 'sticky',
                                                        left: 0,
                                                        width: teamColumnWidth,
                                                        minWidth: teamColumnWidth,
                                                        bgcolor: '#fff',
                                                        zIndex: 3,
                                                        borderRight: '1px solid rgba(224, 224, 224, 1)',
                                                        p: 1,
                                                    }}
                                                >
                                                    <Box
                                                        sx={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 0.5,
                                                            minWidth: 0,
                                                        }}
                                                    >
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => toggleTeamOpen(team.team_id)}
                                                            sx={{p: 0.25, flexShrink: 0}}
                                                        >
                                                            {openTeams[team.team_id] ? (
                                                                <IconChevronDown size={16}/>
                                                            ) : (
                                                                <IconChevronRight size={16}/>
                                                            )}
                                                        </IconButton>
                                                        <Typography
                                                            title={team.name}
                                                            sx={{
                                                                minWidth: 0,
                                                                fontSize: 13,
                                                                color: '#203040',
                                                                fontWeight: 700,
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                        >
                                                            {team.name}
                                                        </Typography>
                                                        <Typography
                                                            sx={{
                                                                fontSize: 11,
                                                                color: '#7D92A9',
                                                                ml: 'auto',
                                                                flexShrink: 0,
                                                            }}
                                                        >
                                                            {team.users?.length || 0}
                                                        </Typography>
                                                    </Box>
                                                </TableCell>
                                                {visibleShifts.map((shift) => (
                                                    <TableCell
                                                        key={`team-${team.team_id}-${shift.id}`}
                                                        align="center"
                                                        sx={checkboxCellSx}
                                                    >
                                                        <Box sx={{...checkboxCenterSx, gap: 1.5}}>
                                                            {renderAssignmentCheckbox(
                                                                isTeamFullyAssigned(shift.id, team),
                                                                () => handleToggleTeamShift(shift.id, team),
                                                                !hasProject || getEligibleTeamUserIds(shift.id, team).length === 0,
                                                                isTeamPartiallyAssigned(shift.id, team),
                                                            )}
                                                        </Box>
                                                    </TableCell>
                                                ))}
                                            </TableRow>

                                            {openTeams[team.team_id] &&
                                                team.users?.map((userMember: UserMember) => {
                                                    const userId = getUserId(userMember);
                                                    const userName = getUserName(userMember);

                                                    return (
                                                        <TableRow
                                                            key={`user-${team.team_id}-${userId}`}
                                                            sx={{
                                                                bgcolor: '#fff',
                                                                '&:hover td': {bgcolor: '#f9fbfd'},
                                                            }}
                                                        >
                                                            <TableCell
                                                                sx={{
                                                                    position: 'sticky',
                                                                    left: 0,
                                                                    width: teamColumnWidth,
                                                                    minWidth: teamColumnWidth,
                                                                    bgcolor: 'inherit',
                                                                    zIndex: 2,
                                                                    borderRight: '1px solid rgba(224, 224, 224, 1)',
                                                                    py: 0.75,
                                                                    pl: 3.5,
                                                                    pr: 1,
                                                                }}
                                                            >
                                                                <Box sx={{display: 'flex', alignItems: 'center', gap: 1, minWidth: 0}}>
                                                                    <Avatar
                                                                        src={getUserAvatar(userMember) || ''}
                                                                        sx={{width: 22, height: 22, fontSize: 10, flexShrink: 0}}
                                                                    >
                                                                        {getInitials(userName)}
                                                                    </Avatar>
                                                                    <Typography
                                                                        title={userName}
                                                                        sx={{
                                                                            minWidth: 0,
                                                                            fontSize: 13,
                                                                            color: '#203040',
                                                                            overflow: 'hidden',
                                                                            textOverflow: 'ellipsis',
                                                                            whiteSpace: 'nowrap',
                                                                        }}
                                                                    >
                                                                        {userName}
                                                                    </Typography>
                                                                </Box>
                                                            </TableCell>
                                                            {visibleShifts.map((shift) => (
                                                                <TableCell
                                                                    key={`user-${team.team_id}-${userId}-${shift.id}`}
                                                                    align="center"
                                                                    sx={checkboxCellSx}
                                                                >
                                                                    <Box sx={{...checkboxCenterSx, gap: 1.5}}>
                                                                        {renderAssignmentCheckbox(
                                                                            shiftAssignments[shift.id]?.has(userId) || false,
                                                                            () => handleToggleUserShift(shift.id, userId),
                                                                            !hasProject || !isUserAvailableForShift(shift.id, userId),
                                                                        )}
                                                                    </Box>
                                                                </TableCell>
                                                            ))}
                                                        </TableRow>
                                                    );
                                                })}
                                        </React.Fragment>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Box>
        </Box>
    );
};

export default ShiftManagement;

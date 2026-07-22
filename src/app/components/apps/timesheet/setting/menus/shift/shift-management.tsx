import React, {useState, useEffect, useCallback} from 'react';
import {
    Box,
    Typography,
    TextField,
    Autocomplete,
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
    IconX,
} from '@tabler/icons-react';
import api from '@/utils/axios';
import {useSession} from 'next-auth/react';
import {User} from 'next-auth';
import CustomCheckbox from '@/app/components/forms/theme-elements/CustomCheckbox';
import toast from 'react-hot-toast';

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

interface Project {
    id: number;
    name: string;
}

const ShiftManagement = () => {
    const {data: session} = useSession();
    const user = session?.user as User & { company_id?: number | null };

    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);

    const [shifts, setShifts] = useState<Shift[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [teamsByShift, setTeamsByShift] = useState<Record<number, Team[]>>({});

    const [loadingProjects, setLoadingProjects] = useState(false);
    const [loadingTeams, setLoadingTeams] = useState(false);
    const [loadingShifts, setLoadingShifts] = useState(false);
    const [saving, setSaving] = useState(false);

    const [shiftAssignments, setShiftAssignments] = useState<
        Record<number, Set<number>>
    >({});

    const [primaryShiftId, setPrimaryShiftId] = useState<number | null>(null);
    const [primaryShifts, setPrimaryShifts] = useState<Record<number, number>>({});

    const [openTeams, setOpenTeams] = useState<Record<number, boolean>>({});

    const fetchProjects = useCallback(async () => {
        try {
            setLoadingProjects(true);
            const res = await api.get(`project/get?company_id=${user?.company_id}`);
            if (res.data?.info) {
                setProjects(res.data.info);
            }
        } catch (error) {
            console.error('Error fetching projects:', error);
        } finally {
            setLoadingProjects(false);
        }
    }, [user?.company_id]);

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

                const initialAssignments: Record<number, Set<number>> = {};
                for (const shift of fetchedShifts) {
                    try {
                        const assignedRes = await api.get(
                            `/setting/shift-users/${shift.id}`,
                        );
                        const assignedIds = (assignedRes.data?.info || []).map((u: any) =>
                            Number(u.id ?? u.user_id),
                        );
                        initialAssignments[shift.id] = new Set(assignedIds);
                    } catch (e) {
                        initialAssignments[shift.id] = new Set();
                    }
                }
                setShiftAssignments(initialAssignments);
            }
        } catch (error) {
            console.error('Error fetching shifts:', error);
        } finally {
            setLoadingShifts(false);
        }
    }, []);

    const fetchTeams = useCallback(async (projectId: number) => {
        try {
            const res = await api.get(
                `team/get-team-member-list?project_id=${projectId}`,
            );
            if (res.data?.info) {
                return res.data.info?.data || res.data.info || res.data.data || [];
            }
        } catch (error) {
            console.error('Error fetching teams:', error);
        }
        return [];
    }, []);

    useEffect(() => {
        if (user?.company_id) {
            fetchProjects();
            fetchShifts();
        }
    }, [user?.company_id, fetchProjects, fetchShifts]);

    useEffect(() => {
        const loadTeamsForSelectedProject = async () => {
            if (!selectedProject) {
                setTeams([]);
                setTeamsByShift({});
                return;
            }

            try {
                setLoadingTeams(true);

                const mergedTeamList = await fetchTeams(selectedProject.id);
                const nextTeamsByShift = shifts.reduce<Record<number, Team[]>>((acc, shift) => {
                    acc[shift.id] = mergedTeamList;
                    return acc;
                }, {});

                setTeamsByShift(nextTeamsByShift);
                setTeams(mergedTeamList);

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

        loadTeamsForSelectedProject();
    }, [selectedProject, fetchTeams, shifts]);

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

    const hasSelectedProject = Boolean(selectedProject);

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

            await Promise.all(
                visibleShifts
                    .map((shift) =>
                        api.post('/setting/assign-shift-users', {
                            shift_id: shift.id,
                            user_ids: Array.from(shiftAssignments[shift.id] || []),
                            project_id: selectedProject?.id,
                        }),
                    ),
            );

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

    return (
        <Box
            sx={{
                p: 2.5,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                height: '100%',
                overflow: 'hidden',
                bgcolor: '#fff',
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 2,
                    borderRadius: 3,
                    bgcolor: '#fff',
                    boxShadow: '0 4px 18px rgba(0,0,0,0.04)',
                }}
            >
                <Box sx={{width: {xs: '100%', sm: 360}}}>
                    <Typography sx={{fontSize: 12, color: '#7D92A9', fontWeight: 600, mb: 1}}>
                        Select Project
                    </Typography>
                    <Autocomplete
                        size="small"
                        options={projects}
                        getOptionLabel={(option) => option.name}
                        value={selectedProject}
                        onChange={(_, newValue) => setSelectedProject(newValue)}
                        loading={loadingProjects}
                        clearIcon={<IconX size={16}/>}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                placeholder={selectedProject ? '' : 'Search by project'}
                                size="small"
                                InputProps={{
                                    ...params.InputProps,
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <IconSearch size={18}/>
                                        </InputAdornment>
                                    ),
                                    endAdornment: (
                                        <React.Fragment>
                                            {loadingProjects ? (
                                                <CircularProgress color="inherit" size={18}/>
                                            ) : null}
                                            {params.InputProps.endAdornment}
                                        </React.Fragment>
                                    ),
                                }}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 1,
                                        bgcolor: '#fff',
                                    },
                                }}
                            />
                        )}
                    />
                </Box>
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
                                width: Math.max(960, 350 + visibleShifts.length * 160),
                                minWidth: Math.max(960, 350 + visibleShifts.length * 160),
                                '& .MuiTableCell-root': {
                                    fontSize: 14,
                                    borderBottom: '1px solid rgba(224, 224, 224, 1)',
                                    color: '#203040',
                                },
                            }}
                        >
                            <TableHead>
                                <TableRow>
                                    <TableCell
                                        sx={{
                                            minWidth: 350,
                                            width: 350,
                                            bgcolor: '#f6f7f7',
                                            borderRight: '1px solid rgba(224, 224, 224, 1)',
                                            position: 'sticky',
                                            top: 0,
                                            left: 0,
                                            zIndex: 5,
                                            p: 1.5,
                                        }}
                                    >
                                        <Typography sx={{fontSize: 14, fontWeight: 700, color: '#203040'}}>
                                            Teams & Users
                                        </Typography>
                                    </TableCell>
                                    {visibleShifts.length > 0 ? (
                                        visibleShifts.map((shift) => (
                                            <TableCell
                                                key={`shift-header-${shift.id}`}
                                                align="center"
                                                sx={{
                                                    minWidth: 160,
                                                    width: 160,
                                                    maxWidth: 160,
                                                    bgcolor: '#f6f7f7',
                                                    position: 'sticky',
                                                    top: 0,
                                                    zIndex: 4,
                                                    p: 1,
                                                }}
                                            >
                                                <Typography sx={{fontSize: 13, lineHeight: 1.2, fontWeight: 700, color: '#001532'}}>
                                                    {shift.name}
                                                </Typography>
                                                <Typography sx={{fontSize: 11, lineHeight: 1.6, color: '#7D92A9'}}>
                                                    {shift.time || 'any time'}
                                                </Typography>
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
                                            No active shifts
                                        </TableCell>
                                    )}
                                </TableRow>
                            </TableHead>

                            <TableBody>
                                {visibleShifts.length > 0 && (
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
                                                width: 350,
                                                minWidth: 350,
                                                bgcolor: '#fff',
                                                zIndex: 3,
                                                borderRight: '1px solid rgba(224, 224, 224, 1)',
                                                p: 1.5,
                                            }}
                                        >
                                            <Typography sx={{fontSize: 14, color: '#203040', fontWeight: 600}}>
                                                Primary
                                            </Typography>
                                        </TableCell>
                                        {visibleShifts.map((shift) => (
                                            <TableCell
                                                key={`primary-row-${shift.id}`}
                                                align="center"
                                                sx={checkboxCellSx}
                                            >
                                                <Box sx={checkboxCenterSx}>
                                                    {renderAssignmentCheckbox(
                                                        primaryShiftId === shift.id,
                                                        () =>
                                                            setPrimaryShiftId((current) =>
                                                                current === shift.id ? null : shift.id,
                                                            ),
                                                        !selectedProject,
                                                    )}
                                                </Box>
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                )}

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
                                ) : !hasSelectedProject ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={visibleShifts.length + 1}
                                            align="center"
                                            sx={{py: 5}}
                                        >
                                            <Typography color="text.secondary">
                                                Select a project to manage teams and users.
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
                                                No teams assigned to this project.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    teams.map((team) => (
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
                                                        width: 350,
                                                        minWidth: 350,
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
                                                            gap: 1,
                                                        }}
                                                    >
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => toggleTeamOpen(team.team_id)}
                                                            sx={{p: 0.25}}
                                                        >
                                                            {openTeams[team.team_id] ? (
                                                                <IconChevronDown size={16}/>
                                                            ) : (
                                                                <IconChevronRight size={16}/>
                                                            )}
                                                        </IconButton>
                                                        <Typography
                                                            sx={{fontSize: 14, color: '#203040', fontWeight: 700}}
                                                        >
                                                            {team.name}
                                                        </Typography>
                                                        <Typography
                                                            sx={{fontSize: 12, color: '#7D92A9', ml: 'auto', pr: 1}}
                                                        >
                                                            {team.users?.length || 0} members
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
                                                                !selectedProject || getEligibleTeamUserIds(shift.id, team).length === 0,
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
                                                                    width: 350,
                                                                    minWidth: 350,
                                                                    bgcolor: 'inherit',
                                                                    zIndex: 2,
                                                                    borderRight: '1px solid rgba(224, 224, 224, 1)',
                                                                    py: 0.75,
                                                                    pl: 6,
                                                                    pr: 1,
                                                                }}
                                                            >
                                                                <Box sx={{display: 'flex', alignItems: 'center', gap: 1.5}}>
                                                                    <Avatar
                                                                        src={getUserAvatar(userMember) || ''}
                                                                        sx={{width: 24, height: 24, fontSize: 11}}
                                                                    >
                                                                        {getInitials(userName)}
                                                                    </Avatar>
                                                                    <Typography sx={{fontSize: 14, color: '#203040'}}>
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
                                                                            !selectedProject || !isUserAvailableForShift(shift.id, userId),
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

            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: 2,
                    p: 2,
                    borderRadius: 3,
                    bgcolor: '#fff',
                    boxShadow: '0 4px 18px rgba(0,0,0,0.04)',
                }}
            >
                <Button
                    variant="contained"
                    onClick={handleUpdateAssignments}
                    disabled={!hasSelectedProject || saving || loadingTeams || loadingShifts || visibleShifts.length === 0}
                    startIcon={saving ? <CircularProgress size={14} color="inherit"/> : null}
                    sx={{
                        borderRadius: '10px',
                        textTransform: 'none',
                        fontWeight: 600,
                        boxShadow: 'none',
                        minWidth: 100,
                    }}
                >
                    {saving ? 'Saving...' : 'Save Changes'}
                </Button>
            </Box>
        </Box>
    );
};

export default ShiftManagement;

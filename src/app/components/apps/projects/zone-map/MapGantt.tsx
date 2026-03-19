'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Avatar,
    Box,
    Button,
    Chip,
    Collapse,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Drawer,
    FormControl,
    IconButton,
    InputAdornment,
    MenuItem,
    Paper,
    Select,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Tabs,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import {
    Circle,
    GoogleMap,
    Marker,
    OverlayView,
    Polygon,
    Polyline,
    useJsApiLoader,
} from '@react-google-maps/api';
import {
    IconChevronDown,
    IconChevronUp,
    IconEdit,
    IconEye,
    IconEyeOff,
    IconFilter,
    IconMapPin,
    IconSearch,
    IconTrash,
    IconUsers,
    IconX,
} from '@tabler/icons-react';
import { AxiosResponse } from 'axios';
import { User } from 'next-auth';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import api from '@/utils/axios';

import AddZone from './AddZone';
import EditZone from './EditZone';
import AddZoneGroup from './AddZoneGroup';
import EditZoneGroup from './EditZoneGroup';

type Props = {
    open: boolean;
    onClose: () => void;
    onUpdate: () => void;
    projectId: number | null;
    companyId: number | null;
};

const GOOGLE_MAP_LIBRARIES = ['places', 'drawing'];
const LONDON_CENTER = { lat: 51.5074, lng: -0.1278 };
const DEFAULT_ZOOM = 18;

const drawerPaperSx = {
    width: 420,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#fff',
};

const formatDateTime = (dtStr: string | null | undefined): string => {
    if (!dtStr) return '';
    try {
        const [datePart, timePart] = dtStr.split(' ');
        const [dd, MM, yyyy] = datePart.split('/');
        const [hh, mm] = timePart.split(':');
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December',
        ];
        return `${Number(dd)} ${monthNames[Number(MM) - 1] ?? ''} ${yyyy} ${hh}:${mm}`;
    } catch {
        return dtStr;
    }
};

const groupByTeam = (users: any[]): Record<string, any[]> => {
    const groups: Record<string, any[]> = {};
    for (const u of users) {
        const key = u.team_name?.trim() || 'No Team';
        if (!groups[key]) groups[key] = [];
        groups[key].push(u);
    }
    return Object.fromEntries(Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)));
};

const flyToZone = (map: google.maps.Map, zone: any) => {
    if (zone.type === 'circle') {
        map.panTo({ lat: Number(zone.latitude), lng: Number(zone.longitude) });
        map.setZoom(DEFAULT_ZOOM);
    } else if (Array.isArray(zone.coordinates) && zone.coordinates.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        zone.coordinates.forEach((pt: any) =>
            bounds.extend({ lat: Number(pt.lat), lng: Number(pt.lng) }),
        );
        map.fitBounds(bounds);
    }
};

const buildBoundsFromZones = (zones: any[]): google.maps.LatLngBounds | null => {
    if (!zones.length) return null;
    const bounds = new google.maps.LatLngBounds();
    zones.forEach((zone) => {
        if (zone.type === 'circle') {
            bounds.extend({ lat: Number(zone.latitude), lng: Number(zone.longitude) });
        } else if (
            (zone.type === 'polygon' || zone.type === 'polyline') &&
            Array.isArray(zone.coordinates) &&
            zone.coordinates.length > 0
        ) {
            zone.coordinates.forEach((pt: any) =>
                bounds.extend({ lat: Number(pt.lat), lng: Number(pt.lng) }),
            );
        }
    });
    return bounds;
};

const spreadOverlappingUsers = (users: any[]): any[] => {
    const groups: Record<string, any[]> = {};
    for (const u of users) {
        const key = `${Number(u.latitude).toFixed(6)},${Number(u.longitude).toFixed(6)}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(u);
    }

    const result: any[] = [];
    const OFFSET = 0.00008;

    for (const group of Object.values(groups)) {
        if (group.length === 1) {
            result.push(group[0]);
        } else {
            group.forEach((u, i) => {
                const angle = (2 * Math.PI * i) / group.length;
                result.push({
                    ...u,
                    latitude: (Number(u.latitude) + OFFSET * Math.sin(angle)).toString(),
                    longitude: (Number(u.longitude) + OFFSET * Math.cos(angle)).toString(),
                    _originalLatitude: u.latitude,
                    _originalLongitude: u.longitude,
                });
            });
        }
    }

    return result;
};

export default function MapGantt({ open, onClose, onUpdate, projectId, companyId }: Props) {
    const session = useSession();
    const user = session.data?.user as User & { company_id?: number | null };

    const mainMapRef = useRef<google.maps.Map | null>(null);

    // Map / zones state
    const [geofences, setGeofences] = useState<any[]>([]);
    const [selected, setSelected] = useState<any | null>(null);
    const [addresses, setAddresses] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState(0);
    const [projectList, setProjectList] = useState<any[]>([]);
    const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
    const [hiddenZoneIds, setHiddenZoneIds] = useState<Set<number>>(new Set());

    // Drawer open states
    const [addZoneOpen, setAddZoneOpen] = useState(false);
    const [addGroupOpen, setAddGroupOpen] = useState(false);

    // Delete dialog
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    // Zones sidebar
    const [zonesDrawerOpen, setZonesDrawerOpen] = useState(false);
    const [zonesList, setZonesList] = useState<any[]>([]);
    const [zonesSearch, setZonesSearch] = useState('');
    const [zonesLoading, setZonesLoading] = useState(false);

    // Zone Groups
    const [zoneGroups, setZoneGroups] = useState<any[]>([]);
    const [editingGroup, setEditingGroup] = useState<any | null>(null);
    const [openGroupKey, setOpenGroupKey] = useState<string | null>(null);

    // Staff sidebar
    const [usersDrawerOpen, setUsersDrawerOpen] = useState(false);
    const [usersSearch, setUsersSearch] = useState('');
    const [userLocations, setUserLocations] = useState<any[]>([]);
    const [userLocationsLoading, setUserLocationsLoading] = useState(false);
    const [usersOnMapVisible] = useState(true);
    const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({});

    const { isLoaded } = useJsApiLoader({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!,
        libraries: GOOGLE_MAP_LIBRARIES as any,
    });
    
    const toggleZoneVisibility = useCallback((id: number) => {
        setHiddenZoneIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const toggleGroupVisibility = useCallback((zoneIds: number[]) => {
        setHiddenZoneIds((prev) => {
            const next = new Set(prev);
            const allHidden = zoneIds.every((id) => next.has(id));
            if (allHidden) {
                zoneIds.forEach((id) => next.delete(id));
            } else {
                zoneIds.forEach((id) => next.add(id));
            }
            return next;
        });
    }, []);

    const toggleGroupCollapse = (key: string) => {
        setOpenGroupKey((prev) => (prev === key ? null : key));
    };
    
    const fetchProjects = async () => {
        try {
            const res = await api.get(`project/get?company_id=${companyId}`);
            if (res.data?.info) setProjectList(res.data.info);
        } catch (err) {
            console.error('Failed to fetch projects', err);
        }
    };

    const fetchProjectDetail = async (pid: number | null) => {
        if (!pid) return;
        try {
            if (activeTab === 0) {
                const res = await api.get('work-zone/get', {
                    params: { company_id: user.company_id, is_project: true, project_id: pid },
                });
                setGeofences(res.data.info ?? []);
            } else {
                const res: AxiosResponse<any> = await api.get('address/zones', {
                    params: { project_id: pid },
                });
                setGeofences(res.data.info?.zones ?? []);
            }
        } catch (err) {
            console.error('Geofence fetch error:', err);
        }
    };

    const loadAddressList = async () => {
        try {
            const res = await api.get('address/get', { params: { project_id: activeProjectId } });
            setAddresses(res.data.info || []);
        } catch (err) {
            console.error('Address list fetch error:', err);
        }
    };

    const fetchZonesList = async () => {
        setZonesLoading(true);
        try {
            if (activeTab === 0) {
                const res = await api.get('work-zone/get', {
                    params: { company_id: user.company_id, is_project: true, project_id: activeProjectId },
                });
                setZonesList(res.data.info ?? []);
            } else {
                const res = await api.get('address/zones', { params: { project_id: activeProjectId } });
                setZonesList(res.data.info?.zones ?? []);
            }
        } catch (err) {
            console.error('Zones list fetch error:', err);
        }
        setZonesLoading(false);
    };

    const fetchZoneGroups = async () => {
        if (!user?.company_id) return;
        try {
            const res = await api.get('work-zone/get-groups', {
                params: { company_id: user.company_id },
            });
            if (res.data?.IsSuccess) {
                setZoneGroups(res.data.info ?? []);
            }
        } catch (err) {
            console.error('Zone groups fetch error:', err);
        }
    };

    const fetchUserLocations = async () => {
        setUserLocationsLoading(true);
        try {
            const res = await api.get('user-location/get-user-locations');
            if (res.data?.IsSuccess) {
                const data: any[] = res.data.info ?? [];
                setUserLocations(data);
                const teams = groupByTeam(data);
                const initial: Record<string, boolean> = {};
                Object.keys(teams).forEach((t) => { initial[t] = true; });
                setExpandedTeams(initial);
            }
        } catch (err) {
            console.error('Failed to fetch user locations', err);
        }
        setUserLocationsLoading(false);
    };

    const handleDeleteZone = async () => {
        if (!deleteId) return;
        try {
            const res = await api.delete(`work-zone/delete?id=${deleteId}`);
            if (res.data.IsSuccess) {
                toast.success(res.data.message);
                onUpdate?.();
                setGeofences((prev) => prev.filter((z) => z.id !== deleteId));
                setDeleteConfirmOpen(false);
                setDeleteId(null);
                fetchProjectDetail(activeProjectId!);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleTabChange = (_: any, newValue: number) => {
        setActiveTab(newValue);
        setSelected(null);
    };

    const handleOpenZones = () => {
        setZonesDrawerOpen(true);
        fetchZonesList();
        fetchZoneGroups();
    };
    const handleOpenUsers = () => {
        setUsersDrawerOpen(true);
        fetchUserLocations();
    };
    const handleCloseZones = () => {
        setZonesDrawerOpen(false);
        setZonesSearch('');
    };
    const handleCloseUsers = () => {
        setUsersDrawerOpen(false);
        setUsersSearch('');
    };
    const toggleTeam = (teamName: string) => {
        setExpandedTeams((prev) => ({ ...prev, [teamName]: !prev[teamName] }));
    };
    
    useEffect(() => {
        if (addZoneOpen || selected?.mode === 'edit') loadAddressList();
    }, [addZoneOpen, selected]);

    useEffect(() => {
        if (open) {
            fetchProjects();
            setActiveProjectId(projectId);
            fetchProjectDetail(projectId);
            fetchUserLocations();
            fetchZoneGroups();
        }
    }, [open]);

    useEffect(() => {
        if (open && activeProjectId) {
            fetchProjectDetail(activeProjectId);
        }
    }, [activeTab]);
    
    const filterData = useMemo(() => {
        const s = searchTerm.trim().toLowerCase();
        if (!s) return geofences;
        return geofences.filter(
            (item) =>
                item.address?.toLowerCase().includes(s) ||
                item.address_name?.toLowerCase().includes(s) ||
                item.name?.toLowerCase().includes(s),
        );
    }, [geofences, searchTerm]);

    const visibleZones = useMemo(
        () => filterData.filter((z) => !hiddenZoneIds.has(z.id)),
        [filterData, hiddenZoneIds],
    );

    const filteredUserLocations = useMemo(() => {
        const s = usersSearch.trim().toLowerCase();
        if (!s) return userLocations;
        return userLocations.filter(
            (u) =>
                u.user_name?.toLowerCase().includes(s) ||
                u.first_name?.toLowerCase().includes(s) ||
                u.last_name?.toLowerCase().includes(s) ||
                u.team_name?.toLowerCase().includes(s) ||
                u.trade_name?.toLowerCase().includes(s),
        );
    }, [userLocations, usersSearch]);

    const groupedUsers = useMemo(() => groupByTeam(filteredUserLocations), [filteredUserLocations]);

    const usersWithLocation = useMemo(
        () => spreadOverlappingUsers(userLocations.filter((u) => u.latitude && u.longitude)),
        [userLocations],
    );
    
    const groupedZonesForSidebar = useMemo(() => {
        const s = zonesSearch.trim().toLowerCase();
        const allZones: any[] = s ? zonesList.filter((z) => z.name?.toLowerCase().includes(s)) : zonesList;

        const assignedIds = new Set<number>(
            zoneGroups.flatMap((g) => g.zones?.map((z: any) => z.id) ?? []),
        );

        const sections: Array<{
            key: string;
            label: string;
            groupData: any | null;
            zones: any[];
        }> = [];

        for (const group of zoneGroups) {
            const groupZoneIds = new Set<number>(group.zones?.map((z: any) => z.id) ?? []);
            const zonesInGroup = allZones.filter((z) => groupZoneIds.has(z.id));
            if (zonesInGroup.length === 0 && s) continue;
            sections.push({
                key: `group-${group.id}`,
                label: group.name,
                groupData: group,
                zones: zonesInGroup,
            });
        }

        const unassignedZones = allZones.filter((z) => !assignedIds.has(z.id));
        sections.unshift({
            key: 'unassigned',
            label: 'Unassigned',
            groupData: null,
            zones: unassignedZones,
        });

        return sections;
    }, [zonesList, zoneGroups, zonesSearch]);
    
    return (
        <Box p={2}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box display="flex" width="80%" gap={3} alignItems="center">
                    <Tabs
                        value={activeTab}
                        onChange={handleTabChange}
                        aria-label="zone-tabs"
                        sx={{
                            minHeight: 36,
                            '& .MuiTabs-indicator': { backgroundColor: '#007bff', height: 2 },
                            '& .MuiTab-root': {
                                minHeight: 36,
                                textTransform: 'none',
                                fontSize: 14,
                                fontWeight: 400,
                                color: '#555',
                                padding: '0 8px',
                            },
                            '& .Mui-selected': { color: '#007bff', fontWeight: 600 },
                        }}
                    >
                        <Tab label="Project" />
                        <Tab label="Address" />
                    </Tabs>

                    <TextField
                        size="small"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconSearch size={16} />
                                </InputAdornment>
                            ),
                        }}
                        sx={{ width: { xs: '90%', sm: '50%', md: '30%', lg: '25%' } }}
                    />

                    <FormControl sx={{ width: '15%' }} size="small">
                        <Select
                            value={activeProjectId ?? ''}
                            onChange={(e) => {
                                const newId = e.target.value;
                                setActiveProjectId(newId as any);
                                fetchProjectDetail(newId as any);
                            }}
                            sx={{
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e0e0e0' },
                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#bbb' },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#50ABFF' },
                            }}
                        >
                            {projectList.map((proj) => (
                                <MenuItem key={proj.id} value={proj.id.toString()}>
                                    <Typography
                                        variant="body1"
                                        sx={{
                                            display: '-webkit-box',
                                            WebkitBoxOrient: 'vertical',
                                            WebkitLineClamp: 1,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            maxWidth: 250,
                                        }}
                                    >
                                        {proj.name}
                                    </Typography>
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>

                <Box display="flex" alignItems="center" gap={1}>
                    <Button
                        variant="outlined"
                        color="primary"
                        size="small"
                        onClick={() => setAddGroupOpen(true)}
                        sx={{ textTransform: 'none', fontWeight: 600, height: 36, px: 2, whiteSpace: 'nowrap' }}
                    >
                        Add Zone Group
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        onClick={() => setAddZoneOpen(true)}
                        sx={{ textTransform: 'none', fontWeight: 600, height: 36, px: 2, whiteSpace: 'nowrap' }}
                    >
                        Add Zone
                    </Button>
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={handleOpenZones}
                        startIcon={<IconMapPin size={16} />}
                        sx={{
                            borderColor: '#1976d2',
                            color: '#1976d2',
                            textTransform: 'none',
                            fontWeight: 600,
                            height: 36,
                            px: 2,
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {visibleZones.length} / {zonesList.length || geofences.length} Zones
                    </Button>
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={handleOpenUsers}
                        startIcon={<IconUsers size={16} />}
                        sx={{
                            borderColor: '#1976d2',
                            color: '#1976d2',
                            textTransform: 'none',
                            fontWeight: 600,
                            height: 36,
                            px: 2,
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {usersWithLocation.length} / {userLocations.length} Users
                    </Button>
                    <IconButton onClick={onClose}>
                        <IconX />
                    </IconButton>
                </Box>
            </Box>

            {/* ── Main Content: Table + Map ── */}
            <Box display="flex" gap={2} mt={2} height="calc(100vh - 120px)">
                <Box width="35%" overflow="auto">
                    <Paper>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ background: '#f5f5f5' }}>
                                    <TableCell><b>Name</b></TableCell>
                                    <TableCell width={150}><b>Action</b></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filterData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={2} align="center" sx={{ py: 4 }}>
                                            No zones found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filterData.map((z) => (
                                        <TableRow key={z.id}>
                                            <TableCell>
                                                <Typography>{z.name}</Typography>
                                                <Typography variant="body2" color="textSecondary">
                                                    {z.address_name}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Box display="flex">
                                                    <IconButton
                                                        color="success"
                                                        onClick={() => setSelected({ ...z, mode: 'view' })}
                                                    >
                                                        <IconEye size={20} />
                                                    </IconButton>
                                                    <IconButton
                                                        color="primary"
                                                        onClick={() => setSelected({ ...z, mode: 'edit' })}
                                                    >
                                                        <IconEdit size={20} />
                                                    </IconButton>
                                                    <IconButton
                                                        color="error"
                                                        onClick={() => {
                                                            setDeleteId(z.id);
                                                            setDeleteConfirmOpen(true);
                                                        }}
                                                    >
                                                        <IconTrash size={20} />
                                                    </IconButton>
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </Paper>
                </Box>

                <Box width="65%" display="flex" flexDirection="column" overflow="auto">
                    {!selected && (
                        <AllZonesMap
                            zones={visibleZones}
                            isLoaded={isLoaded}
                            userLocations={usersOnMapVisible ? usersWithLocation : []}
                            onMapLoad={(map) => { mainMapRef.current = map; }}
                        />
                    )}
                    {selected?.mode === 'view' && (
                        <ViewZoneMap key={selected.id} zone={selected} isLoaded={isLoaded} />
                    )}
                    {selected?.mode === 'edit' && (
                        <EditZone
                            key={selected.id}
                            zone={selected}
                            activeTab={activeTab}
                            onSaved={() => fetchProjectDetail(activeProjectId!)}
                            onCancel={() => setSelected(null)}
                            projectId={activeProjectId}
                            companyId={user.company_id ?? null}
                            addresses={addresses}
                        />
                    )}
                </Box>
            </Box>

            <Drawer
                anchor="right"
                open={zonesDrawerOpen}
                onClose={handleCloseZones}
                sx={{ '& .MuiDrawer-paper': drawerPaperSx }}
            >
                <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    px={2.5}
                    py={1.75}
                    sx={{ borderBottom: '1px solid #f0f0f0' }}
                >
                    <Typography
                        fontWeight={700}
                        fontSize={13}
                        letterSpacing={1}
                        sx={{ textTransform: 'uppercase', color: '#444' }}
                    >
                        Zones
                    </Typography>
                    <IconButton size="small" onClick={handleCloseZones}>
                        <IconX size={18} />
                    </IconButton>
                </Box>

                <Box px={2} py={1.5} sx={{ borderBottom: '1px solid #f0f0f0' }}>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="Search zones..."
                        value={zonesSearch}
                        onChange={(e) => setZonesSearch(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <IconSearch size={15} color="#aaa" />
                                </InputAdornment>
                            ),
                        }}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                                backgroundColor: '#fafafa',
                                fontSize: 14,
                            },
                        }}
                    />
                </Box>

                <Box sx={{ flex: 1, overflowY: 'auto' }}>
                    {zonesLoading ? (
                        <Typography color="textSecondary" textAlign="center" py={4} fontSize={14}>
                            Loading...
                        </Typography>
                    ) : groupedZonesForSidebar.every((s) => s.zones.length === 0) ? (
                        <Typography color="textSecondary" textAlign="center" py={4} fontSize={14}>
                            No zones found.
                        </Typography>
                    ) : (
                        groupedZonesForSidebar.map((section) => {
                            if (section.zones.length === 0) return null;

                            const sectionZoneIds = section.zones.map((z) => z.id);
                            const allHidden = sectionZoneIds.every((id) => hiddenZoneIds.has(id));
                            const someHidden = sectionZoneIds.some((id) => hiddenZoneIds.has(id));
                            const isCollapsed = openGroupKey !== section.key;

                            return (
                                <Box key={section.key} sx={{ borderBottom: '1px solid #efefef' }}>
                                    <Box sx={{ backgroundColor: '#f8f8f8', borderBottom: '1px solid #efefef' }}>
                                        <Box
                                            display="flex"
                                            alignItems="center"
                                            px={1.5}
                                            py={1}
                                            pb={1}
                                            onClick={() => toggleGroupCollapse(section.key)}
                                            sx={{ cursor: 'pointer', userSelect: 'none' }}
                                        >
                                            <Typography
                                                variant="body2"
                                                fontWeight={700}
                                                fontSize={13}
                                                color="#333"
                                                sx={{ flex: 1 }}
                                            >
                                                {section.label}
                                            </Typography>
                                            <IconButton
                                                size="small"
                                                sx={{ p: 0.25, flexShrink: 0 }}
                                                onClick={(e) => { e.stopPropagation(); toggleGroupCollapse(section.key); }}
                                            >
                                                {isCollapsed
                                                    ? <IconChevronDown size={16} color="#888" />
                                                    : <IconChevronUp size={16} color="#888" />
                                                }
                                            </IconButton>
                                        </Box>
                                    </Box>

                                    <Collapse in={!isCollapsed}>
                                        {section.groupData && (
                                            <Box
                                                display="flex"
                                                alignItems="center"
                                                px={2}
                                                py={1.1}
                                                gap={1.5}
                                                sx={{ borderBottom: '1px solid #f0f0f0' }}
                                            >
                                                <IconButton
                                                    size="small"
                                                    onClick={() => toggleGroupVisibility(sectionZoneIds)}
                                                    sx={{
                                                        p: 0.5,
                                                        flexShrink: 0,
                                                        color: allHidden ? '#ea5455' : someHidden ? '#f59e0b' : '#1976d2',
                                                    }}
                                                >
                                                    {allHidden ? <IconEyeOff size={17} /> : <IconEye size={17} />}
                                                </IconButton>

                                                <Button
                                                    size="small"
                                                    startIcon={<IconEdit size={13} />}
                                                    onClick={() => setEditingGroup(section.groupData)}
                                                    sx={{
                                                        minWidth: 0,
                                                        px: 1.25,
                                                        py: 0.3,
                                                        fontSize: 14,
                                                        textTransform: 'none',
                                                        backgroundColor: 'transparent',
                                                        '&:hover': { color: '#1E4DB7', backgroundColor: '#E7ECE7' },
                                                    }}
                                                >
                                                    Edit
                                                </Button>
                                            </Box>
                                        )}

                                        {section.zones.map((z, idx) => {
                                            const isHidden = hiddenZoneIds.has(z.id);
                                            const isLast = idx === section.zones.length - 1;

                                            return (
                                                <Box
                                                    key={z.id}
                                                    display="flex"
                                                    alignItems="center"
                                                    px={2}
                                                    py={1.1}
                                                    gap={1.5}
                                                    sx={{
                                                        borderBottom: isLast ? 'none' : '1px solid #f5f5f5',
                                                        transition: 'background 0.1s',
                                                        '&:hover': { backgroundColor: '#fafafa' },
                                                    }}
                                                >
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => toggleZoneVisibility(z.id)}
                                                        sx={{
                                                            flexShrink: 0,
                                                            p: 0.5,
                                                            color: isHidden ? '#ea5455' : '#1976d2',
                                                        }}
                                                    >
                                                        {isHidden ? <IconEyeOff size={17} /> : <IconEye size={17} />}
                                                    </IconButton>

                                                    <Box flex={1} minWidth={0}>
                                                        <Typography
                                                            variant="body2"
                                                            fontWeight={500}
                                                            noWrap
                                                            sx={{ fontSize: 13, color: '#1a1a1a' }}
                                                        >
                                                            {z.name}
                                                        </Typography>
                                                        {z.address && (
                                                            <Typography variant="caption" color="textSecondary" noWrap display="block">
                                                                {z.address}
                                                            </Typography>
                                                        )}
                                                    </Box>

                                                    <IconButton
                                                        size="small"
                                                        disabled={isHidden}
                                                        onClick={() => {
                                                            if (!mainMapRef.current) return;
                                                            handleCloseZones();
                                                            setTimeout(() => {
                                                                if (mainMapRef.current) flyToZone(mainMapRef.current, z);
                                                            }, 320);
                                                        }}
                                                        sx={{
                                                            flexShrink: 0,
                                                            p: 0.5,
                                                            color: isHidden ? '#ccc' : '#555',
                                                            '&:not(:disabled):hover': { color: '#1976d2' },
                                                        }}
                                                    >
                                                        <IconMapPin size={17} />
                                                    </IconButton>
                                                </Box>
                                            );
                                        })}
                                    </Collapse>
                                </Box>
                            );
                        })
                    )}
                </Box>

                <Box px={2} py={1.5} sx={{ borderTop: '1px solid #f0f0f0' }}>
                    <Button fullWidth variant="outlined" onClick={handleCloseZones} sx={{ borderRadius: 2 }}>
                        Close
                    </Button>
                </Box>
            </Drawer>

            <Drawer
                anchor="right"
                open={usersDrawerOpen}
                onClose={handleCloseUsers}
                sx={{
                    '& .MuiDrawer-paper': {
                        width: 460,
                        display: 'flex',
                        flexDirection: 'column',
                        backgroundColor: '#fff',
                    },
                }}
            >
                <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    px={2.5}
                    py={1.75}
                    sx={{ borderBottom: '1px solid #f0f0f0' }}
                >
                    <Typography fontWeight={700} fontSize={13} letterSpacing={1} sx={{ textTransform: 'uppercase', color: '#444' }}>
                        Staff on Site
                    </Typography>
                    <IconButton size="small" onClick={handleCloseUsers}>
                        <IconX size={18} />
                    </IconButton>
                </Box>

                <Box display="flex" gap={1} px={2} py={1.5} sx={{ borderBottom: '1px solid #f0f0f0' }}>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="Search..."
                        value={usersSearch}
                        onChange={(e) => setUsersSearch(e.target.value)}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, backgroundColor: '#fafafa', fontSize: 14 } }}
                    />
                </Box>

                <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, py: 1.5 }}>
                    {userLocationsLoading ? (
                        <Typography color="textSecondary" textAlign="center" py={4} fontSize={14}>Loading staff...</Typography>
                    ) : Object.keys(groupedUsers).length === 0 ? (
                        <Typography color="textSecondary" textAlign="center" py={4} fontSize={14}>No staff found.</Typography>
                    ) : (
                        Object.entries(groupedUsers).map(([teamName, members]) => {
                            const isExpanded = expandedTeams[teamName] ?? true;
                            return (
                                <Box
                                    key={teamName}
                                    sx={{
                                        mb: 1.5,
                                        border: '1px solid #e8e8e8',
                                        borderRadius: 2,
                                        overflow: 'hidden',
                                        backgroundColor: '#fff',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                    }}
                                >
                                    <Box
                                        display="flex"
                                        alignItems="center"
                                        justifyContent="space-between"
                                        px={2}
                                        py={1.25}
                                        onClick={() => toggleTeam(teamName)}
                                        sx={{ cursor: 'pointer', userSelect: 'none', '&:hover': { backgroundColor: '#fafafa' } }}
                                    >
                                        <Typography variant="body2" fontWeight={600} color="#1a1a1a" fontSize={14}>
                                            {teamName}
                                        </Typography>
                                        {isExpanded ? <IconChevronDown size={17} color="#888" /> : <IconChevronUp size={17} color="#888" />}
                                    </Box>
                                    <Collapse in={isExpanded}>
                                        <Box sx={{ borderTop: '1px solid #f2f2f2' }}>
                                            {members.map((member: any, idx: number) => (
                                                <StaffMemberRow
                                                    key={member.id}
                                                    member={member}
                                                    isLast={idx === members.length - 1}
                                                    onPinClick={() => {
                                                        if (!mainMapRef.current || !member.latitude || !member.longitude) return;
                                                        handleCloseUsers();
                                                        setTimeout(() => {
                                                            if (mainMapRef.current) {
                                                                mainMapRef.current.panTo({
                                                                    lat: Number(member.latitude),
                                                                    lng: Number(member.longitude),
                                                                });
                                                                mainMapRef.current.setZoom(17);
                                                            }
                                                        }, 320);
                                                    }}
                                                />
                                            ))}
                                        </Box>
                                    </Collapse>
                                </Box>
                            );
                        })
                    )}
                </Box>
            </Drawer>

            <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
                <DialogTitle>
                    Delete Zone
                    <IconButton onClick={() => setDeleteConfirmOpen(false)} sx={{ position: 'absolute', right: 12, top: 8 }}>
                        <IconX size={20} />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Typography color="textSecondary">Are you sure you want to delete this zone?</Typography>
                </DialogContent>
                <DialogActions>
                    <Button variant="outlined" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
                    <Button variant="contained" color="error" onClick={handleDeleteZone}>Delete</Button>
                </DialogActions>
            </Dialog>

            {addGroupOpen && (
                <AddZoneGroup
                    projectId={activeProjectId}
                    companyId={companyId}
                    geofences={geofences}
                    onAdded={() => {
                        fetchProjectDetail(activeProjectId!);
                        fetchZoneGroups();
                        setAddGroupOpen(false);
                    }}
                    onCancel={() => setAddGroupOpen(false)}
                />
            )}

            {editingGroup && (
                <EditZoneGroup
                    group={editingGroup}
                    allZones={zonesList}
                    onUpdated={() => {
                        fetchZoneGroups();
                        fetchZonesList();
                        setEditingGroup(null);
                    }}
                    onDeleted={() => {
                        fetchZoneGroups();
                        fetchZonesList();
                        setEditingGroup(null);
                    }}
                    onCancel={() => setEditingGroup(null)}
                />
            )}

            {addZoneOpen && (
                <AddZone
                    projectId={activeProjectId}
                    companyId={companyId}
                    addresses={addresses}
                    activeTab={activeTab}
                    onAdded={() => {
                        fetchProjectDetail(activeProjectId!);
                        setAddZoneOpen(false);
                    }}
                    onCancel={() => setAddZoneOpen(false)}
                />
            )}
        </Box>
    );
}

const StaffMemberRow = ({member, isLast, onPinClick}: {
    member: any;
    isLast: boolean;
    onPinClick?: () => void;
}) => {
    const isWorking = member.is_working ?? false;
    const hasLocation = Boolean(member.latitude && member.longitude);
    const initials = `${member.first_name?.[0] ?? ''}${member.last_name?.[0] ?? ''}`.toUpperCase();
    const statusLabel = isWorking ? 'Working' : 'Not Working';
    const statusColor = isWorking ? '#00c292' : '#fc4b6c';

    return (
        <Box
            display="flex"
            alignItems="center"
            gap={1.5}
            px={2}
            py={1.1}
            sx={{
                borderBottom: isLast ? 'none' : '1px solid #f5f5f5',
                '&:hover': { backgroundColor: '#fafafa' },
                transition: 'background 0.1s',
            }}
        >
            <Box sx={{ position: 'relative', flexShrink: 0 }}>
                <Avatar
                    src={member.user_thumb_image || member.user_image || undefined}
                    sx={{
                        width: 40,
                        height: 40,
                        fontSize: 13,
                        fontWeight: 700,
                        backgroundColor: isWorking ? '#1976d2' : '#bdbdbd',
                    }}
                >
                    {!(member.user_thumb_image || member.user_image) && initials}
                </Avatar>
                <Box
                    sx={{
                        position: 'absolute',
                        bottom: 1,
                        right: 1,
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: isWorking ? '#4caf50' : '#fc4b6c',
                        border: '2px solid white',
                    }}
                />
            </Box>

            <Box flex={1} minWidth={0}>
                <Typography
                    variant="body2"
                    fontWeight={600}
                    noWrap
                    sx={{ fontSize: 14, color: '#1a1a1a' }}
                >
                    {member.user_name || `${member.first_name ?? ''} ${member.last_name ?? ''}`.trim()}
                </Typography>
                <Typography variant="caption" color="textSecondary" sx={{ fontSize: 12 }}>
                    {formatDateTime(member.last_seen)}
                </Typography>
            </Box>

            <Typography
                variant="caption"
                fontWeight={600}
                sx={{ color: statusColor, whiteSpace: 'nowrap', flexShrink: 0, fontSize: 13 }}
            >
                {statusLabel}
            </Typography>

            <IconButton
                size="small"
                onClick={hasLocation ? onPinClick : undefined}
                sx={{
                    color: '#555',
                    flexShrink: 0,
                    p: 0.5,
                    '&:hover': { color: '#1976d2' },
                }}
            >
                <IconMapPin size={17} />
            </IconButton>
        </Box>
    );
};

const UserMarker = ({ user }: { user: any }) => {
    const [hovered, setHovered] = useState(false);
    const position = { lat: Number(user.latitude), lng: Number(user.longitude) };
    const initials = `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase();
    const isWorking = user.is_working ?? false;
    const pinColor = isWorking ? '#1976d2' : '#fc4b6c';
    const dotColor = isWorking ? '#4caf50' : '#fc4b6c';

    return (
        <OverlayView
            position={position}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            getPixelPositionOffset={(w, h) => ({ x: -(w / 2), y: -h })}
        >
            <Box
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                sx={{ position: 'relative', width: 48, height: 58, cursor: 'pointer' }}
            >
                {hovered && (
                    <Box
                        sx={{
                            position: 'absolute',
                            bottom: 66,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: 'white',
                            borderRadius: 2,
                            boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                            px: 1.5,
                            py: 1,
                            minWidth: 170,
                            zIndex: 9999,
                            whiteSpace: 'nowrap',
                            border: '1px solid #e0e0e0',
                            pointerEvents: 'none',
                        }}
                    >
                        <Box sx={{
                            position: 'absolute',
                            bottom: -7,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: 0,
                            height: 0,
                            borderLeft: '7px solid transparent',
                            borderRight: '7px solid transparent',
                            borderTop: '7px solid white',
                        }} />
                        <Typography variant="body2" fontWeight={700} sx={{ mb: 0.25 }}>
                            {user.user_name || `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()}
                        </Typography>
                        {user.trade_name && (
                            <Typography variant="caption" color="textSecondary" display="block">
                                {user.trade_name}
                            </Typography>
                        )}
                        {user.team_name && (
                            <Typography variant="caption" color="textSecondary" display="block">
                                Team: {user.team_name}
                            </Typography>
                        )}
                        {user.supervisor_name && (
                            <Typography variant="caption" color="textSecondary" display="block">
                                Supervisor: {user.supervisor_name}
                            </Typography>
                        )}
                        {user.last_seen && (
                            <Typography variant="caption" color="textSecondary" display="block">
                                {formatDateTime(user.last_seen)}
                            </Typography>
                        )}
                        <Box display="inline-flex" alignItems="center" gap={0.5} mt={0.5}>
                            <Box sx={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: dotColor }} />
                            <Typography variant="caption" sx={{ color: dotColor, fontWeight: 600 }}>
                                {isWorking ? 'Working' : 'Offline'}
                            </Typography>
                        </Box>
                    </Box>
                )}

                <Box
                    sx={{
                        position: 'relative',
                        width: 48,
                        height: 58,
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'center',
                        filter: hovered
                            ? 'drop-shadow(0 6px 14px rgba(0,0,0,0.38))'
                            : 'drop-shadow(0 3px 6px rgba(0,0,0,0.26))',
                        transition: 'filter 0.15s ease, transform 0.15s ease',
                        transform: hovered ? 'scale(1.12) translateY(-2px)' : 'scale(1)',
                    }}
                >
                    <svg
                        width="48"
                        height="58"
                        viewBox="0 0 48 58"
                        style={{ position: 'absolute', top: 0, left: 0 }}
                    >
                        <path
                            d="M24 0C13.507 0 5 8.507 5 19c0 14.25 19 39 19 39S43 33.25 43 19C43 8.507 34.493 0 24 0z"
                            fill={pinColor}
                        />
                        <circle cx="24" cy="19" r="16" fill="white" />
                    </svg>

                    <Box
                        sx={{
                            position: 'absolute',
                            top: 3, 
                            left: 8, 
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: isWorking ? '#1976d2' : '#bdbdbd',
                        }}
                    >
                        {user.user_thumb_image ? (
                            <img
                                src={user.user_thumb_image}
                                alt={user.user_name}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    display: 'block',
                                }}
                            />
                        ) : (
                            <Typography
                                sx={{
                                    color: 'white',
                                    fontWeight: 700,
                                    fontSize: 13,
                                    lineHeight: 1,
                                    userSelect: 'none',
                                }}
                            >
                                {initials || <IconUsers size={16} color="white" />}
                            </Typography>
                        )}
                    </Box>

                    <Box
                        sx={{
                            position: 'absolute',
                            top: 28,  
                            right: 7,
                            width: 11,
                            height: 11,
                            borderRadius: '50%',
                            backgroundColor: dotColor,
                            border: '2px solid white',
                            zIndex: 1,
                        }}
                    />
                </Box>
            </Box>
        </OverlayView>
    );
};

const AllZonesMap = ({zones, isLoaded, userLocations = [], onMapLoad}: {
    zones: any[];
    isLoaded: boolean;
    userLocations?: any[];
    onMapLoad?: (map: google.maps.Map) => void;
}) => {
    const mapRef = useRef<google.maps.Map | null>(null);

    useEffect(() => {
        if (!mapRef.current) return;
        if (zones.length === 0) {
            mapRef.current.setCenter(LONDON_CENTER);
            mapRef.current.setZoom(12);
            return;
        }
        const bounds = buildBoundsFromZones(zones);
        if (bounds) mapRef.current.fitBounds(bounds);
    }, [zones]);

    const handleMapLoad = (map: google.maps.Map) => {
        mapRef.current = map;
        onMapLoad?.(map);
        if (zones.length === 0) {
            map.setCenter(LONDON_CENTER);
            map.setZoom(12);
            return;
        }
        const bounds = buildBoundsFromZones(zones);
        if (bounds) map.fitBounds(bounds);
    };

    const onZoneClick = (zone: any) => {
        if (mapRef.current) flyToZone(mapRef.current, zone);
    };

    if (!isLoaded) return <Typography p={2}>Loading map...</Typography>;

    return (
        <Paper sx={{ height: '90%', width: '100%' }}>
            <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                zoom={12}
                center={LONDON_CENTER}
                onLoad={handleMapLoad}
            >
                {zones.map((zone) => {
                    const color = zone.color || '#1976d2';

                    if (zone.type === 'circle') {
                        const center = { lat: Number(zone.latitude), lng: Number(zone.longitude) };
                        return (
                            <React.Fragment key={zone.id}>
                                <OverlayView position={center} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
                                    <Box
                                        onClick={() => onZoneClick(zone)}
                                        sx={{ cursor: 'pointer', color, width: 'max-content' }}
                                        className="map-site-label"
                                    >
                                        <Typography>{zone.name}</Typography>
                                    </Box>
                                </OverlayView>
                                <Circle
                                    center={center}
                                    radius={Number(zone.radius)}
                                    options={{ strokeColor: color, fillColor: color + '33' }}
                                />
                            </React.Fragment>
                        );
                    }

                    if (zone.type === 'polygon') {
                        if (!Array.isArray(zone.coordinates) || zone.coordinates.length < 3) return null;
                        const path = zone.coordinates.map((p: any) => ({ lat: Number(p.lat), lng: Number(p.lng) }));
                        const centroid = {
                            lat: path.reduce((s: number, p: any) => s + p.lat, 0) / path.length,
                            lng: path.reduce((s: number, p: any) => s + p.lng, 0) / path.length,
                        };
                        return (
                            <React.Fragment key={zone.id}>
                                <OverlayView position={centroid} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
                                    <Box
                                        onClick={() => onZoneClick(zone)}
                                        sx={{ cursor: 'pointer', color, width: 'max-content' }}
                                        className="map-site-label"
                                    >
                                        <Typography>{zone.name}</Typography>
                                    </Box>
                                </OverlayView>
                                <Polygon
                                    paths={path}
                                    options={{ strokeColor: color, fillColor: color + '33', strokeWeight: 2 }}
                                    onClick={() => onZoneClick(zone)}
                                />
                            </React.Fragment>
                        );
                    }

                    if (zone.type === 'polyline') {
                        const path = zone.coordinates.map((p: any) => ({ lat: Number(p.lat), lng: Number(p.lng) }));
                        const midpoint = path[Math.floor(path.length / 2)];
                        return (
                            <React.Fragment key={zone.id}>
                                <OverlayView position={midpoint} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
                                    <Box
                                        onClick={() => onZoneClick(zone)}
                                        sx={{ cursor: 'pointer', color, width: 'max-content' }}
                                        className="map-site-label"
                                    >
                                        <Typography>{zone.name}</Typography>
                                    </Box>
                                </OverlayView>
                                <Polyline
                                    path={path}
                                    options={{ strokeColor: color, strokeWeight: 3 }}
                                    onClick={() => onZoneClick(zone)}
                                />
                            </React.Fragment>
                        );
                    }

                    return null;
                })}

                {userLocations.map((u) => (
                    <UserMarker key={`user-${u.id}`} user={u} />
                ))}
            </GoogleMap>
        </Paper>
    );
};

const ViewZoneMap = ({ zone, isLoaded }: { zone: any; isLoaded: boolean }) => {
    if (!isLoaded) return <Typography p={2}>Loading map...</Typography>;

    const color = zone.color || '#1976d2';
    const center = { lat: Number(zone.latitude), lng: Number(zone.longitude) };
    const path = zone?.coordinates ?? [];

    const polygonCenter = path.length > 0
        ? {
            lat: path.reduce((s: number, p: any) => s + p.lat, 0) / path.length,
            lng: path.reduce((s: number, p: any) => s + p.lng, 0) / path.length,
        }
        : center;

    const polylineCenter = path.length > 0 ? path[Math.floor(path.length / 2)] : center;
    const markerPosition =
        zone.type === 'circle' ? center
            : zone.type === 'polygon' ? polygonCenter
                : polylineCenter;

    const handleMapLoad = (map: google.maps.Map) => {
        const bounds = new google.maps.LatLngBounds();
        if (zone.type === 'circle') {
            const circleCenter = new google.maps.LatLng(center.lat, center.lng);
            const radius = Number(zone.radius);
            [0, 90, 180, 270].forEach((deg) =>
                bounds.extend(google.maps.geometry.spherical.computeOffset(circleCenter, radius, deg)),
            );
        } else if (path.length > 0) {
            path.forEach((p: any) => bounds.extend(new google.maps.LatLng(p.lat, p.lng)));
        }
        map.fitBounds(bounds);
        map.setZoom(DEFAULT_ZOOM);
    };

    return (
        <Paper sx={{ height: '90%' }}>
            <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                zoom={DEFAULT_ZOOM}
                center={markerPosition}
                onLoad={handleMapLoad}
            >
                <Marker
                    position={markerPosition}
                    label={{ text: zone.name || '', color, className: 'map-site-label' }}
                    icon={{ path: google.maps.SymbolPath.CIRCLE, scale: 0 }}
                />
                {zone.type === 'circle' && (
                    <Circle
                        center={center}
                        radius={Number(zone.radius)}
                        options={{ strokeColor: color, fillColor: `${color}33` }}
                    />
                )}
                {zone.type === 'polygon' && (
                    <Polygon
                        paths={path}
                        options={{ strokeColor: color, fillColor: `${color}33` }}
                    />
                )}
                {zone.type === 'polyline' && (
                    <Polyline
                        path={path}
                        options={{ strokeColor: color, strokeWeight: 3 }}
                    />
                )}
            </GoogleMap>
        </Paper>
    );
};

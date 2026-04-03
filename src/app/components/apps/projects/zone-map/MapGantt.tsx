'use client';

import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
    Avatar,
    Box,
    Button,
    Collapse,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle, Divider,
    Drawer,
    IconButton,
    InputAdornment, MenuItem,
    Paper, Stack,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Tabs,
    TextField, Tooltip,
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
    IconChevronLeft,
    IconChevronRight,
    IconChevronUp,
    IconEdit,
    IconEye,
    IconMapPin,
    IconSearch,
    IconTrash,
    IconUsers,
    IconX,
    IconEyeOff,
    IconFilter,
} from '@tabler/icons-react';
import {AxiosResponse} from 'axios';
import {User} from 'next-auth';
import {useSession} from 'next-auth/react';
import toast from 'react-hot-toast';
import api from '@/utils/axios';

import AddZone from './AddZone';
import EditZone from './EditZone';
import CustomSelect from '@/app/components/forms/theme-elements/CustomSelect';

interface DateTimePickerProps {
    value: Date;
    onChange: (date: Date) => void;
}

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function DateTimePicker({value, onChange}: DateTimePickerProps) {
    const [open, setOpen] = useState(false);
    const [viewYear, setViewYear] = useState(value.getFullYear());
    const [viewMonth, setViewMonth] = useState(value.getMonth());
    const [pickedDate, setPickedDate] = useState<Date>(value);
    const [hours, setHours] = useState(value.getHours());
    const [minutes, setMinutes] = useState(value.getMinutes());
    const anchorRef = useRef<HTMLDivElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    const displayValue = useMemo(() => {
        const dd = String(value.getDate()).padStart(2, '0');
        const MM = String(value.getMonth() + 1).padStart(2, '0');
        const yyyy = value.getFullYear();
        const hh = String(value.getHours()).padStart(2, '0');
        const mm = String(value.getMinutes()).padStart(2, '0');
        return `${dd}/${MM}/${yyyy} ${hh}:${mm}`;
    }, [value]);

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (
                popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
                anchorRef.current && !anchorRef.current.contains(e.target as Node)
            ) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    useEffect(() => {
        setViewYear(value.getFullYear());
        setViewMonth(value.getMonth());
        setPickedDate(value);
        setHours(value.getHours());
        setMinutes(value.getMinutes());
    }, [value]);

    const calendarDays = useMemo(() => {
        const firstDay = new Date(viewYear, viewMonth, 1).getDay();
        const startOffset = firstDay === 0 ? 6 : firstDay - 1;
        const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
        const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();
        const cells: { day: number; month: 'prev' | 'current' | 'next' }[] = [];
        for (let i = startOffset - 1; i >= 0; i--) {
            cells.push({day: daysInPrevMonth - i, month: 'prev'});
        }
        for (let d = 1; d <= daysInMonth; d++) {
            cells.push({day: d, month: 'current'});
        }
        const remaining = 42 - cells.length;
        for (let d = 1; d <= remaining; d++) {
            cells.push({day: d, month: 'next'});
        }
        return cells;
    }, [viewYear, viewMonth]);

    const prevMonth = () => {
        if (viewMonth === 0) {
            setViewMonth(11);
            setViewYear(y => y - 1);
        } else setViewMonth(m => m - 1);
    };

    const nextMonth = () => {
        if (viewMonth === 11) {
            setViewMonth(0);
            setViewYear(y => y + 1);
        } else setViewMonth(m => m + 1);
    };

    const selectDay = (cell: { day: number; month: string }) => {
        let m = viewMonth, y = viewYear;
        if (cell.month === 'prev') {
            m -= 1;
            if (m < 0) {
                m = 11;
                y -= 1;
            }
        }
        if (cell.month === 'next') {
            m += 1;
            if (m > 11) {
                m = 0;
                y += 1;
            }
        }
        setPickedDate(new Date(y, m, cell.day, hours, minutes, 0, 0));
        if (cell.month !== 'current') {
            setViewMonth(m);
            setViewYear(y);
        }
    };

    const handleApply = () => {
        const final = new Date(pickedDate.getFullYear(), pickedDate.getMonth(), pickedDate.getDate(), hours, minutes, 0, 0);
        onChange(final);
        setOpen(false);
    };

    const isToday = (cell: { day: number; month: string }) => {
        const now = new Date();
        return cell.month === 'current' && cell.day === now.getDate() && viewMonth === now.getMonth() && viewYear === now.getFullYear();
    };

    const isSelected = (cell: { day: number; month: string }) =>
        cell.month === 'current' &&
        cell.day === pickedDate.getDate() &&
        viewMonth === pickedDate.getMonth() &&
        viewYear === pickedDate.getFullYear();

    return (
        <Box sx={{position: 'relative', display: 'inline-block'}} ref={anchorRef}>
            <TextField
                size="small"
                value={displayValue}
                onClick={() => setOpen(o => !o)}
                inputProps={{
                    readOnly: true,
                    style: {cursor: 'pointer', caretColor: 'transparent', width: 148, fontSize: 14},
                }}
                sx={{
                    '& .MuiOutlinedInput-root': {
                        cursor: 'pointer',
                        '&:hover fieldset': {borderColor: '#007bff'},
                        '&.Mui-focused fieldset': {borderColor: '#007bff'},
                    },
                }}
            />

            {open && (
                <Box
                    ref={popoverRef}
                    sx={{
                        position: 'absolute',
                        top: 'calc(100% + 6px)',
                        left: 0,
                        zIndex: 9999,
                        backgroundColor: '#fff',
                        borderRadius: 2,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                        width: 280,
                        userSelect: 'none',
                    }}
                >
                    <Box sx={{p: 1.5}}>
                        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                            <IconButton size="small" onClick={prevMonth} sx={{p: 0.5}}>
                                <IconChevronLeft size={18}/>
                            </IconButton>
                            <Typography fontWeight={700} fontSize={14} color="#222">
                                {MONTHS[viewMonth]}&nbsp;&nbsp;{viewYear}
                            </Typography>
                            <IconButton size="small" onClick={nextMonth} sx={{p: 0.5}}>
                                <IconChevronRight size={18}/>
                            </IconButton>
                        </Box>

                        <Box display="grid" gridTemplateColumns="repeat(7, 1fr)" mb={0.5}>
                            {DAYS.map(d => (
                                <Typography key={d} align="center"
                                            sx={{fontSize: 11, fontWeight: 700, color: '#999', py: 0.25}}>
                                    {d}
                                </Typography>
                            ))}
                        </Box>

                        <Box display="grid" gridTemplateColumns="repeat(7, 1fr)">
                            {calendarDays.map((cell, i) => {
                                const selected = isSelected(cell);
                                const today = isToday(cell);
                                const faded = cell.month !== 'current';
                                return (
                                    <Box
                                        key={i}
                                        onClick={() => selectDay(cell)}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            height: 32,
                                            width: 32,
                                            mx: 'auto',
                                            borderRadius: '50%',
                                            cursor: 'pointer',
                                            fontSize: 13,
                                            fontWeight: selected ? 700 : today ? 600 : 400,
                                            color: selected ? '#fff' : faded ? '#ccc' : today ? '#1976d2' : '#333',
                                            backgroundColor: selected ? '#1976d2' : 'transparent',
                                            border: today && !selected ? '1px solid #1976d2' : 'none',
                                            '&:hover': {backgroundColor: selected ? '#1565c0' : '#f0f4ff'},
                                            transition: 'background 0.12s',
                                        }}
                                    >
                                        {cell.day}
                                    </Box>
                                );
                            })}
                        </Box>
                    </Box>

                    <Divider/>

                    <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                        <TextField
                            type="number"
                            value={String(hours).padStart(2, '0')}
                            onChange={(e) => {
                                let val = Number(e.target.value);
                                if (isNaN(val)) val = 0;
                                val = Math.max(0, Math.min(23, val));
                                setHours(val);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    setHours((prev) => (prev + 1) % 24);
                                }
                                if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    setHours((prev) => (prev - 1 + 24) % 24);
                                }
                            }}
                            InputProps={{sx: {'& fieldset': {border: 'none'}, borderRadius: 8, height: 48, width: 110}}}
                            inputProps={{style: {textAlign: 'center', fontSize: 18, fontWeight: 600}}}
                            sx={{width: 110}}
                        />
                        <Typography sx={{fontSize: 26, fontWeight: 700, color: '#666', mx: 0.5}}>:</Typography>
                        <TextField
                            type="number"
                            value={String(minutes).padStart(2, '0')}
                            onChange={(e) => {
                                let val = Number(e.target.value);
                                if (isNaN(val)) val = 0;
                                val = Math.round(val / 5) * 5;
                                if (val >= 60) val = 55;
                                if (val < 0) val = 0;
                                setMinutes(val);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    setMinutes((prev) => (prev + 5) % 60);
                                }
                                if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    setMinutes((prev) => (prev - 5 + 60) % 60);
                                }
                            }}
                            InputProps={{sx: {'& fieldset': {border: 'none'}, borderRadius: 8, height: 48, width: 110}}}
                            inputProps={{style: {textAlign: 'center', fontSize: 18}}}
                            sx={{width: 110}}
                        />
                    </Box>

                    <Divider/>

                    <Box sx={{px: 1.5, py: 1.5}}>
                        <Button
                            fullWidth
                            variant="contained"
                            onClick={handleApply}
                            sx={{
                                backgroundColor: '#1976d2',
                                textTransform: 'none',
                                fontWeight: 700,
                                fontSize: 14,
                                borderRadius: 1.5,
                                '&:hover': {backgroundColor: '#1565c0'},
                            }}
                        >
                            Search
                        </Button>
                    </Box>
                </Box>
            )}
        </Box>
    );
}

type Props = {
    open: boolean;
    onClose: () => void;
    onUpdate: () => void;
    projectId: number | null;
    companyId: number | null;
};

const GOOGLE_MAP_LIBRARIES = ['places', 'drawing'];
const LONDON_CENTER = {lat: 51.5074, lng: -0.1278};
const DEFAULT_ZOOM = 18;

const toApiFormat = (date: Date): string => {
    const dd = String(date.getDate()).padStart(2, '0');
    const MM = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${dd}/${MM}/${yyyy} ${hh}:${mm}`;
};

const formatDateTime = (dtStr: string | null | undefined): string => {
    if (!dtStr) return '';
    try {
        const [datePart, timePart] = dtStr.split(' ');
        const [dd, MM, yyyy] = datePart.split('/');
        const [hh, mm] = timePart.split(':');
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
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
        map.panTo({lat: Number(zone.latitude), lng: Number(zone.longitude)});
        map.setZoom(DEFAULT_ZOOM);
    } else if (Array.isArray(zone.coordinates) && zone.coordinates.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        zone.coordinates.forEach((pt: any) => bounds.extend({lat: Number(pt.lat), lng: Number(pt.lng)}));
        map.fitBounds(bounds);
    }
};

const buildBoundsFromZones = (zones: any[]): google.maps.LatLngBounds | null => {
    if (!zones.length) return null;
    const bounds = new google.maps.LatLngBounds();
    zones.forEach((zone) => {
        if (zone.type === 'circle') {
            bounds.extend({lat: Number(zone.latitude), lng: Number(zone.longitude)});
        } else if ((zone.type === 'polygon' || zone.type === 'polyline') && Array.isArray(zone.coordinates) && zone.coordinates.length > 0) {
            zone.coordinates.forEach((pt: any) => bounds.extend({lat: Number(pt.lat), lng: Number(pt.lng)}));
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

export default function MapGantt({open, onClose, onUpdate, projectId, companyId}: Props) {
    const session = useSession();
    const user = session.data?.user as User & { company_id?: number | null };

    const mainMapRef = useRef<google.maps.Map | null>(null);

    const [filterDateTime, setFilterDateTime] = useState<Date>(() => new Date());
    const apiDateTime = useMemo(() => toApiFormat(filterDateTime), [filterDateTime]);

    const [filterDialogOpen, setFilterDialogOpen] = useState<any | null>(null);
    const [resources, setResources] = useState<{ teams: any[]; trades: any[]; projects: any[] }>({
        teams: [],
        trades: [],
        projects: []
    });

    const [filters, setFilters] = useState({teams: [] as string[], trades: [] as string[], projects: [] as string[]});
    const [tempFilters, setTempFilters] = useState({
        teams: [] as string[],
        trades: [] as string[],
        projects: [] as string[]
    });

    const [geofences, setGeofences] = useState<any[]>([]);
    const [selected, setSelected] = useState<any | null>(null);
    const [addresses, setAddresses] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState(0);

    const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
    const [hiddenZoneIds, setHiddenZoneIds] = useState<Set<number>>(new Set());

    const [addZoneOpen, setAddZoneOpen] = useState(false);

    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const [usersDrawerOpen, setUsersDrawerOpen] = useState(false);
    const [usersSearch, setUsersSearch] = useState('');
    const [userLocations, setUserLocations] = useState<any[]>([]);
    const [userLocationsLoading, setUserLocationsLoading] = useState(false);
    const [usersOnMapVisible] = useState(true);
    const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({});

    // ── Zones list pagination ──
    const [zonePage, setZonePage] = useState(0);
    const [zonePageSize, setZonePageSize] = useState(50);

    const {isLoaded} = useJsApiLoader({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!,
        libraries: GOOGLE_MAP_LIBRARIES as any,
    });

    const fetchResources = async () => {
        try {
            const res = await api.get('work-zone/get-resources', {params: {company_id: user.company_id}});
            setResources({
                teams: res.data.teams ?? [],
                trades: res.data.trades ?? [],
                projects: res.data.projects ?? []
            });
        } catch (err) {
            console.error('Resources fetch error:', err);
        }
    };

    const fetchProjectDetail = async (pid: number | null) => {
        if (!pid) return;
        try {
            if (activeTab === 0) {
                const res = await api.get('work-zone/get', {
                    params: {
                        company_id: user.company_id,
                        is_project: true,
                        datetime: apiDateTime
                    }
                });
                setGeofences(res.data.info ?? []);
            } else {
                const res: AxiosResponse<any> = await api.get('address/zones', {
                    params: {
                        company_id: user.company_id,
                    }
                });
                setGeofences(res.data.info?.zones ?? []);
            }
        } catch (err) {
            console.error('Geofence fetch error:', err);
        }
    };

    const loadAddressList = async () => {
        try {
            const res = await api.get('address/get', {params: {project_id: activeProjectId}});
            setAddresses(res.data.info || []);
        } catch (err) {
            console.error('Address list fetch error:', err);
        }
    };

    const fetchUserLocations = async (applyFilters = false) => {
        setUserLocationsLoading(true);
        try {
            const res = await api.get('user-location/get-user-locations');
            if (res.data?.IsSuccess) {
                let data: any[] = res.data.info ?? [];
                if (applyFilters) {
                    if (filters.teams.length > 0) data = data.filter(u => filters.teams.includes(u.team_name));
                    if (filters.trades.length > 0) data = data.filter(u => filters.trades.includes(u.trade_name));
                    if (filters.projects.length > 0) data = data.filter(u => filters.projects.includes(u.project_name));
                }
                setUserLocations(data);
                const teams = groupByTeam(data);
                const initial: Record<string, boolean> = {};
                Object.keys(teams).forEach((t) => {
                    initial[t] = true;
                });
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
                setAddZoneOpen(false);
                setSelected(null);
                setGeofences(prev => prev.filter(z => z.id !== deleteId));
                setDeleteConfirmOpen(false);
                setDeleteId(null);
                fetchProjectDetail(activeProjectId!);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleTabChange = (_: any, v: number) => {
        setActiveTab(v);
        setSelected(null);
    };

    const handleOpenUsers = () => {
        setUsersDrawerOpen(true);
        fetchUserLocations(true);
    };

    const handleCloseUsers = () => {
        setUsersDrawerOpen(false);
        setUsersSearch('');
    };

    const toggleTeam = (teamName: string) => {
        setExpandedTeams((prev) => ({...prev, [teamName]: !prev[teamName]}));
    };

    useEffect(() => {
        if (addZoneOpen || selected?.mode === 'edit') loadAddressList();
    }, [addZoneOpen, selected]);

    useEffect(() => {
        if (open) {
            setActiveProjectId(projectId);
            fetchProjectDetail(projectId);
            fetchUserLocations(true);
        }
    }, [open]);

    useEffect(() => {
        if (open && activeProjectId) fetchProjectDetail(activeProjectId);
    }, [activeTab]);

    useEffect(() => {
        if (open && activeProjectId) fetchProjectDetail(activeProjectId);
    }, [apiDateTime]);

    const filterData = useMemo(() => {
        let data = geofences;
        const s = searchTerm.trim().toLowerCase();
        if (s) data = data.filter(z =>
            z.address?.toLowerCase().includes(s) ||
            z.address_name?.toLowerCase().includes(s) ||
            z.name?.toLowerCase().includes(s)
        );
        return data;
    }, [geofences, searchTerm]);

    // Reset to page 0 whenever the filtered list changes
    useEffect(() => {
        setZonePage(0);
    }, [filterData]);

    // Paginated slice of filterData for the table
    const paginatedZones = useMemo(() => {
        const start = zonePage * zonePageSize;
        return filterData.slice(start, start + zonePageSize);
    }, [filterData, zonePage, zonePageSize]);

    const totalZonePages = Math.max(1, Math.ceil(filterData.length / zonePageSize));

    const visibleZones = useMemo(
        () => filterData.filter((z) => !hiddenZoneIds.has(z.id)),
        [filterData, hiddenZoneIds],
    );

    const filteredUserLocations = useMemo(() => {
        let data = userLocations;
        const s = usersSearch.trim().toLowerCase();
        if (s) {
            data = data.filter((u) =>
                u.user_name?.toLowerCase().includes(s) ||
                u.first_name?.toLowerCase().includes(s) ||
                u.last_name?.toLowerCase().includes(s) ||
                u.team_name?.toLowerCase().includes(s) ||
                u.trade_name?.toLowerCase().includes(s) ||
                u.project_name?.toLowerCase().includes(s)
            );
        }
        if (filters.teams.length > 0) data = data.filter(u => filters.teams.includes(u.team_name));
        if (filters.trades.length > 0) data = data.filter(u => filters.trades.includes(u.trade_name));
        if (filters.projects.length > 0) data = data.filter(u => filters.projects.includes(u.project_name));
        return data;
    }, [userLocations, usersSearch, filters]);

    const groupedUsers = useMemo(() => groupByTeam(filteredUserLocations), [filteredUserLocations]);

    const usersWithLocation = useMemo(
        () => spreadOverlappingUsers(userLocations.filter((u) => u.latitude && u.longitude)),
        [userLocations],
    );

    return (
        <Box p={{xs: 1, sm: 2}}>
            <Box
                display="flex"
                justifyContent="space-between"
                alignItems={{xs: 'flex-start', sm: 'center'}}
                flexDirection={{xs: 'column', sm: 'row'}}
                gap={{xs: 1, sm: 0}}
            >
                <Box
                    display="flex"
                    width={{xs: '100%', sm: '80%'}}
                    gap={1}
                    alignItems="center"
                    flexWrap="wrap"
                >
                    <Tabs
                        value={activeTab}
                        onChange={handleTabChange}
                        sx={{
                            minHeight: 36,
                            '& .MuiTabs-indicator': {backgroundColor: '#007bff', height: 2},
                            '& .MuiTab-root': {
                                minHeight: 36,
                                textTransform: 'none',
                                fontSize: 14,
                                fontWeight: 400,
                                color: '#555',
                                padding: '0 8px',
                            },
                            '& .Mui-selected': {color: '#007bff', fontWeight: 600},
                        }}
                    >
                        <Tab label="Project"/>
                        <Tab label="Address"/>
                    </Tabs>

                    <TextField
                        size="small"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconSearch size={16}/>
                                </InputAdornment>
                            ),
                        }}
                        sx={{width: {xs: '100%', sm: '50%', md: '30%', lg: '25%'}}}
                    />

                    <DateTimePicker value={filterDateTime} onChange={setFilterDateTime}/>

                    <Button
                        variant="contained"
                        onClick={() => {
                            setFilterDialogOpen(true);
                            fetchResources();
                        }}
                    >
                        <IconFilter width={18}/>
                    </Button>
                </Box>

                <Box
                    display="flex"
                    alignItems="center"
                    gap={1}
                    flexWrap="wrap"
                    justifyContent={{xs: 'flex-start', sm: 'flex-end'}}
                    width={{xs: '100%', sm: 'auto'}}
                    mt={{xs: 0.5, sm: 0}}
                >
                    <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        onClick={() => setAddZoneOpen(true)}
                        sx={{textTransform: 'none', fontWeight: 600, height: 36, px: 2, whiteSpace: 'nowrap'}}
                    >
                        Add Zone
                    </Button>

                    <Button
                        variant="outlined"
                        size="small"
                        onClick={handleOpenUsers}
                        startIcon={<IconUsers size={16}/>}
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
                        <IconX/>
                    </IconButton>
                </Box>
            </Box>

            {/* ── Filter Dialog ── */}
            <Dialog
                open={Boolean(filterDialogOpen)}
                onClose={() => setFilterDialogOpen(false)}
                fullWidth
                maxWidth="sm"
                PaperProps={{
                    sx: {
                        position: 'fixed',
                        top: 80,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        m: 0,
                        borderRadius: 2,
                    },
                }}
            >
                <DialogTitle sx={{pb: 1}}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography fontWeight={700} fontSize={16}>Filters</Typography>
                        <IconButton size="small" onClick={() => setFilterDialogOpen(false)}>
                            <IconX size={20}/>
                        </IconButton>
                    </Box>
                </DialogTitle>

                <DialogContent>
                    <Stack spacing={3} mt={1}>
                        <TextField
                            select
                            label="Trade"
                            value={tempFilters.trades}
                            onChange={(e) => setTempFilters({
                                ...tempFilters,
                                trades: e.target.value as unknown as string[]
                            })}
                            SelectProps={{multiple: true, renderValue: (sel) => (sel as string[]).join(', ')}}
                            fullWidth
                        >
                            {resources.trades.map((t: any) => (
                                <MenuItem key={t.id ?? t} value={t.name ?? t}>{t.name ?? t}</MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            select
                            label="Team"
                            value={tempFilters.teams}
                            onChange={(e) => setTempFilters({
                                ...tempFilters,
                                teams: e.target.value as unknown as string[]
                            })}
                            SelectProps={{multiple: true, renderValue: (sel) => (sel as string[]).join(', ')}}
                            fullWidth
                        >
                            {resources.teams.map((t: any) => (
                                <MenuItem key={t.id ?? t} value={t.name ?? t}>{t.name ?? t}</MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            select
                            label="Project"
                            value={tempFilters.projects}
                            onChange={(e) => setTempFilters({
                                ...tempFilters,
                                projects: e.target.value as unknown as string[]
                            })}
                            SelectProps={{multiple: true, renderValue: (sel) => (sel as string[]).join(', ')}}
                            fullWidth
                        >
                            {resources.projects.map((p: any) => (
                                <MenuItem key={p.id ?? p} value={p.name ?? p}>{p.name ?? p}</MenuItem>
                            ))}
                        </TextField>
                    </Stack>
                </DialogContent>

                <DialogActions sx={{px: 3, pb: 2}}>
                    <Button
                        onClick={() => {
                            const empty = {teams: [], trades: [], projects: []};
                            setTempFilters(empty);
                            setFilters(empty);
                            setFilterDialogOpen(false);
                        }}
                        color="inherit"
                    >
                        Clear All
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => {
                            setFilters(tempFilters);
                            fetchUserLocations(true);
                            setFilterDialogOpen(false);
                        }}
                    >
                        Apply Filters
                    </Button>
                </DialogActions>
            </Dialog>

            <Box
                display="flex"
                gap={2}
                mt={2}
                sx={{
                    height: {xs: 'auto', md: 'calc(100vh - 130px)'},
                    flexDirection: {xs: 'column', md: 'row'},
                    overflow: {xs: 'visible', md: 'hidden'},
                }}
            >
                {/* ── Zones list panel ── */}
                <Box
                    sx={{
                        width: {xs: '100%', md: '32%'},
                        minWidth: {md: 260},
                        flexShrink: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        maxHeight: {xs: 360, md: 'unset'},
                    }}
                >
                    {/* Scrollable table area */}
                    <Box sx={{flex: 1, overflow: 'auto'}}>
                        <Paper>
                            <Table>
                                <TableHead>
                                    <TableRow sx={{background: '#f5f5f5'}}>
                                        <TableCell><b>Name</b></TableCell>
                                        <TableCell width={150}><b>Action</b></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filterData.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={2} align="center" sx={{py: 4}}>
                                                No zones found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        paginatedZones.map((z) => {
                                            const isHidden = hiddenZoneIds.has(z.id);
                                            return (
                                                <TableRow key={z.id}>
                                                    <TableCell>
                                                        <Typography sx={{color: 'text.primary', fontWeight: 600}}>
                                                            {z.name}
                                                        </Typography>
                                                        <Typography sx={{color: 'text.secondary'}}>
                                                            {z.project_name}
                                                        </Typography>
                                                        <Tooltip title={z.address_name || z.address} arrow>
                                                            <Typography
                                                                variant="body2"
                                                                sx={{
                                                                    color: 'text.disabled',
                                                                    maxWidth: 250,
                                                                    whiteSpace: 'nowrap',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    cursor: 'pointer',
                                                                }}
                                                            >
                                                                {z.address_name || z.address}
                                                            </Typography>
                                                        </Tooltip>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Box display="flex" gap={0.5}>
                                                            <IconButton
                                                                color={isHidden ? 'default' : 'success'}
                                                                onClick={() => {
                                                                    setHiddenZoneIds((prev) => {
                                                                        const newSet = new Set(prev);
                                                                        if (isHidden) newSet.delete(z.id);
                                                                        else newSet.add(z.id);
                                                                        return newSet;
                                                                    });
                                                                }}
                                                            >
                                                                {isHidden ? <IconEyeOff size={20}/> :
                                                                    <IconEye size={20}/>}
                                                            </IconButton>

                                                            <IconButton
                                                                color="primary"
                                                                onClick={() => {
                                                                    if (mainMapRef.current) {
                                                                        flyToZone(mainMapRef.current, z);
                                                                        setSelected(null);
                                                                    }
                                                                }}
                                                                title="Zoom to zone on map"
                                                            >
                                                                <IconMapPin size={20}/>
                                                            </IconButton>

                                                            <IconButton
                                                                color="primary"
                                                                onClick={() => {
                                                                    setAddZoneOpen(false);
                                                                    setSelected({...z, mode: 'edit'});
                                                                }}
                                                            >
                                                                <IconEdit size={20}/>
                                                            </IconButton>

                                                            <IconButton
                                                                color="error"
                                                                onClick={() => {
                                                                    setDeleteId(z.id);
                                                                    setDeleteConfirmOpen(true);
                                                                }}
                                                            >
                                                                <IconTrash size={20}/>
                                                            </IconButton>
                                                        </Box>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </Paper>
                    </Box>

                    {/* ── Pagination footer ── */}
                    {filterData.length > 0 && (
                        <>
                            <Divider/>
                            <Stack
                                direction="row"
                                alignItems="center"
                                justifyContent="space-between"
                                px={1.5}
                                pt={1}
                                pb={0.5}
                                flexShrink={0}
                            >
                                <Typography color="textSecondary" fontSize={13}>
                                    {filterData.length} Zones
                                </Typography>

                                <Box display="flex" alignItems="center" gap={0.5}>
                                    <Typography color="textSecondary" fontSize={13}>
                                        Page {zonePage + 1} of {totalZonePages} | Entries:
                                    </Typography>
                                    <CustomSelect
                                        value={zonePageSize}
                                        onChange={(e: { target: { value: any } }) => {
                                            setZonePageSize(Number(e.target.value));
                                            setZonePage(0);
                                        }}
                                    >
                                        {[10, 25, 50, 100, 200].map((size) => (
                                            <MenuItem key={size} value={size}>{size}</MenuItem>
                                        ))}
                                    </CustomSelect>
                                    <IconButton
                                        size="small"
                                        sx={{width: 30}}
                                        onClick={() => setZonePage((p) => p - 1)}
                                        disabled={zonePage === 0}
                                    >
                                        <IconChevronLeft/>
                                    </IconButton>
                                    <IconButton
                                        size="small"
                                        sx={{width: 30}}
                                        onClick={() => setZonePage((p) => p + 1)}
                                        disabled={(zonePage + 1) * zonePageSize >= filterData.length}
                                    >
                                        <IconChevronRight/>
                                    </IconButton>
                                </Box>
                            </Stack>
                        </>
                    )}
                </Box>

                {/* ── Map / Edit / Add panel ── */}
                <Box
                    sx={{
                        flex: 1,
                        minWidth: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'auto',
                        minHeight: {xs: 460, md: 'unset'},
                    }}
                >
                    <Box
                        sx={{
                            display: (!addZoneOpen && selected?.mode !== 'edit') ? 'flex' : 'none',
                            flex: 1,
                            flexDirection: 'column',
                            minHeight: {xs: 420, md: 'unset'},
                        }}
                    >
                        <AllZonesMap
                            zones={visibleZones}
                            isLoaded={isLoaded}
                            userLocations={usersOnMapVisible ? usersWithLocation : []}
                            onMapLoad={(map) => {
                                mainMapRef.current = map;
                            }}
                        />
                    </Box>

                    {selected?.mode === 'view' && !addZoneOpen && (
                        <ViewZoneMap key={selected.id} zone={selected} isLoaded={isLoaded}/>
                    )}

                    {selected?.mode === 'edit' && !addZoneOpen && (
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
            </Box>

            {/* ── Staff on Site Drawer ── */}
            <Drawer
                anchor="right"
                open={usersDrawerOpen}
                onClose={handleCloseUsers}
                sx={{
                    '& .MuiDrawer-paper': {
                        width: {xs: '100%', sm: 460},
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
                    sx={{borderBottom: '1px solid #f0f0f0'}}
                >
                    <Typography fontWeight={700} fontSize={13} letterSpacing={1}
                                sx={{textTransform: 'uppercase', color: '#444'}}>
                        Staff on Site
                    </Typography>
                    <IconButton size="small" onClick={handleCloseUsers}>
                        <IconX size={18}/>
                    </IconButton>
                </Box>

                <Box display="flex" gap={1} px={2} py={1.5} sx={{borderBottom: '1px solid #f0f0f0'}}>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="Search..."
                        value={usersSearch}
                        onChange={(e) => setUsersSearch(e.target.value)}
                        sx={{'& .MuiOutlinedInput-root': {borderRadius: 2, backgroundColor: '#fafafa', fontSize: 14}}}
                    />
                </Box>

                <Box sx={{flex: 1, overflowY: 'auto', px: 1.5, py: 1.5}}>
                    {userLocationsLoading ? (
                        <Typography color="textSecondary" textAlign="center" py={4} fontSize={14}>Loading
                            staff...</Typography>
                    ) : Object.keys(groupedUsers).length === 0 ? (
                        <Typography color="textSecondary" textAlign="center" py={4} fontSize={14}>No staff
                            found.</Typography>
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
                                        sx={{
                                            cursor: 'pointer',
                                            userSelect: 'none',
                                            '&:hover': {backgroundColor: '#fafafa'}
                                        }}
                                    >
                                        <Typography variant="body2" fontWeight={600} color="#1a1a1a" fontSize={14}>
                                            {teamName}
                                        </Typography>
                                        {isExpanded ? <IconChevronDown size={17} color="#888"/> :
                                            <IconChevronUp size={17} color="#888"/>}
                                    </Box>
                                    <Collapse in={isExpanded}>
                                        <Box sx={{borderTop: '1px solid #f2f2f2'}}>
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
                                                                    lng: Number(member.longitude)
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

            {/* ── Delete Confirm Dialog ── */}
            <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
                <DialogTitle>
                    Delete Zone
                    <IconButton onClick={() => setDeleteConfirmOpen(false)}
                                sx={{position: 'absolute', right: 12, top: 8}}>
                        <IconX size={20}/>
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
                '&:hover': {backgroundColor: '#fafafa'},
                transition: 'background 0.1s',
            }}
        >
            <Box sx={{position: 'relative', flexShrink: 0}}>
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
                <Typography variant="body2" fontWeight={600} noWrap sx={{fontSize: 14, color: '#1a1a1a'}}>
                    {member.user_name || `${member.first_name ?? ''} ${member.last_name ?? ''}`.trim()}
                </Typography>
                <Typography variant="caption" color="textSecondary" sx={{fontSize: 12}}>
                    {formatDateTime(member.last_seen)}
                </Typography>
            </Box>

            <Typography variant="caption" fontWeight={600}
                        sx={{color: statusColor, whiteSpace: 'nowrap', flexShrink: 0, fontSize: 13}}>
                {statusLabel}
            </Typography>

            <IconButton
                size="small"
                onClick={hasLocation ? onPinClick : undefined}
                sx={{color: '#555', flexShrink: 0, p: 0.5, '&:hover': {color: '#1976d2'}}}
            >
                <IconMapPin size={17}/>
            </IconButton>
        </Box>
    );
};

const UserMarker = ({user}: { user: any }) => {
    const [hovered, setHovered] = useState(false);
    const position = {lat: Number(user.latitude), lng: Number(user.longitude)};
    const initials = `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase();
    const isWorking = user.is_working ?? false;
    const pinColor = isWorking ? '#1976d2' : '#fc4b6c';
    const dotColor = isWorking ? '#4caf50' : '#fc4b6c';

    return (
        <OverlayView
            position={position}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            getPixelPositionOffset={() => ({x: -24, y: -58})}
        >
            <Box
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                sx={{position: 'relative', width: 48, height: 58, cursor: 'pointer'}}
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
                        }}/>
                        <Typography variant="body2" fontWeight={700} sx={{mb: 0.25}}>
                            {user.user_name || `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()}
                        </Typography>
                        {user.trade_name && <Typography variant="caption" color="textSecondary"
                                                        display="block">{user.trade_name}</Typography>}
                        {user.team_name && <Typography variant="caption" color="textSecondary"
                                                       display="block">Team: {user.team_name}</Typography>}
                        {user.supervisor_name && <Typography variant="caption" color="textSecondary"
                                                             display="block">Supervisor: {user.supervisor_name}</Typography>}
                        {user.last_seen && <Typography variant="caption" color="textSecondary"
                                                       display="block">{formatDateTime(user.last_seen)}</Typography>}
                        <Box display="inline-flex" alignItems="center" gap={0.5} mt={0.5}>
                            <Box sx={{width: 7, height: 7, borderRadius: '50%', backgroundColor: dotColor}}/>
                            <Typography variant="caption" sx={{color: dotColor, fontWeight: 600}}>
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
                        filter: hovered ? 'drop-shadow(0 6px 14px rgba(0,0,0,0.38))' : 'drop-shadow(0 3px 6px rgba(0,0,0,0.26))',
                        transition: 'filter 0.15s ease, transform 0.15s ease',
                        transform: hovered ? 'scale(1.12) translateY(-2px)' : 'scale(1)',
                    }}
                >
                    <svg width="48" height="58" viewBox="0 0 48 58" style={{position: 'absolute', top: 0, left: 0}}>
                        <path d="M24 0C13.507 0 5 8.507 5 19c0 14.25 19 39 19 39S43 33.25 43 19C43 8.507 34.493 0 24 0z"
                              fill={pinColor}/>
                        <circle cx="24" cy="19" r="16" fill="white"/>
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
                            <img src={user.user_thumb_image} alt={user.user_name}
                                 style={{width: '100%', height: '100%', objectFit: 'cover', display: 'block'}}/>
                        ) : (
                            <Typography
                                sx={{color: 'white', fontWeight: 700, fontSize: 13, lineHeight: 1, userSelect: 'none'}}>
                                {initials || <IconUsers size={16} color="white"/>}
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
        <Paper sx={{height: '100%', width: '100%', minHeight: 400}}>
            <GoogleMap
                mapContainerStyle={{width: '100%', height: '100%'}}
                zoom={12}
                center={LONDON_CENTER}
                onLoad={handleMapLoad}
            >
                {zones.map((zone) => {
                    const color = zone.color || '#1976d2';

                    if (zone.type === 'circle') {
                        const center = {lat: Number(zone.latitude), lng: Number(zone.longitude)};
                        return (
                            <React.Fragment key={zone.id}>
                                <OverlayView position={center} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
                                    <Box
                                        onClick={() => onZoneClick(zone)}
                                        sx={{
                                            cursor: 'pointer',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            transform: 'translate(-50%, -100%)',
                                            width: 'max-content'
                                        }}
                                    >
                                        <Box sx={{
                                            backgroundColor: '#fff',
                                            border: `2px solid ${color}`,
                                            borderRadius: '4px',
                                            px: 1.25,
                                            py: 0.35,
                                            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                                            mb: 0
                                        }}>
                                            <Typography sx={{
                                                fontSize: 12,
                                                fontWeight: 700,
                                                color: '#111',
                                                whiteSpace: 'nowrap'
                                            }}>{zone.name}</Typography>
                                        </Box>
                                        <Box sx={{width: '2px', height: '20px', backgroundColor: color}}/>
                                    </Box>
                                </OverlayView>
                                <Circle center={center} radius={Number(zone.radius)}
                                        options={{strokeColor: color, fillColor: color + '33'}}/>
                            </React.Fragment>
                        );
                    }

                    if (zone.type === 'polygon') {
                        if (!Array.isArray(zone.coordinates) || zone.coordinates.length < 3) return null;
                        const path = zone.coordinates.map((p: any) => ({lat: Number(p.lat), lng: Number(p.lng)}));
                        const centroid = {
                            lat: path.reduce((s: number, p: any) => s + p.lat, 0) / path.length,
                            lng: path.reduce((s: number, p: any) => s + p.lng, 0) / path.length,
                        };
                        return (
                            <React.Fragment key={zone.id}>
                                <OverlayView position={centroid} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
                                    <Box
                                        onClick={() => onZoneClick(zone)}
                                        sx={{
                                            cursor: 'pointer',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            transform: 'translate(-50%, -100%)',
                                            width: 'max-content'
                                        }}
                                    >
                                        <Box sx={{
                                            backgroundColor: '#fff',
                                            border: `2px solid ${color}`,
                                            borderRadius: '4px',
                                            px: 1.25,
                                            py: 0.35,
                                            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                                            mb: 0
                                        }}>
                                            <Typography sx={{
                                                fontSize: 12,
                                                fontWeight: 700,
                                                color: '#111',
                                                whiteSpace: 'nowrap'
                                            }}>{zone.name}</Typography>
                                        </Box>
                                        <Box sx={{width: '2px', height: '20px', backgroundColor: color}}/>
                                    </Box>
                                </OverlayView>
                                <Polygon paths={path}
                                         options={{strokeColor: color, fillColor: color + '33', strokeWeight: 2}}
                                         onClick={() => onZoneClick(zone)}/>
                            </React.Fragment>
                        );
                    }

                    if (zone.type === 'polyline') {
                        const path = zone.coordinates.map((p: any) => ({lat: Number(p.lat), lng: Number(p.lng)}));
                        const midpoint = path[Math.floor(path.length / 2)];
                        return (
                            <React.Fragment key={zone.id}>
                                <OverlayView position={midpoint} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
                                    <Box onClick={() => onZoneClick(zone)}
                                         sx={{cursor: 'pointer', color, width: 'max-content'}}
                                         className="map-site-label">
                                        <Typography>{zone.name}</Typography>
                                    </Box>
                                </OverlayView>
                                <Polyline path={path} options={{strokeColor: color, strokeWeight: 3}}
                                          onClick={() => onZoneClick(zone)}/>
                            </React.Fragment>
                        );
                    }

                    return null;
                })}

                {userLocations.map((u) => <UserMarker key={`user-${u.id}`} user={u}/>)}
            </GoogleMap>
        </Paper>
    );
};

const ViewZoneMap = ({zone, isLoaded}: { zone: any; isLoaded: boolean }) => {
    if (!isLoaded) return <Typography p={2}>Loading map...</Typography>;

    const color = zone.color || '#1976d2';
    const center = {lat: Number(zone.latitude), lng: Number(zone.longitude)};
    const path = zone?.coordinates ?? [];

    const polygonCenter = path.length > 0
        ? {
            lat: path.reduce((s: number, p: any) => s + p.lat, 0) / path.length,
            lng: path.reduce((s: number, p: any) => s + p.lng, 0) / path.length
        }
        : center;

    const polylineCenter = path.length > 0 ? path[Math.floor(path.length / 2)] : center;
    const markerPosition = zone.type === 'circle' ? center : zone.type === 'polygon' ? polygonCenter : polylineCenter;

    const handleMapLoad = (map: google.maps.Map) => {
        const bounds = new google.maps.LatLngBounds();
        if (zone.type === 'circle') {
            const circleCenter = new google.maps.LatLng(center.lat, center.lng);
            const radius = Number(zone.radius);
            [0, 90, 180, 270].forEach((deg) => bounds.extend(google.maps.geometry.spherical.computeOffset(circleCenter, radius, deg)));
        } else if (path.length > 0) {
            path.forEach((p: any) => bounds.extend(new google.maps.LatLng(p.lat, p.lng)));
        }
        map.fitBounds(bounds);
        map.setZoom(DEFAULT_ZOOM);
    };

    return (
        <Paper sx={{height: '100%', minHeight: 400}}>
            <GoogleMap
                mapContainerStyle={{width: '100%', height: '100%'}}
                zoom={DEFAULT_ZOOM}
                center={markerPosition}
                onLoad={handleMapLoad}
            >
                <Marker
                    position={markerPosition}
                    label={{text: zone.name || '', color, className: 'map-site-label'}}
                    icon={{path: google.maps.SymbolPath.CIRCLE, scale: 0}}
                />
                {zone.type === 'circle' && <Circle center={center} radius={Number(zone.radius)}
                                                   options={{strokeColor: color, fillColor: `${color}33`}}/>}
                {zone.type === 'polygon' &&
                    <Polygon paths={path} options={{strokeColor: color, fillColor: `${color}33`}}/>}
                {zone.type === 'polyline' && <Polyline path={path} options={{strokeColor: color, strokeWeight: 3}}/>}
            </GoogleMap>
        </Paper>
    );
};

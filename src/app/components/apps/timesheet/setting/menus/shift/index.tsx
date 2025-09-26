import React, { useState, useEffect } from 'react';
import {
    Box,
    TextField,
    Card,
    CardContent,
    Typography,
    Switch,
    Drawer, Alert, Snackbar,
} from '@mui/material';
import api from '@/utils/axios';
import ShiftSettings from './shift-settings';

interface Shift {
    id: number;
    name: string;
    days: string;
    time: string;
    break: string;
    enabled: boolean;
}

interface ShiftListsProps {
    onClose?: () => void;
}

const ShiftLists: React.FC<ShiftListsProps> = ({ onClose }) => {
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [editSidebar, setEditSidebar] = useState(false);
    const [shiftId, setShiftId] = useState<number | null>(null);

    const fetchShifts = async () => {
        try {
            const response = await api.get('/setting/get-shift-settings');
            if (response.data?.IsSuccess) {
                const transformedShifts: Shift[] = response.data.info.map((shift: any) => ({
                    id: shift.id,
                    name: shift.name,
                    days: shift.days
                        .filter((day: any) => day.status)
                        .map((day: any) => day.name.charAt(0).toUpperCase() + day.name.slice(1))
                        .join(',') || 'Every weekday',
                    time: `${shift.start_time} - ${shift.end_time}`,
                    break: shift.shift_breaks.length > 0
                        ? `${shift.shift_breaks[0].break_start_time} - ${shift.shift_breaks[0].break_end_time}`
                        : 'No break',
                    enabled: shift.status,
                }));
                setShifts(transformedShifts);
            }
        } catch (error) {
            console.error('Error fetching shifts:', error);
        }
    };

    useEffect(() => {
        fetchShifts();
    }, []);

    const toggleShift = async (id: number) => {
        const updatedShifts = shifts.map(shift =>
            shift.id === id ? { ...shift, enabled: !shift.enabled } : shift
        );
        setShifts(updatedShifts);

        const enabled = updatedShifts.find(shift => shift.id === id)?.enabled;

        try {
            await api.post('/setting/change-shift-status', {
                shift_id: id,
                status: enabled,
            });
        } catch (error) {
            console.error('Error toggling shift status:', error);
            // Revert state on error
            setShifts(shifts);
        }
    };

    const filteredShifts = shifts.filter(shift =>
        shift.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shift.days.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleEditShiftSidebar = (shiftId: number) => {
        setShiftId(shiftId);
        setEditSidebar(true);
    };

    const handleCloseSidebar = () => {
        setEditSidebar(false);
        setShiftId(null);
        fetchShifts(); // Refresh shifts after saving
    };

    return (
        <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', overflowY: 'auto' }}>
            <Box sx={{ p: 2, position: 'relative' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                        fullWidth
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    style={{ marginRight: '12px' }}
                                >
                                    <circle cx="11" cy="11" r="8" />
                                    <path d="m21 21-4.35-4.35" />
                                </svg>
                            ),
                        }}
                        sx={{
                            mb: 2,
                            borderRadius: '25px',
                            bgcolor: 'background.paper',
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '25px',
                            },
                            width: '100%',
                            maxWidth: '600px',
                            margin: '0 auto',
                        }}
                    />

                    {filteredShifts.map((shift) => (
                        <Card
                            onClick={() => handleEditShiftSidebar(shift.id)}
                            key={shift.id}
                            sx={{
                                borderRadius: 2,
                                boxShadow: 1,
                                border: '1px solid',
                                borderColor: 'divider',
                                width: '100%',
                                maxWidth: '600px',
                                margin: '0 auto',
                                maxHeight: '150px',
                                '&:hover': {
                                    cursor: 'pointer',
                                },
                            }}
                        >
                            <CardContent
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    padding: 2,
                                    wordBreak: 'break-word',
                                    height: '100%',
                                    maxHeight: 'inherit',
                                }}
                            >
                                <Box
                                    sx={{
                                        flex: 1,
                                        maxHeight: '118px',
                                        pr: 2,
                                    }}
                                >
                                    <Typography variant="h6" component="h3" sx={{ mb: 0.5, textTransform: 'capitalize' }}>
                                        {shift.name}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                        {shift.days}
                                    </Typography>
                                    <Typography variant="body2">
                                        <strong>Shift:</strong> {shift.time}
                                    </Typography>
                                    <Typography variant="body2">
                                        <strong>Break:</strong> {shift.break}
                                    </Typography>
                                </Box>
                                <Switch
                                    checked={shift.enabled}
                                    onChange={() => toggleShift(shift.id)}
                                    color="primary"
                                    aria-label={`Toggle ${shift.name} shift`}
                                    sx={{
                                        mt: 1,
                                        flexShrink: 0,
                                    }}
                                />
                            </CardContent>
                        </Card>
                    ))}
                </Box>

                {filteredShifts.length === 0 && searchQuery && (
                    <Typography sx={{ textAlign: 'center', color: 'text.secondary', py: 4 }}>
                        No shifts found matching "{searchQuery}"
                    </Typography>
                )}
            </Box>

            {/* Drawer instead of Box */}
            <Drawer
                anchor="right"
                open={editSidebar}
                onClose={handleCloseSidebar}
                sx={{
                    '& .MuiDrawer-paper': {
                        width: 500,
                        boxShadow: '-4px 0 12px rgba(0,0,0,0.1)',
                    },
                }}
            >
                {shiftId && (
                    <ShiftSettings
                        shiftId={shiftId}
                        onSaveSuccess={handleCloseSidebar}
                        onClose={handleCloseSidebar}
                    />
                )}
            </Drawer>
        </Box>
    );
};

export default ShiftLists;

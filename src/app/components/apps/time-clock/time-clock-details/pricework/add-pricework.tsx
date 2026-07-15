"use client";

import React, {useEffect, useMemo, useState} from 'react';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    FormControl,
    IconButton,
    MenuItem,
    Select,
    TextField,
    Typography,
} from '@mui/material';
import {IconX} from '@tabler/icons-react';
import api from '@/utils/axios';
import toast from 'react-hot-toast';

type Resource = { id: number; name: string };
type Address = Resource & { project_id: number };

interface AddPriceworkProps {
    onClose: () => void;
    userId?: number;
    companyId: number;
    selectUser?: boolean;
    onDataRefresh?: () => void | Promise<void>;
    pricework?: any;
}

const AddPricework: React.FC<AddPriceworkProps> = ({
    onClose,
    userId,
    companyId,
    selectUser = false,
    onDataRefresh,
    pricework,
}) => {
    const isEditMode = Boolean(pricework?.pricework_id);
    const [loading, setLoading] = useState(false);
    const [resourcesLoading, setResourcesLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [projects, setProjects] = useState<Resource[]>([]);
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [teams, setTeams] = useState<Resource[]>([]);
    const [units, setUnits] = useState<Resource[]>([]);
    const [selectedUser, setSelectedUser] = useState(userId ? String(userId) : '');
    const [projectId, setProjectId] = useState(pricework?.project_id ? String(pricework.project_id) : '');
    const [addressId, setAddressId] = useState(pricework?.address_id ? String(pricework.address_id) : '');
    const [teamId, setTeamId] = useState(pricework?.team_id ? String(pricework.team_id) : '');
    const [unitId, setUnitId] = useState(pricework?.unit_id ? String(pricework.unit_id) : '');
    const [workType, setWorkType] = useState(pricework?.work_type || '');
    const [amountPerUnit, setAmountPerUnit] = useState(pricework?.amount_per_unit != null ? String(pricework.amount_per_unit) : '');
    const [workComplete, setWorkComplete] = useState(pricework?.work_complete != null ? String(pricework.work_complete) : '');
    const [note, setNote] = useState(pricework?.note || '');

    const inputSx = {
        '& .MuiInputBase-input': {textAlign: 'left'},
        '& .MuiInputBase-input.Mui-disabled': {
            textAlign: 'left',
            WebkitTextFillColor: '#6b7280',
        },
        '& .MuiInputBase-inputMultiline': {textAlign: 'left'},
    };

    const selectSx = {
        textAlign: 'left',
        '& .MuiSelect-select': {
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
        },
    };

    const selectMenuProps = {
        disablePortal: true,
        anchorOrigin: {vertical: 'bottom', horizontal: 'left'} as const,
        transformOrigin: {vertical: 'top', horizontal: 'left'} as const,
        PaperProps: {
            sx: {
                mt: 0.5,
                maxHeight: 280,
                width: 'min(456px, calc(100vw - 48px))',
                maxWidth: 'calc(100vw - 48px)',
                border: '1px solid #d9e2ef',
                borderRadius: '8px',
                boxShadow: '0 8px 24px rgba(15, 23, 42, 0.14)',
                '& .MuiMenuItem-root': {
                    minHeight: 40,
                    px: 1.5,
                    textAlign: 'left',
                    justifyContent: 'flex-start',
                    whiteSpace: 'normal',
                },
            },
        },
        MenuListProps: {
            sx: {py: 0.5},
        },
    };

    useEffect(() => {
        const fetchResources = async () => {
            setResourcesLoading(true);
            setError(null);
            try {
                const requests: Promise<any>[] = [
                    api.get('/pricework/get-resources', {
                        params: selectUser && selectedUser ? {user_id: Number(selectedUser)} : undefined,
                    }),
                ];
                if (selectUser) requests.push(api.get('/user/list'));

                const [resourceResponse, userResponse] = await Promise.all(requests);
                setProjects(resourceResponse.data?.projects || []);
                setAddresses(resourceResponse.data?.addresses || []);
                setTeams(resourceResponse.data?.teams || []);
                setUnits(resourceResponse.data?.units || []);
                if (selectUser) setUsers(userResponse?.data?.info || []);
            } catch (resourceError: any) {
                setError(resourceError?.response?.data?.message || 'Failed to load pricework resources.');
            } finally {
                setResourcesLoading(false);
            }
        };

        fetchResources();
    }, [companyId, selectUser, selectedUser]);

    const totalAmount = useMemo(() => {
        const amount = Number(amountPerUnit);
        const completed = Number(workComplete);
        return Number.isFinite(amount) && Number.isFinite(completed) ? amount * completed : 0;
    }, [amountPerUnit, workComplete]);

    const filteredAddresses = useMemo(
        () => addresses.filter((address) => address.project_id === Number(projectId)),
        [addresses, projectId],
    );

    const handleSubmit = async () => {
        const targetUserId = selectUser ? Number(selectedUser) : Number(userId);
        if (!targetUserId) return setError('User is required.');
        if (!projectId) return setError('Project is required.');
        if (!addressId) return setError('Address is required.');
        if (!teamId) return setError('Team is required.');
        if (!workType.trim()) return setError('Work type is required.');
        if (!unitId) return setError('Unit is required.');
        if (amountPerUnit === '' || Number(amountPerUnit) < 0) return setError('Valid amount per unit is required.');
        if (workComplete === '' || Number(workComplete) < 0) return setError('Valid work complete is required.');

        setLoading(true);
        setError(null);
        try {
            const payload = {
                user_id: targetUserId,
                ...(isEditMode ? {pricework_id: Number(pricework.pricework_id)} : {}),
                project_id: Number(projectId),
                address_id: Number(addressId),
                team_id: Number(teamId),
                note: note.trim() || undefined,
                work_type: workType.trim(),
                unit_id: Number(unitId),
                amount_per_unit: Number(amountPerUnit),
                work_complete: Number(workComplete),
            };
            const response = isEditMode
                ? await api.put('/pricework/update', payload)
                : await api.post('/pricework/store', payload);

            toast.success(response.data?.message || `Pricework ${isEditMode ? 'updated' : 'added'} successfully.`);
            await onDataRefresh?.();
            onClose();
        } catch (submitError: any) {
            setError(submitError?.response?.data?.message || 'Failed to add pricework.');
        } finally {
            setLoading(false);
        }
    };

    const fieldLabel = (label: string) => (
        <Typography variant="body2" sx={{fontWeight: 600, mb: 0.75}}>{label}</Typography>
    );

    return (
        <Box sx={{height: '100%', display: 'flex', flexDirection: 'column'}}>
            <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 2, borderBottom: '1px solid #e5e7eb'}}>
                <Typography variant="h6" sx={{fontWeight: 700}}>{isEditMode ? 'Edit Pricework' : 'Add Pricework'}</Typography>
                <IconButton onClick={onClose}><IconX size={20}/></IconButton>
            </Box>

            <Box sx={{flex: 1, overflowY: 'auto', p: 3}}>
                {error && <Alert severity="error" sx={{mb: 2}}>{error}</Alert>}
                {resourcesLoading ? (
                    <Box sx={{display: 'flex', justifyContent: 'center', py: 5}}><CircularProgress/></Box>
                ) : (
                    <Box sx={{display: 'flex', flexDirection: 'column', gap: 2.25}}>
                        {selectUser && (
                            <FormControl fullWidth>
                                {fieldLabel('User')}
                                <Select size="small" value={selectedUser} onChange={(event) => setSelectedUser(event.target.value)} displayEmpty sx={selectSx} MenuProps={selectMenuProps}>
                                    <MenuItem value="" disabled>Select user</MenuItem>
                                    {users.map((user) => (
                                        <MenuItem key={user.id} value={String(user.id)}>
                                            {[user.first_name, user.last_name].filter(Boolean).join(' ') || user.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}

                        <FormControl fullWidth>
                            {fieldLabel('Project')}
                            <Select size="small" value={projectId} onChange={(event) => {
                                setProjectId(event.target.value);
                                setAddressId('');
                            }} displayEmpty sx={selectSx} MenuProps={selectMenuProps}>
                                <MenuItem value="" disabled>Select project</MenuItem>
                                {projects.map((project) => <MenuItem key={project.id} value={String(project.id)}>{project.name}</MenuItem>)}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth disabled={!projectId}>
                            {fieldLabel('Address')}
                            <Select size="small" value={addressId} onChange={(event) => setAddressId(event.target.value)} displayEmpty sx={selectSx} MenuProps={selectMenuProps}>
                                <MenuItem value="" disabled>Select address</MenuItem>
                                {filteredAddresses.map((address) => <MenuItem key={address.id} value={String(address.id)}>{address.name}</MenuItem>)}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth>
                            {fieldLabel('Team')}
                            <Select size="small" value={teamId} onChange={(event) => setTeamId(event.target.value)} displayEmpty sx={selectSx} MenuProps={selectMenuProps}>
                                <MenuItem value="" disabled>Select team</MenuItem>
                                {teams.map((team) => <MenuItem key={team.id} value={String(team.id)}>{team.name}</MenuItem>)}
                            </Select>
                        </FormControl>

                        <Box>
                            {fieldLabel('Work Type')}
                            <TextField fullWidth size="small" value={workType} onChange={(event) => setWorkType(event.target.value)} placeholder="e.g. Door Installation" sx={inputSx}/>
                        </Box>

                        <FormControl fullWidth>
                            {fieldLabel('Unit')}
                            <Select size="small" value={unitId} onChange={(event) => setUnitId(event.target.value)} displayEmpty sx={selectSx} MenuProps={selectMenuProps}>
                                <MenuItem value="" disabled>Select unit</MenuItem>
                                {units.map((unit) => <MenuItem key={unit.id} value={String(unit.id)}>{unit.name}</MenuItem>)}
                            </Select>
                        </FormControl>

                        <Box sx={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2}}>
                            <Box>
                                {fieldLabel('Amount Per Unit')}
                                <TextField fullWidth size="small" type="number" value={amountPerUnit} onChange={(event) => setAmountPerUnit(event.target.value)} inputProps={{min: 0, step: '0.01'}} sx={inputSx}/>
                            </Box>
                            <Box>
                                {fieldLabel('Work Complete')}
                                <TextField fullWidth size="small" type="number" value={workComplete} onChange={(event) => setWorkComplete(event.target.value)} inputProps={{min: 0, step: '0.01'}} sx={inputSx}/>
                            </Box>
                        </Box>

                        <Box>
                            {fieldLabel('Pricework Amount')}
                            <TextField fullWidth size="small" value={totalAmount.toFixed(2)} disabled sx={inputSx}/>
                        </Box>

                        <Box>
                            {fieldLabel('Note')}
                            <TextField fullWidth multiline minRows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add a note" sx={inputSx}/>
                        </Box>
                    </Box>
                )}
            </Box>

            <Box sx={{display: 'flex', justifyContent: 'flex-end', gap: 1.5, p: 2.5, borderTop: '1px solid #e5e7eb'}}>
                <Button variant="outlined" onClick={onClose} disabled={loading}>Cancel</Button>
                <Button variant="contained" onClick={handleSubmit} disabled={loading || resourcesLoading}>
                    {loading ? <CircularProgress size={22} color="inherit"/> : isEditMode ? 'Update Pricework' : 'Add Pricework'}
                </Button>
            </Box>
        </Box>
    );
};

export default AddPricework;

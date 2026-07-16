'use client';

import React, {useEffect, useMemo, useRef, useState} from 'react';
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
import {IconPhotoPlus, IconTrash, IconX} from '@tabler/icons-react';
import api from '@/utils/axios';
import toast from 'react-hot-toast';

type Resource = { id: number; name: string };
type ProjectResource = Resource & { team_ids?: number[] };
type Address = Resource & { project_id: number };
type ExistingAttachment = { id: number; image?: string; image_url?: string; url?: string };
type NewAttachment = { file: File; previewUrl: string };

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
                                                       pricework
}) => {
    const updateDecimalValue = (value: string, setter: React.Dispatch<React.SetStateAction<string>>) => {
        if (/^\d*(?:\.\d{0,2})?$/.test(value)) setter(value);
    };
    const isEditMode = Boolean(pricework?.pricework_id);
    const [loading, setLoading] = useState(false);
    const [resourcesLoading, setResourcesLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [projects, setProjects] = useState<ProjectResource[]>([]);
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
    const [existingAttachments, setExistingAttachments] = useState<ExistingAttachment[]>(
        Array.isArray(pricework?.attachments) ? pricework.attachments : [],
    );
    const [newAttachments, setNewAttachments] = useState<NewAttachment[]>([]);
    const [removedAttachmentIds, setRemovedAttachmentIds] = useState<number[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const hasFetchedResources = useRef(false);

    const addAttachments = (files: FileList | null) => {
        if (!files) return;
        const images = Array.from(files).filter((file) => file.type.startsWith('image/'));
        if (images.length !== files.length) setError('Only image files are allowed.');
        setNewAttachments((current) => [
            ...current,
            ...images.map((file) => ({file, previewUrl: URL.createObjectURL(file)})),
        ]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeNewAttachment = (index: number) => {
        setNewAttachments((current) => {
            URL.revokeObjectURL(current[index].previewUrl);
            return current.filter((_, itemIndex) => itemIndex !== index);
        });
    };

    const removeExistingAttachment = (attachment: ExistingAttachment) => {
        setExistingAttachments((current) => current.filter((item) => item.id !== attachment.id));
        setRemovedAttachmentIds((current) => [...current, attachment.id]);
    };

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
        if (hasFetchedResources.current) return;
        hasFetchedResources.current = true;

        const fetchResources = async () => {
            setResourcesLoading(true);
            setError(null);
            try {
                const requests: Promise<any>[] = [
                    api.get('/pricework/get-resources'),
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
    }, [companyId, selectUser]);

    const totalAmount = useMemo(() => {
        const amount = Number(amountPerUnit);
        const completed = Number(workComplete);
        return Number.isFinite(amount) && Number.isFinite(completed) ? amount * completed : 0;
    }, [amountPerUnit, workComplete]);

    const filteredAddresses = useMemo(
        () => addresses.filter((address) => address.project_id === Number(projectId)),
        [addresses, projectId],
    );

    const filteredTeams = useMemo(() => {
        const projectTeamIds = projects.find((project) => project.id === Number(projectId))?.team_ids ?? [];
        if (projectTeamIds.length === 0) return teams;
        return teams.filter((team) => projectTeamIds.includes(team.id));
    }, [projectId, projects, teams]);

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
            const payload = new FormData();
            payload.append('user_id', String(targetUserId));
            
            if (isEditMode) {
                payload.append('pricework_id', String(pricework.pricework_id));
            }
            
            payload.append('project_id', projectId);
            payload.append('address_id', addressId);
            payload.append('team_id', teamId);
            payload.append('note', note.trim());
            payload.append('work_type', workType.trim());
            payload.append('unit_id', unitId);
            payload.append('amount_per_unit', amountPerUnit);
            payload.append('work_complete', workComplete);
            
            if (removedAttachmentIds.length) {
                payload.append('remove_attachment_ids', removedAttachmentIds.join(','));
            }
            newAttachments.forEach(({file}) => payload.append('attachments', file));
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
            <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 3,
                py: 2,
                borderBottom: '1px solid #e5e7eb'
            }}>
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
                                <Select
                                    size="small" 
                                    value={selectedUser}
                                    onChange={(event) => setSelectedUser(event.target.value)} 
                                    displayEmpty
                                    sx={selectSx}
                                    MenuProps={selectMenuProps}
                                >
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
                            <Select 
                                size="small" 
                                value={projectId} 
                                onChange={(event) => {
                                    setProjectId(event.target.value);
                                    setAddressId('');
                                    setTeamId('');
                                }} 
                                displayEmpty
                                sx={selectSx} 
                                MenuProps={selectMenuProps}
                            >
                                <MenuItem value="" disabled>Select project</MenuItem>
                                {projects.map((project) => 
                                    <MenuItem key={project.id} value={String(project.id)}>
                                        {project.name}
                                    </MenuItem>
                                )}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth disabled={!projectId}>
                            {fieldLabel('Address')}
                            <Select 
                                size="small"
                                value={addressId}
                                onChange={(event) => setAddressId(event.target.value)} displayEmpty sx={selectSx}
                                MenuProps={selectMenuProps}
                            >
                                <MenuItem value="" disabled>Select address</MenuItem>
                                {filteredAddresses.map((address) =>
                                    <MenuItem key={address.id} value={String(address.id)}>
                                        {address.name}
                                    </MenuItem>
                                )}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth>
                            {fieldLabel('Team')}
                            <Select
                                size="small" 
                                value={teamId} 
                                onChange={(event) => setTeamId(event.target.value)}
                                displayEmpty 
                                sx={selectSx}
                                MenuProps={selectMenuProps}
                            >
                                <MenuItem value="" disabled>Select team</MenuItem>
                                {filteredTeams.map((team) =>
                                    <MenuItem key={team.id} value={String(team.id)}>{team.name}</MenuItem>
                                )}
                            </Select>
                        </FormControl>

                        <Box>
                            {fieldLabel('Work Type')}
                            <TextField
                                fullWidth
                                size="small"
                                value={workType}
                                onChange={(event) => setWorkType(event.target.value)}
                                placeholder="e.g. Door Installation"
                                inputProps={{
                                    inputMode: 'decimal',
                                    style: {textAlign: 'left'},
                                }}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        '& fieldset': {borderColor: '#e0e0e0'},
                                        '&:hover fieldset': {borderColor: '#bbb'},
                                        '&.Mui-focused fieldset': {borderColor: '#50ABFF'},
                                    },
                                    '& .MuiInputBase-input': {textAlign: 'left'},
                                }}
                            />
                        </Box>

                        <FormControl fullWidth>
                            {fieldLabel('Unit')}
                            <Select
                                size="small" 
                                value={unitId} 
                                onChange={(event) => setUnitId(event.target.value)}
                                displayEmpty 
                                sx={selectSx}
                                MenuProps={selectMenuProps}
                            >
                                <MenuItem value="" disabled>Select unit</MenuItem>
                                {units.map((unit) => 
                                    <MenuItem key={unit.id} value={String(unit.id)}>{unit.name}</MenuItem>
                                )}
                            </Select>
                        </FormControl>

                        <Box sx={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2}}>
                            <Box>
                                {fieldLabel('Amount Per Unit')}
                                <TextField
                                    fullWidth
                                    size="small"
                                    value={amountPerUnit}
                                    onChange={(event) => updateDecimalValue(event.target.value, setAmountPerUnit)}
                                    placeholder="0.00"
                                    inputProps={{
                                        inputMode: 'decimal',
                                        style: {textAlign: 'left'},
                                    }}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            '& fieldset': {borderColor: '#e0e0e0'},
                                            '&:hover fieldset': {borderColor: '#bbb'},
                                            '&.Mui-focused fieldset': {borderColor: '#50ABFF'},
                                        },
                                        '& .MuiInputBase-input': {textAlign: 'left'},
                                    }}
                                />
                            </Box>
                            <Box>
                                {fieldLabel('Work Complete')}
                                <TextField
                                    fullWidth
                                    size="small"
                                    value={workComplete}
                                    onChange={(event) => updateDecimalValue(event.target.value, setWorkComplete)}
                                    placeholder="00"
                                    inputProps={{
                                        inputMode: 'decimal',
                                        style: {textAlign: 'left'},
                                    }}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            '& fieldset': {borderColor: '#e0e0e0'},
                                            '&:hover fieldset': {borderColor: '#bbb'},
                                            '&.Mui-focused fieldset': {borderColor: '#50ABFF'},
                                        },
                                        '& .MuiInputBase-input': {textAlign: 'left'},
                                    }}
                                />
                            </Box>
                        </Box>

                        <Box>
                            {fieldLabel('Pricework Amount')}
                            <TextField
                                fullWidth
                                size="small"
                                value={totalAmount.toFixed(2)}
                                placeholder="00"
                                inputProps={{
                                    inputMode: 'decimal',
                                    style: {textAlign: 'left'},
                                }}
                                disabled
                            />
                        </Box>

                        <Box>
                            {fieldLabel('Note')}
                            <TextField 
                                fullWidth 
                                multiline 
                                minRows={3}
                                value={note}
                                onChange={(event) => setNote(event.target.value)} placeholder="Add a note"
                                sx={inputSx}
                            />
                        </Box>

                        <Box>
                            {fieldLabel('Attachments')}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                hidden
                                onChange={(event) => addAttachments(event.target.files)}
                            />
                            <Button
                                variant="outlined"
                                startIcon={<IconPhotoPlus size={18}/>}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                Add images
                            </Button>
                            {(existingAttachments.length > 0 || newAttachments.length > 0) && (
                                <Box sx={{display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1.25, mt: 1.5}}>
                                    {existingAttachments.map((attachment) => (
                                        <Box key={`existing-${attachment.id}`} sx={{position: 'relative', aspectRatio: '1', borderRadius: 1, overflow: 'hidden', border: '1px solid #e5e7eb'}}>
                                            <Box component="img" src={attachment.image_url || attachment.url || attachment.image} alt="Pricework attachment" sx={{width: '100%', height: '100%', objectFit: 'cover'}}/>
                                            <IconButton aria-label="Remove image" onClick={() => removeExistingAttachment(attachment)} size="small" sx={{position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(255,255,255,.9)', '&:hover': {bgcolor: '#fff'}}}>
                                                <IconTrash size={16}/>
                                            </IconButton>
                                        </Box>
                                    ))}
                                    {newAttachments.map((attachment, index) => (
                                        <Box key={attachment.previewUrl} sx={{position: 'relative', aspectRatio: '1', borderRadius: 1, overflow: 'hidden', border: '1px solid #e5e7eb'}}>
                                            <Box component="img" src={attachment.previewUrl} alt={attachment.file.name} sx={{width: '100%', height: '100%', objectFit: 'cover'}}/>
                                            <IconButton aria-label="Remove image" onClick={() => removeNewAttachment(index)} size="small" sx={{position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(255,255,255,.9)', '&:hover': {bgcolor: '#fff'}}}>
                                                <IconTrash size={16}/>
                                            </IconButton>
                                        </Box>
                                    ))}
                                </Box>
                            )}
                        </Box>
                    </Box>
                )}
            </Box>

            <Box sx={{display: 'flex', justifyContent: 'flex-end', gap: 1.5, p: 2.5, borderTop: '1px solid #e5e7eb'}}>
                <Button variant="outlined" onClick={onClose} disabled={loading}>Cancel</Button>
                <Button variant="contained" onClick={handleSubmit} disabled={loading || resourcesLoading}>
                    {loading 
                        ? <CircularProgress size={22} color="inherit"/> 
                        : isEditMode ? 'Update Pricework' : 'Add Pricework'
                    }
                </Button>
            </Box>
        </Box>
    );
};

export default AddPricework;

'use client';

import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    FormControl,
    IconButton,
    InputAdornment,
    MenuItem,
    Select,
    TextField,
    Typography,
} from '@mui/material';
import {IconCalendar, IconPhotoPlus, IconTrash, IconX} from '@tabler/icons-react';
import api from '@/utils/axios';
import toast from 'react-hot-toast';

type Resource = { id: number; name: string };
type ProjectResource = Resource & { team_ids?: number[] };
type Address = Resource & { project_id: number };
type UserResource = Resource & { first_name?: string; last_name?: string; trade_id?: number | null };
type SubCategoryResource = Resource & { category_id: number; task_id: number };
type CategoryResource = Resource & {
    task_id?: number;
    is_sub_category?: boolean;
    sub_categories?: SubCategoryResource[];
};
type ExistingAttachment = { id: number; image?: string; image_url?: string; url?: string };
type NewAttachment = { file: File; previewUrl: string };

const formatDisplayDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
};

const isValidDisplayDate = (value: string) => {
    const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return false;

    const [, day, month, year] = match;
    const parsedDate = new Date(Number(year), Number(month) - 1, Number(day));

    return parsedDate.getFullYear() === Number(year)
        && parsedDate.getMonth() === Number(month) - 1
        && parsedDate.getDate() === Number(day);
};

const displayDateToInputValue = (value: string) => {
    if (!isValidDisplayDate(value)) return '';

    const [day, month, year] = value.split('/');
    return `${year}-${month}-${day}`;
};

const normalizeDateDisplayValue = (value?: string | null) => {
    if (!value) return '';

    const trimmedValue = String(value).trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmedValue) && isValidDisplayDate(trimmedValue)) return trimmedValue;

    const isoMatch = trimmedValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
        const [, year, month, day] = isoMatch;
        return `${day}/${month}/${year}`;
    }

    const datePart = trimmedValue.split(' ')[0];
    const slashMatch = datePart.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashMatch) {
        const [, day, month, year] = slashMatch;
        return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }

    const parsedDate = new Date(trimmedValue);
    if (!Number.isNaN(parsedDate.getTime())) return formatDisplayDate(parsedDate);

    return '';
};

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
    const [users, setUsers] = useState<UserResource[]>([]);
    const [projects, setProjects] = useState<ProjectResource[]>([]);
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [teams, setTeams] = useState<Resource[]>([]);
    const [trades, setTrades] = useState<Resource[]>([]);
    const [units, setUnits] = useState<Resource[]>([]);
    const [categories, setCategories] = useState<CategoryResource[]>([]);
    const [selectedUser, setSelectedUser] = useState(userId ? String(userId) : '');
    const [tradeId, setTradeId] = useState(pricework?.trade_id ? String(pricework.trade_id) : '');
    const [projectId, setProjectId] = useState(pricework?.project_id ? String(pricework.project_id) : '');
    const [addressId, setAddressId] = useState(pricework?.address_id ? String(pricework.address_id) : '');
    const [teamId, setTeamId] = useState(pricework?.team_id ? String(pricework.team_id) : '');
    const [unitId, setUnitId] = useState(pricework?.unit_id ? String(pricework.unit_id) : '');
    const [categoryId, setCategoryId] = useState(pricework?.category_id ? String(pricework.category_id) : '');
    const [subCategoryId, setSubCategoryId] = useState(pricework?.sub_category_id ? String(pricework.sub_category_id) : '');
    const [priceworkDate, setPriceworkDate] = useState(
        normalizeDateDisplayValue(pricework?.pricework_date || pricework?.date_added) || formatDisplayDate(new Date()),
    );
    const [amountPerUnit, setAmountPerUnit] = useState(pricework?.amount_per_unit != null ? String(pricework.amount_per_unit) : '');
    const [workComplete, setWorkComplete] = useState(pricework?.work_complete != null ? String(pricework.work_complete) : '');
    const [note, setNote] = useState(pricework?.note || '');
    const [existingAttachments, setExistingAttachments] = useState<ExistingAttachment[]>(
        Array.isArray(pricework?.attachments) ? pricework.attachments : [],
    );
    const [newAttachments, setNewAttachments] = useState<NewAttachment[]>([]);
    const [removedAttachmentIds, setRemovedAttachmentIds] = useState<number[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dateInputRef = useRef<HTMLInputElement>(null);
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

    const openPriceworkDatePicker = () => {
        const dateInput = dateInputRef.current;
        if (!dateInput) return;

        if (typeof dateInput.showPicker === 'function') {
            dateInput.showPicker();
            return;
        }

        dateInput.click();
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
                const resourceResponse = await api.get('/pricework/get-resources');
                setProjects(resourceResponse.data?.projects || []);
                setAddresses(resourceResponse.data?.addresses || []);
                setTeams(resourceResponse.data?.teams || []);
                setTrades(resourceResponse.data?.trades || []);
                setUnits(resourceResponse.data?.units || []);
                setCategories(resourceResponse.data?.categories || []);
                setUsers(resourceResponse.data?.users || []);
            } catch (resourceError: any) {
                setError(resourceError?.response?.data?.message || 'Failed to load pricework resources.');
            } finally {
                setResourcesLoading(false);
            }
        };

        fetchResources();
    }, [companyId, selectUser]);

    useEffect(() => {
        setPriceworkDate(
            normalizeDateDisplayValue(pricework?.pricework_date || pricework?.date_added) || formatDisplayDate(new Date()),
        );
    }, [pricework?.pricework_id, pricework?.pricework_date, pricework?.date_added]);

    useEffect(() => {
        setCategoryId(pricework?.category_id ? String(pricework.category_id) : '');
        setSubCategoryId(pricework?.sub_category_id ? String(pricework.sub_category_id) : '');
    }, [pricework?.pricework_id, pricework?.category_id, pricework?.sub_category_id]);

    useEffect(() => {
        if (pricework?.trade_id) {
            setTradeId(String(pricework.trade_id));
            return;
        }

        const activeUserId = selectedUser || (userId ? String(userId) : '');
        const selectedUserTradeId = users.find((item) => String(item.id) === activeUserId)?.trade_id;
        setTradeId(selectedUserTradeId ? String(selectedUserTradeId) : '');
    }, [pricework?.pricework_id, pricework?.trade_id, selectedUser, userId, users]);

    const [priceSource, setPriceSource] = useState<'project' | 'base' | 'default'>('default');
    const [resolvingPrice, setResolvingPrice] = useState<boolean>(false);

    useEffect(() => {
        if (!projectId || (!categoryId && !subCategoryId)) {
            setPriceSource('default');
            return;
        }

        const resolvePrice = async () => {
            setResolvingPrice(true);
            try {
                const params: any = { project_id: projectId };
                if (categoryId) params.category_id = categoryId;
                if (subCategoryId) params.sub_category_id = subCategoryId;

                const res = await api.get('/pricework/resolve-price', { params });
                if (res.data?.IsSuccess && res.data?.info) {
                    const { price, source, is_project_price } = res.data.info;
                    setAmountPerUnit(price || '0.00');
                    setPriceSource(source || (is_project_price ? 'project' : 'base'));
                }
            } catch (err) {
                console.error('Failed to resolve price:', err);
            } finally {
                setResolvingPrice(false);
            }
        };

        resolvePrice();
    }, [projectId, categoryId, subCategoryId]);

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

    const selectedCategory = useMemo(
        () => categories.find((category) => category.id === Number(categoryId)) ?? null,
        [categories, categoryId],
    );

    const selectedSubCategory = useMemo(
        () => selectedCategory?.sub_categories?.find((subCategory) => subCategory.id === Number(subCategoryId)) ?? null,
        [selectedCategory, subCategoryId],
    );

    const selectedTaskId = selectedSubCategory?.task_id ?? selectedCategory?.task_id ?? null;

    const selectedWorkTypeLabel = useMemo(() => {
        if (!selectedCategory) return '';
        return selectedSubCategory ? `${selectedCategory.name} - ${selectedSubCategory.name}` : selectedCategory.name;
    }, [selectedCategory, selectedSubCategory]);

    const handleSubmit = async () => {
        const targetUserId = selectUser ? Number(selectedUser) : Number(userId);
        if (!targetUserId) return setError('User is required.');
        if (!projectId) return setError('Project is required.');
        if (!addressId) return setError('Address is required.');
        if (!teamId) return setError('Team is required.');
        if (!categoryId) return setError('Category is required.');
        if (!selectedTaskId) return setError('Please select a valid category/subcategory.');
        if (!priceworkDate) return setError('Pricework date is required.');
        if (!isValidDisplayDate(priceworkDate)) return setError('Pricework date must be in dd/MM/yyyy format.');
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
            if (tradeId) payload.append('trade_id', tradeId);
            payload.append('note', note.trim());
            payload.append('task_id', String(selectedTaskId));
            payload.append('category_id', categoryId);
            if (subCategoryId) payload.append('sub_category_id', subCategoryId);
            payload.append('work_type', selectedWorkTypeLabel);
            payload.append('pricework_date', priceworkDate);
            payload.append('unit_id', unitId);
            payload.append('amount_per_unit', amountPerUnit);
            payload.append('work_complete', workComplete);
            
            if (removedAttachmentIds.length) {
                payload.append('remove_attachment_ids', removedAttachmentIds.join(','));
            }
            newAttachments.forEach(({file}) => payload.append('attachments', file));
            const response = isEditMode
                ? await api.post('/pricework/update', payload)
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
                            {fieldLabel('Trade')}
                            <Select
                                size="small"
                                value={tradeId}
                                onChange={(event) => setTradeId(event.target.value)}
                                displayEmpty
                                sx={selectSx}
                                MenuProps={selectMenuProps}
                            >
                                <MenuItem value="" disabled>Select trade</MenuItem>
                                {trades.map((trade) => (
                                    <MenuItem key={trade.id} value={String(trade.id)}>
                                        {trade.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

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
                            {fieldLabel('Pricework Date')}
                            <input
                                ref={dateInputRef}
                                type="date"
                                style={{position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none'}}
                                tabIndex={-1}
                                value={displayDateToInputValue(priceworkDate)}
                                onChange={(event) => setPriceworkDate(
                                    normalizeDateDisplayValue(event.target.value) || priceworkDate,
                                )}
                            />
                            <TextField
                                fullWidth
                                size="small"
                                value={priceworkDate}
                                onClick={openPriceworkDatePicker}
                                onFocus={openPriceworkDatePicker}
                                onChange={(event) => setPriceworkDate(event.target.value)}
                                placeholder="dd/MM/yyyy"
                                inputProps={{
                                    style: {textAlign: 'left'},
                                    maxLength: 10,
                                }}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                aria-label="Select pricework date"
                                                edge="end"
                                                onClick={openPriceworkDatePicker}
                                            >
                                                <IconCalendar size={20}/>
                                            </IconButton>
                                        </InputAdornment>
                                    ),
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
                            {fieldLabel('Category')}
                            <Select
                                size="small"
                                value={categoryId}
                                onChange={(event) => {
                                    setCategoryId(event.target.value);
                                    setSubCategoryId('');
                                }}
                                displayEmpty
                                sx={selectSx}
                                MenuProps={selectMenuProps}
                            >
                                <MenuItem value="" disabled>Select category</MenuItem>
                                {categories.map((category) =>
                                    <MenuItem key={category.id} value={String(category.id)}>{category.name}</MenuItem>
                                )}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth disabled={!selectedCategory || !selectedCategory.sub_categories?.length}>
                            {fieldLabel('Sub Category')}
                            <Select
                                size="small"
                                value={subCategoryId}
                                onChange={(event) => setSubCategoryId(event.target.value)}
                                displayEmpty
                                sx={selectSx}
                                MenuProps={selectMenuProps}
                            >
                                <MenuItem value="">
                                    {selectedCategory?.sub_categories?.length ? 'Select sub category' : 'Select category first'}
                                </MenuItem>
                                {(selectedCategory?.sub_categories ?? []).map((subCategory) =>
                                    <MenuItem key={`${subCategory.id}-${subCategory.task_id}`} value={String(subCategory.id)}>
                                        {subCategory.name}
                                    </MenuItem>
                                )}
                            </Select>
                        </FormControl>

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
                                <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.75}>
                                    {fieldLabel('Amount Per Unit')}
                                    {priceSource === 'project' && (
                                        <Chip label="Project Price" color="primary" size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                                    )}
                                    {priceSource === 'base' && (
                                        <Chip label="Base Cost Fallback" color="warning" size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
                                    )}
                                </Box>
                                <TextField
                                    fullWidth
                                    size="small"
                                    value={resolvingPrice ? 'Resolving...' : amountPerUnit}
                                    disabled={true}
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

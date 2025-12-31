"use client";

import React, { useCallback, useEffect, useState } from 'react';
import {
    Box,
    IconButton,
    Typography,
    Select,
    MenuItem,
    TextField,
    Button,
    FormControl,
    Alert,
    InputAdornment,
    Popover,
    Avatar,
} from '@mui/material';
import { IconX, IconUpload, IconFile, IconTrash, IconCalendar } from '@tabler/icons-react';
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import api from '@/utils/axios';

interface Project { id: number; name: string; }
interface Address { id: number; name: string; project_id: number;}
interface Category { id: number; name: string; }

interface UploadedFile {
    file: File;
    preview?: string;
}

const AddExpense: React.FC<{ onClose: () => void; userId: number; companyId: number ,selecteUser: boolean}> = ({onClose, userId, companyId,selecteUser}) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState<string>('');
    const [selectedProject, setSelectedProject] = useState<string>('');
    const [selectedAddress, setSelectedAddress] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [amount, setAmount] = useState<string>('');
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [notes, setNotes] = useState<string>('');
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

    // Date picker popover state
    const [dateAnchorEl, setDateAnchorEl] = useState<HTMLElement | null>(null);

    // Fetch resources
    useEffect(() => {
        const fetchResources = async () => {
            setLoading(true);
            try {
                const res = await api.get('/expense/get-resources');
                setProjects(res.data.projects || []);
                setAddresses(res.data.addresses || []);
                setCategories(res.data.categories || []);
            } catch (err) {
                setError('Failed to load expense resources.');
            } finally {
                setLoading(false);
            }
        };
        fetchResources();
    }, []);

    useEffect(() => {
        setSelectedAddress('');
    }, [selectedProject]);

    const getUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get(`user/list`);
            setUsers(res.data.info || []);
        } catch (error) {
            setError('Failed to load users. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        getUsers();
    }, [selecteUser == true]);

    const filteredAddresses = React.useMemo(() => {
        if (!selectedProject) return [];
        return addresses.filter(
            (addr) => addr.project_id === Number(selectedProject)
        );
    }, [addresses, selectedProject]);

    // Cleanup preview URLs on unmount
    useEffect(() => {
        return () => {
            uploadedFiles.forEach(item => {
                if (item.preview) {
                    URL.revokeObjectURL(item.preview);
                }
            });
        };
    }, [uploadedFiles]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);

        // Filter for images and PDFs only
        const validFiles = files.filter(file => {
            const isImage = file.type.startsWith('image/');
            const isPDF = file.type === 'application/pdf';
            return isImage || isPDF;
        });

        if (validFiles.length !== files.length) {
            setError('Only image and PDF files are supported.');
        }

        // Create preview URLs for images
        const newFiles: UploadedFile[] = validFiles.map(file => {
            if (file.type.startsWith('image/')) {
                return {
                    file,
                    preview: URL.createObjectURL(file)
                };
            }
            return { file };
        });

        setUploadedFiles(prev => [...prev, ...newFiles]);

        // Reset input
        e.target.value = '';
    };

    const handleRemoveFile = (index: number) => {
        setUploadedFiles(prev => {
            const newFiles = [...prev];
            const removed = newFiles.splice(index, 1)[0];
            if (removed.preview) {
                URL.revokeObjectURL(removed.preview);
            }
            return newFiles;
        });
    };

    const formatDate = (date: Date | undefined) => {
        if (!date) return '';
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if(selecteUser == true && !selectedUser){
            setError('Please select user.');
            return;
        }

        if (!selectedProject || !selectedAddress || !selectedCategory || !amount || !date) {
            setError('Please fill in all required fields.');
            return;
        }

        // Create FormData for file upload
        const formData = new FormData();
        formData.append('user_id', selecteUser == true ? selectedUser : userId.toString());
        formData.append('company_id', companyId.toString());
        formData.append('project_id', selectedProject);
        formData.append('address_id', selectedAddress);
        formData.append('expense_category_id', selectedCategory);
        formData.append('total_amount', amount);
        formData.append('receipt_date', formatDate(date));
        formData.append('note', notes || '');

        // Append all files
        uploadedFiles.forEach((item, index) => {
            formData.append('files', item.file);
        });

        try {
            setLoading(true);
            const response = await api.post('/expense/add-expense', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (response.data.IsSuccess) {
                onClose();
            } else {
                setError(response.data.message || 'Failed to add expense.');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Something went wrong.');
        } finally {
            setLoading(false);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const handleDateClick = (event: React.MouseEvent<HTMLElement>) => {
        setDateAnchorEl(event.currentTarget);
    };

    const handleDateClose = () => {
        setDateAnchorEl(null);
    };

    const openDatePicker = Boolean(dateAnchorEl);

    return (
        <Box
            sx={{
                bgcolor: 'white',
                borderRadius: '12px',
                width: '100%',
                maxWidth: '560px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
            }}
        >
            {/* Header */}
            <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                px={3}
                py={2}
                borderBottom="1px solid #f0f0f0"
            >
                <Box display="flex" alignItems="center" gap={1.5}>
                    <IconButton onClick={onClose} size="small">
                        <IconX size={20} />
                    </IconButton>
                    <Typography variant="h6" fontWeight={600} fontSize="18px">
                        Add Expense
                    </Typography>
                </Box>
            </Box>

            {/* Form */}
            <Box component="form" onSubmit={handleSubmit} sx={{ flex: 1, overflowY: 'auto' }}>
                {error && (
                    <Box px={3} pt={2}>
                        <Alert severity="error" onClose={() => setError(null)}>
                            {error}
                        </Alert>
                    </Box>
                )}

                <Box px={3} py={3} display="flex" flexDirection="column" gap={3}>
                   {selecteUser == true && (
                        /* User */
                        <Box display="grid" gridTemplateColumns="140px 1fr" alignItems="center" gap={2}>
                            <Typography variant="body2" fontWeight={600} color="#1a1a1a">
                                User
                            </Typography>
                            <FormControl fullWidth size="small">
                                <Select
                                    value={selectedUser}
                                    onChange={(e) => setSelectedUser(e.target.value)}
                                    displayEmpty
                                    sx={{
                                        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e0e0e0' },
                                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#bbb' },
                                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#50ABFF' },
                                    }}
                                >
                                    <MenuItem value="" disabled>
                                        <span style={{ color: '#999' }}>Select User</span>
                                    </MenuItem>
                                    {users.map((user) => (
                                        <MenuItem key={user.id} value={user.id.toString()}>
                                            <Box display="flex" alignItems="center" gap={1}>
                                            <Avatar
                                                src={user?.user_image || user?.image}
                                                sx={{ width: 24, height: 24, fontSize: '12px' }}
                                            >
                                                {user?.first_name?.[0]?.toUpperCase()}
                                            </Avatar>
                                            <Typography sx={{ fontSize: '14px' }} component="span">
                                                {user?.first_name} {user?.last_name}
                                            </Typography>
                                        </Box>
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>
                    )}

                    {/* Project */}
                    <Box display="grid" gridTemplateColumns="140px 1fr" alignItems="center" gap={2}>
                        <Typography variant="body2" fontWeight={600} color="#1a1a1a">
                            Project
                        </Typography>
                        <FormControl fullWidth size="small">
                            <Select
                                value={selectedProject}
                                onChange={(e) => setSelectedProject(e.target.value)}
                                displayEmpty
                                sx={{
                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e0e0e0' },
                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#bbb' },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#50ABFF' },
                                }}
                            >
                                <MenuItem value="" disabled>
                                    <span style={{ color: '#999' }}>Select Project</span>
                                </MenuItem>
                                {projects.map((proj) => (
                                    <MenuItem key={proj.id} value={proj.id.toString()}>
                                        {proj.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>

                    {/* Address */}
                    <Box display="grid" gridTemplateColumns="140px 1fr" alignItems="center" gap={2}>
                        <Typography variant="body2" fontWeight={600} color="#1a1a1a">
                            Address
                        </Typography>
                        <FormControl fullWidth size="small" disabled={!selectedProject}>
                            <Select
                                value={selectedAddress}
                                onChange={(e) => setSelectedAddress(e.target.value)}
                                displayEmpty
                                sx={{
                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e0e0e0' },
                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#bbb' },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#50ABFF' },
                                }}
                            >
                                <MenuItem value="" disabled>
                                    <span style={{ color: '#999' }}>
                                        {selectedProject ? 'Select Address' : 'Select Project first'}
                                    </span>
                                </MenuItem>
                                {filteredAddresses.map((addr) => (
                                    <MenuItem key={addr.id} value={addr.id.toString()}>
                                        {addr.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>

                    {/* Category */}
                    <Box display="grid" gridTemplateColumns="140px 1fr" alignItems="center" gap={2}>
                        <Typography variant="body2" fontWeight={600} color="#1a1a1a">
                            Category
                        </Typography>
                        <FormControl fullWidth size="small">
                            <Select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                displayEmpty
                                sx={{
                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e0e0e0' },
                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#bbb' },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#50ABFF' },
                                }}
                            >
                                <MenuItem value="" disabled>
                                    <span style={{ color: '#999' }}>Select Category</span>
                                </MenuItem>
                                {categories.map((cat) => (
                                    <MenuItem key={cat.id} value={cat.id.toString()}>
                                        {cat.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>

                    {/* Amount */}
                    <Box display="grid" gridTemplateColumns="140px 1fr" alignItems="center" gap={2}>
                        <Typography variant="body2" fontWeight={600} color="#1a1a1a">
                            Sum of Total
                        </Typography>
                        <TextField
                            fullWidth
                            size="small"
                            value={amount}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
                                    setAmount(val);
                                }
                            }}
                            placeholder="0.00"
                            inputProps={{
                                inputMode: 'decimal',
                                style: { textAlign: 'left' },
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    '& fieldset': { borderColor: '#e0e0e0' },
                                    '&:hover fieldset': { borderColor: '#bbb' },
                                    '&.Mui-focused fieldset': { borderColor: '#50ABFF' },
                                },
                                '& .MuiInputBase-input': { textAlign: 'left' },
                            }}
                        />
                    </Box>

                    {/* Date of receipt */}
                    <Box display="grid" gridTemplateColumns="140px 1fr" alignItems="center" gap={2}>
                        <Typography variant="body2" fontWeight={600} color="#1a1a1a">
                            Date of receipt
                        </Typography>
                        <TextField
                            fullWidth
                            size="small"
                            value={formatDate(date)}
                            onClick={handleDateClick}
                            placeholder="dd/mm/yyyy"
                            InputProps={{
                                readOnly: true,
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconCalendar size={18} />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{
                                cursor: 'pointer',
                                '& .MuiOutlinedInput-root': {
                                    '& fieldset': { borderColor: '#e0e0e0' },
                                    '&:hover fieldset': { borderColor: '#bbb' },
                                    '&.Mui-focused fieldset': { borderColor: '#50ABFF' },
                                },
                                '& .MuiInputBase-input': {
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                },
                            }}
                        />
                        <Popover
                            open={openDatePicker}
                            anchorEl={dateAnchorEl}
                            onClose={handleDateClose}
                            anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'left',
                            }}
                            transformOrigin={{
                                vertical: 'top',
                                horizontal: 'left',
                            }}
                        >
                            <Box p={2}>
                                <DayPicker
                                    mode="single"
                                    selected={date}
                                    onSelect={(selectedDate) => {
                                        setDate(selectedDate);
                                        handleDateClose();
                                    }}
                                    disabled={{ after: new Date() }}
                                />
                            </Box>
                        </Popover>
                    </Box>

                    {/* Notes */}
                    <Box display="grid" gridTemplateColumns="140px 1fr" alignItems="start" gap={2}>
                        <Typography variant="body2" fontWeight={600} color="#1a1a1a">
                            Notes
                        </Typography>
                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            placeholder="Notes about the expense..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    '& fieldset': { borderColor: '#e0e0e0' },
                                    '&:hover fieldset': { borderColor: '#bbb' },
                                    '&.Mui-focused fieldset': { borderColor: '#50ABFF' },
                                },
                            }}
                        />
                    </Box>

                    {/* File Upload */}
                    <Box display="grid" gridTemplateColumns="140px 1fr" alignItems="start" gap={2}>
                        <Typography variant="body2" fontWeight={600} color="#1a1a1a">
                            Attachments
                        </Typography>
                        <Box>
                            <input
                                type="file"
                                id="file-upload"
                                multiple
                                accept="image/*,.pdf"
                                onChange={handleFileSelect}
                                style={{ display: 'none' }}
                            />
                            <label htmlFor="file-upload">
                                <Button
                                    component="span"
                                    variant="outlined"
                                    startIcon={<IconUpload size={18} />}
                                    sx={{
                                        textTransform: 'none',
                                        borderColor: '#e0e0e0',
                                        color: '#666',
                                        '&:hover': {
                                            borderColor: '#bbb',
                                            bgcolor: '#fafafa',
                                        },
                                    }}
                                >
                                    Upload Files
                                </Button>
                            </label>
                            <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                                Images and PDFs only
                            </Typography>

                            {/* Uploaded Files Grid */}
                            {uploadedFiles.length > 0 && (
                                <Box
                                    mt={2}
                                    display="grid"
                                    gridTemplateColumns="repeat(3, 1fr)"
                                    gap={1.5}
                                >
                                    {uploadedFiles.map((item, index) => (
                                        <Box
                                            key={index}
                                            position="relative"
                                            border="1px solid #e0e0e0"
                                            borderRadius="8px"
                                            overflow="hidden"
                                            bgcolor="#fafafa"
                                            sx={{
                                                '&:hover .delete-button': {
                                                    opacity: 1,
                                                }
                                            }}
                                        >
                                            {/* File Preview/Icon */}
                                            <Box
                                                display="flex"
                                                alignItems="center"
                                                justifyContent="center"
                                                height="100px"
                                                bgcolor={item.preview ? 'transparent' : '#e3f2fd'}
                                            >
                                                {item.preview ? (
                                                    <img
                                                        src={item.preview}
                                                        alt={item.file.name}
                                                        style={{
                                                            width: '100%',
                                                            height: '100%',
                                                            objectFit: 'cover',
                                                        }}
                                                    />
                                                ) : (
                                                    <IconFile size={40} color="#1976d2" />
                                                )}
                                            </Box>

                                            {/* File Info */}
                                            <Box p={1} bgcolor="white">
                                                <Typography
                                                    variant="caption"
                                                    fontWeight={500}
                                                    display="block"
                                                    noWrap
                                                    title={item.file.name}
                                                    sx={{ fontSize: '11px' }}
                                                >
                                                    {item.file.name}
                                                </Typography>
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                    sx={{ fontSize: '10px' }}
                                                >
                                                    {formatFileSize(item.file.size)}
                                                </Typography>
                                            </Box>

                                            {/* Delete Button */}
                                            <IconButton
                                                className="delete-button"
                                                size="small"
                                                onClick={() => handleRemoveFile(index)}
                                                sx={{
                                                    position: 'absolute',
                                                    top: 4,
                                                    right: 4,
                                                    bgcolor: 'rgba(255, 255, 255, 0.9)',
                                                    color: '#d32f2f',
                                                    opacity: 0,
                                                    transition: 'opacity 0.2s',
                                                    '&:hover': {
                                                        bgcolor: 'white',
                                                    },
                                                }}
                                            >
                                                <IconTrash size={16} />
                                            </IconButton>
                                        </Box>
                                    ))}
                                </Box>
                            )}
                        </Box>
                    </Box>
                </Box>

                {/* Footer */}
                <Box
                    display="flex"
                    justifyContent="flex-end"
                    gap={2}
                    px={3}
                    py={2.5}
                    borderTop="1px solid #f0f0f0"
                    bgcolor="#fafafa"
                >
                    <Button variant="outlined" color="inherit" onClick={onClose} sx={{ textTransform: 'none' }}>
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={loading || !selectedProject || !selectedAddress || !selectedCategory || !amount || !date}
                        sx={{
                            textTransform: 'none',
                            bgcolor: '#1e4db7',
                            '&:hover': { bgcolor: '#173a8c' },
                            '&:disabled': { bgcolor: '#e0e0e0' },
                        }}
                    >
                        {loading ? 'Saving...' : 'Add Expense'}
                    </Button>
                </Box>
            </Box>
        </Box>
    );
};

export default AddExpense;

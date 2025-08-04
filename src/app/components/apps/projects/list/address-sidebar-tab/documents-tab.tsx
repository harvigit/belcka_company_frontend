'use client';

import React, {useEffect, useState, useMemo} from 'react';
import {
    Avatar, Box, Button, Chip, IconButton, InputAdornment,
    TextField, Typography
} from '@mui/material';
import {Stack} from '@mui/system';
import {IconChevronRight, IconFilter, IconSearch} from '@tabler/icons-react';
import api from '@/utils/axios';
import {number} from 'yup';

interface DocumentsTabProps {
    addressId: number,
    projectId: number,
    companyId: number
}

export const DocumentsTab = ({addressId, projectId, companyId}: DocumentsTabProps) => {
    const [tabData, setTabData] = useState<any[]>([]);
    const [searchUser, setSearchUser] = useState<string>('');

    const fetchDocumentTabData = async () => {
        try {
            // const res = await api.get('/document/get-checklogs', {
            //     params: { project_id: projectId, address_id: addressId }
            // });
            //
            // if (res.data?.IsSuccess) {
            //     setTabData(res.data.info || []);
            // } else {
            //     setTabData([]);
            // }
        } catch {
            setTabData([]);
        }
    };

    const formatHour = (val: string | number | null | undefined): string => {
        if (val === null || val === undefined) return '-';
        const num = parseFloat(val.toString());
        if (isNaN(num)) return '-';

        const h = Math.floor(num);
        const m = Math.round((num - h) * 60);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        if (addressId && projectId) {
            fetchDocumentTabData();
        }
    }, [addressId, projectId]);

    const filteredData = useMemo(() => {
        const search = searchUser.trim().toLowerCase();
        if (!search) return tabData;
        return tabData.filter(
            (item) =>
                item.user_name?.toLowerCase().includes(search) ||
                item.document_name?.toLowerCase().includes(search)
        );
    }, [searchUser, tabData]);

    return (
        <Box>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                <TextField
                    placeholder="Search..."
                    size="small"
                    value={searchUser}
                    onChange={(e) => setSearchUser(e.target.value)}
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconSearch size={16}/>
                            </InputAdornment>
                        )
                    }}
                    sx={{width: '80%'}}
                />
                <Button variant="outlined">
                    <IconFilter width={18}/>
                </Button>
            </Stack>

            {filteredData.length > 0 ? (
                filteredData.map((document, idx) => (
                    <Box key={idx} mb={1}>
                        <Box
                            sx={{
                                position: 'relative',
                                border: '1px solid #ccc',
                                borderRadius: 2,
                                p: 2,
                                mb: 2,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}
                        >
                            <Box
                                sx={{
                                    position: 'absolute',
                                    top: -10,
                                    right: 8,
                                    backgroundColor: '#007aff',
                                    color: 'white',
                                    width: 24,
                                    height: 24,
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold',
                                }}
                            >
                                {document.total_checklogs}
                            </Box>

                            <Box
                                sx={{
                                    position: 'absolute',
                                    top: -10,
                                    left: 16,
                                    backgroundColor: '#FF7A00',
                                    border: '1px solid #FF7A00',
                                    color: '#fff',
                                    fontSize: '11px',
                                    fontWeight: 500,
                                    px: 1,
                                    py: 0.2,
                                    borderRadius: '999px',
                                }}
                            >
                                {document.document_name}
                            </Box>

                            <Stack direction="row" spacing={2} alignItems="center">
                                <Avatar
                                    src={document.user_thumb_image || '/default-avatar.png'}
                                    alt={document.user_name}
                                    sx={{width: 56, height: 56}}
                                />
                                <Box>
                                    <Typography fontWeight="bold">{document.user_name}</Typography>
                                </Box>
                            </Stack>

                            <Stack direction="row" spacing={1} alignItems="center">
                                <Typography fontWeight="bold" fontSize="1.25rem">
                                    {formatHour(document.total_work_hours)} H
                                </Typography>
                                <IconButton>
                                    <IconChevronRight fontSize="small"/>
                                </IconButton>
                            </Stack>
                        </Box>
                    </Box>
                ))
            ) : (
                <Typography variant="body2" color="text.secondary">
                    No documents found for this address.
                </Typography>
            )}
        </Box>
    );
};

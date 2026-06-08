'use client';

import React, {useEffect, useMemo, useState} from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    List,
    ListItemButton,
    ListItemText,
    MenuItem,
    Stack,
    Typography,
} from '@mui/material';
import {IconChevronRight, IconX} from '@tabler/icons-react';
import api from '@/utils/axios';
import {FormTemplate} from './common';
import MobilePreview from './MobilePreview';
import CustomTextField from '@/app/components/forms/theme-elements/CustomTextField';

type Props = {
    open: boolean;
    onClose: () => void;
    onScratch: () => void;
    onSelected: (template: FormTemplate) => void;
};

const TemplateLibraryDialog = ({open, onClose, onScratch, onSelected}: Props) => {
    const [grouped, setGrouped] = useState<Record<string, FormTemplate[]>>({});
    const [category, setCategory] = useState('All');
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<FormTemplate | null>(null);

    useEffect(() => {
        if (!open) return;

        const fetchTemplates = async () => {
            try {
                const res = await api.get('forms/templates');
                const templates = res.data.info || {};
                setGrouped(templates);
                const first = Object.values(templates).flat()[0] as FormTemplate | undefined;
                setSelected(first || null);
            } catch (error) {
                console.error('Failed to fetch form templates', error);
            }
        };

        fetchTemplates();
    }, [open]);

    const categories = useMemo(() => ['All', ...Object.keys(grouped)], [grouped]);
    const templates = useMemo(() => {
        const source = category === 'All'
            ? Object.values(grouped).flat()
            : grouped[category] || [];

        return source.filter((template) => (
            `${template.name} ${template.description}`.toLowerCase().includes(search.toLowerCase())
        ));
    }, [category, grouped, search]);

    const groupedTemplates = useMemo(() => {
        if (category !== 'All') return {[category]: templates};

        return Object.entries(grouped).reduce((acc: Record<string, FormTemplate[]>, [groupName, groupTemplates]) => {
            const filteredTemplates = groupTemplates.filter((template) => (
                `${template.name} ${template.description}`.toLowerCase().includes(search.toLowerCase())
            ));
            if (filteredTemplates.length) acc[groupName] = filteredTemplates;
            return acc;
        }, {});
    }, [category, grouped, search, templates]);

    const selectTemplate = () => {
        if (!selected) return;
        onSelected(selected);
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
            <DialogTitle sx={{pr: 7}}>
                Template library
                <IconButton
                    onClick={onClose}
                    sx={{position: 'absolute', top: 10, right: 12}}
                >
                    <IconX size={22}/>
                </IconButton>
            </DialogTitle>
            <DialogContent>
                <Stack direction={{xs: 'column', md: 'row'}} spacing={3} sx={{minHeight: 620}}>
                    <Box sx={{width: {xs: '100%', md: 420}}}>
                        <Stack direction={{xs: 'column', sm: 'row'}} spacing={1.5} mb={2}>
                            <CustomTextField
                                select
                                size="small"
                                label="Category"
                                value={category}
                                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setCategory(event.target.value)}
                                sx={{minWidth: 150}}
                            >
                                {categories.map((item) => (
                                    <MenuItem key={item} value={item}>
                                        {item}
                                    </MenuItem>
                                ))}
                            </CustomTextField>
                            <CustomTextField
                                size="small"
                                placeholder="Search templates"
                                value={search}
                                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)}
                                fullWidth
                            />
                        </Stack>
                        <List disablePadding>
                            {Object.entries(groupedTemplates).map(([groupName, groupTemplates]) => (
                                <Box key={groupName} sx={{mb: 2}}>
                                    <Typography variant="subtitle2" mb={1}>
                                        {groupName}
                                    </Typography>
                                    {groupTemplates.map((template) => (
                                        <ListItemButton
                                            key={template.id}
                                            selected={selected?.id === template.id}
                                            onClick={() => setSelected(template)}
                                            sx={{
                                                borderRadius: 2,
                                                mb: 1,
                                                border: '1px solid',
                                                borderColor: selected?.id === template.id ? 'primary.light' : 'divider',
                                                bgcolor: selected?.id === template.id ? '#e3f2fd' : 'transparent',
                                            }}
                                        >
                                            <ListItemText
                                                primary={template.name}
                                                secondary={template.description}
                                            />
                                            <IconChevronRight size={18}/>
                                        </ListItemButton>
                                    ))}
                                </Box>
                            ))}
                        </List>
                    </Box>
                    <Box sx={{flex: 1}}>
                        <MobilePreview
                            title={selected?.name || 'Template preview'}
                            fields={selected?.fields || []}
                        />
                    </Box>
                </Stack>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mt={2}>
                    <Button onClick={onScratch} color="inherit">
                        Start from scratch
                    </Button>
                    <Button
                        variant="contained"
                        onClick={selectTemplate}
                        disabled={!selected}
                    >
                        Select this template
                    </Button>
                </Stack>
            </DialogContent>
        </Dialog>
    );
};

export default TemplateLibraryDialog;

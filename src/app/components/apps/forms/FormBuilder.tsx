'use client';

import React, {useEffect, useMemo, useState} from 'react';
import {
    Box,
    Button,
    Dialog,
    IconButton,
    Slide,
    Stack,
    Typography,
} from '@mui/material';
import {TransitionProps} from '@mui/material/transitions';
import {
    IconSettings,
    IconTemplate,
    IconX,
} from '@tabler/icons-react';
import toast from 'react-hot-toast';
import api from '@/utils/axios';
import {
    FormField,
    FormTemplate,
    normalizeFields,
    PublishWizardState,
} from './common';
import {
    buildPublishTargetPayload,
    createDefaultPublishWizardState,
    parsePublishWizardState,
} from './common/formBuilderUtils';
import MobilePreview from './MobilePreview';
import CustomTextField from '@/app/components/forms/theme-elements/CustomTextField';
import FormFieldsManager from './components/FormFieldsManager';
import PublishWizard from './components/PublishWizard';

const SlideUp = React.forwardRef(function SlideUp(
    props: TransitionProps & { children: React.ReactElement },
    ref: React.Ref<unknown>,
) {
    return <Slide direction="up" ref={ref} {...props} />;
});

export type FormEditorDrawerProps = {
    open: boolean;
    onClose: () => void;
    formId?: string;
    initialTemplate?: FormTemplate | null;
    onSaved?: (formId: string) => void;
};

/* Main Drawer component */
const FormEditorDrawer = ({open, onClose, formId, initialTemplate, onSaved}: FormEditorDrawerProps) => {
    const [name, setName] = useState('');
    const [formNameError, setFormNameError] = useState('');
    const [fieldsError, setFieldsError] = useState('');
    const [fields, setFields] = useState<FormField[]>([]);
    const [saving, setSaving] = useState(false);
    const [savingTemplate, setSavingTemplate] = useState(false);
    const [publishWizardOpen, setPublishWizardOpen] = useState(false);
    const [publishWizardState, setPublishWizardState] = useState<PublishWizardState>(createDefaultPublishWizardState);

    const isExisting = useMemo(() => Boolean(formId), [formId]);

    const closeEditor = () => {
        setPublishWizardOpen(false);
        onClose();
    };

    useEffect(() => {
        if (!open) {
            setPublishWizardOpen(false);
            return;
        }

        setName('');
        setFormNameError('');
        setFieldsError('');
        setFields([]);
        setPublishWizardState(createDefaultPublishWizardState());

        if (!formId) {
            if (initialTemplate) {
                setName(initialTemplate.name || '');
                setFields(normalizeFields(initialTemplate.fields));
            }
            return;
        }

        const fetchForm = async () => {
            try {
                const res = await api.get(`forms/${formId}`);
                const form = res.data.info;
                setName(form.name || '');
                setFields(normalizeFields(form.fields));
                setPublishWizardState(parsePublishWizardState(form.assigned_to ?? form.assignedTo, form.fields, form.publish_target ?? form.publishTarget));
            } catch (err) {}
        };
        fetchForm();
    }, [open, formId, initialTemplate?.id]);

    const saveForm = async () => {
        if (!name.trim()) {
            setFormNameError('Please enter\'s the form name.');
            setPublishWizardOpen(false);
            return;
        }

        setSaving(true);
        try {
            const publishTarget = buildPublishTargetPayload(publishWizardState);
            const currentTeamMemberCount = publishWizardState.selectedTeams.reduce(
                (sum, team) => sum + Number(team.memberCount || 0),
                0,
            );
            const currentAssigneeCount = currentTeamMemberCount + publishWizardState.selectedUsers.length;
            const payload = {
                name: name.trim(),
                status: 'DRAFT',
                assigned_to: `${publishWizardState.selectedTeams.length} teams, ${publishWizardState.selectedUsers.length} users (${currentAssigneeCount} current assignees)`,
                fields,
                publish_target: publishTarget,
            };

            const res = isExisting ? await api.put(`forms/${formId}`, payload) : await api.post('forms/store', payload);

            toast.success(res.data.message || 'Form saved');

            const savedId = res.data.info?.id || formId;
            if (savedId) onSaved?.(savedId);
            closeEditor();
        } catch (err) {
            toast.error((err as any)?.response?.data?.message || 'Failed to save form');
        } finally {
            setSaving(false);
        }
    };

    const saveAsTemplate = async () => {
        if (!name.trim()) {
            setFormNameError('Please enter\'s the form name.');
            return;
        }

        if (fields.length === 0) {
            setFieldsError('Add at least one field');
            return;
        }

        setSavingTemplate(true);
        try {
            const res = await api.post('forms/template/store', {
                name: name.trim(),
                fields,
            });
            
            toast.success(res.data.message || 'Template saved');
            setFormNameError('');
            setFieldsError('');
        } catch (err) {
            toast.error((err as any)?.response?.data?.message || 'Failed to save template');
        } finally {
            setSavingTemplate(false);
        }
    };

    const openPublishWizard = () => {
        if (!name.trim()) {
            setFormNameError('Please enter\'s the form name.');
            return;
        }

        if (fields.length === 0) {
            setFieldsError('Add at least one field');
            return;
        }

        setFormNameError('');
        setFieldsError('');
        setPublishWizardOpen(true);
    };

    return (
        <>
            <Dialog
                open={open}
                onClose={closeEditor}
                TransitionComponent={SlideUp}
                maxWidth={false}
                fullWidth
                sx={{
                    '& .MuiDialog-container': {
                        alignItems: 'flex-end',
                    },
                }}
                PaperProps={{
                    sx: {
                        position: 'fixed',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        width: '100%',
                        height: {xs: 'calc(100dvh - 16px)', sm: 'calc(100dvh - 28px)'},
                        borderRadius: {xs: '14px 14px 0 0', sm: '20px 20px 0 0'},
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        m: 0,
                        maxWidth: '100%',
                        maxHeight: '100%',
                    },
                }}
            >
                {/* Drawer top bar */}
                <Box
                    sx={{
                        flexShrink: 0,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                    }}
                >
                    {/* Title row */}
                    <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        px={{xs: 2, sm: 3}}
                        py={2}
                    >
                        <Typography fontWeight={700} fontSize={{xs: 15, sm: 17}}>
                            Form editor
                        </Typography>
                        <IconButton onClick={closeEditor} size="small" edge="end">
                            <IconX size={20}/>
                        </IconButton>
                    </Stack>
                </Box>

                {/* Body */}
                <Box
                    sx={{
                        flex: 1,
                        minHeight: 0,
                        overflow: 'auto',
                        bgcolor: '#fff',
                        px: {xs: 2, sm: 3, lg: 4},
                        py: {xs: 2, sm: 2.5},
                    }}
                >
                    <Box
                        sx={{
                            width: '100%',
                            maxWidth: 1480,
                            mx: 'auto',
                            display: 'grid',
                            gridTemplateColumns: {
                                xs: 'minmax(0, 1fr)',
                                md: 'minmax(0, 1fr) minmax(300px, 360px)',
                                xl: 'minmax(640px, 820px) minmax(360px, 460px)',
                            },
                            gap: {xs: 3, md: 4, xl: 6},
                            alignItems: 'start',
                            justifyContent: 'center',
                        }}
                    >
                        {/* Left: field editor */}
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                minHeight: {xs: 'auto', md: 'calc(100dvh - 190px)'},
                                maxHeight: {xs: 'none', md: 'calc(100dvh - 190px)'},
                                overflow: 'hidden',
                            }}
                        >
                            <FormFieldsManager
                                fields={fields}
                                setFields={setFields}
                                fieldsError={fieldsError}
                                setFieldsError={setFieldsError}
                                formNameInput={
                                    <CustomTextField
                                        className="custom_font"
                                        value={name}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                            setName(e.target.value);
                                            if (e.target.value.trim()) setFormNameError('');
                                        }}
                                        placeholder="Form Name"
                                        variant="outlined"
                                        fullWidth
                                        error={Boolean(formNameError)}
                                        helperText={formNameError}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                height: 44,
                                                borderRadius: 1.5,
                                                bgcolor: '#fff',
                                            },
                                        }}
                                    />
                                }
                            />
                        </Box>

	                        {/* Right: mobile preview */}
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                minHeight: {xs: 'auto', md: 'calc(100dvh - 190px)'},
                                overflow: 'visible',
                                bgcolor: '#fff',
                                p: {xs: 0, md: 2, xl: 3},
                                position: {md: 'sticky'},
                                top: {md: 0},
                            }}
                        >
                            <MobilePreview title={name} fields={fields}/>
                        </Box>
                    </Box>
                </Box>

                {/* Footer */}
                <Box
                    sx={{
                        flexShrink: 0,
                        borderTop: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                        px: {xs: 2, sm: 3},
                        py: {xs: 1.25, sm: 2},
                    }}
                >
                    <Stack
                        direction={{xs: 'column', sm: 'row'}}
                        spacing={1}
                        justifyContent="flex-end"
                        alignItems={{sm: 'center'}}
                    >
                        {/*<Button*/}
                        {/*    color="inherit"*/}
                        {/*    startIcon={<IconSettings size={17}/>}*/}
                        {/*    sx={{borderRadius: 1.5, color: '#111827', fontWeight: 700, width: {xs: '100%', sm: 'auto'}}}*/}
                        {/*>*/}
                        {/*    Settings*/}
                        {/*</Button>*/}
                        
                        <Button
                            variant="outlined"
                            startIcon={<IconTemplate size={17}/>}
                            onClick={saveAsTemplate}
                            disabled={savingTemplate || saving}
                            sx={{
                                borderRadius: 1.5,
                                minHeight: 38,
                                width: {xs: '100%', sm: 'auto'},
                                borderColor: '#0B55B7',
                                color: '#0B55B7',
                                fontWeight: 700,
                            }}
                        >
                            {savingTemplate ? 'Saving…' : 'Save as template'}
                        </Button>
                        
                        <Button
                            variant="contained"
                            onClick={openPublishWizard}
                            disabled={saving}
                            sx={{
                                borderRadius: 1.5,
                                minHeight: 38,
                                px: 3,
                                width: {xs: '100%', sm: 'auto'},
                                bgcolor: '#0B55B7',
                                fontWeight: 700,
                                '&:hover': {bgcolor: '#064AA3'},
                            }}
                        >
                            {saving ? 'Saving…' : 'Save'}
                        </Button>
                    </Stack>
                </Box>
            </Dialog>
            <PublishWizard
                open={publishWizardOpen}
                saving={saving}
                state={publishWizardState}
                onChange={setPublishWizardState}
                onBackToEditor={() => setPublishWizardOpen(false)}
                onConfirm={saveForm}
            />
        </>
    );
};

export default FormEditorDrawer;

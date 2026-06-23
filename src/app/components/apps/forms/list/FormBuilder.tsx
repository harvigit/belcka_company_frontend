'use client';

import React, {useEffect, useMemo, useState} from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Slide,
    Stack,
    Typography,
} from '@mui/material';

import {TransitionProps} from '@mui/material/transitions';
import {IconTemplate, IconX,} from '@tabler/icons-react';
import toast from 'react-hot-toast';
import api from '@/utils/axios';

import {FormField, FormTemplate, PublishWizardState} from '../types';
import {normalizeFields} from '../common/formBuilderConstants';
import {buildPublishTargetPayload, createDefaultPublishWizardState, parsePublishWizardState} from '../common/formBuilderUtils';
import MobilePreview from './MobilePreview';
import FormFieldsManager from './components/FormFieldsManager';
import PublishWizard from './components/PublishWizard';

import CustomTextField from '@/app/components/forms/theme-elements/CustomTextField';

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

const FormEditorDrawer = ({open, onClose, formId, initialTemplate, onSaved}: FormEditorDrawerProps) => {
    const [name, setName] = useState('');
    const [formNameError, setFormNameError] = useState('');
    const [fieldsError, setFieldsError] = useState('');
    const [fields, setFields] = useState<FormField[]>([]);
    const [saving, setSaving] = useState(false);
    const [savingTemplate, setSavingTemplate] = useState(false);
    const [publishWizardOpen, setPublishWizardOpen] = useState(false);
    const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
    const [savedFormId, setSavedFormId] = useState<string | undefined>(formId);
    const [initialDraftSignature, setInitialDraftSignature] = useState('');
    const [publishWizardState, setPublishWizardState] = useState<PublishWizardState>(createDefaultPublishWizardState);


    console.log(publishWizardState, 'publishWizardStatepublishWizardStatepublishWizardStatepublishWizardStatepublishWizardState')
    const activeFormId = savedFormId || formId;
    const isExisting = useMemo(() => Boolean(activeFormId), [activeFormId]);
    const draftSignature = useMemo(() => JSON.stringify({
        name: name.trim(),
        fields,
    }), [fields, name]);
    const hasDraftContent = useMemo(() => Boolean(name.trim()) || fields.length > 0, [fields.length, name]);
    const hasUnsavedDraft = useMemo(
        () => hasDraftContent && (!isExisting || draftSignature !== initialDraftSignature),
        [draftSignature, hasDraftContent, initialDraftSignature, isExisting],
    );

    const closeEditor = (force = false) => {
        setPublishWizardOpen(false);
        setCloseConfirmOpen(false);
        if (!force) setInitialDraftSignature(draftSignature);
        onClose();
    };

    const requestCloseEditor = () => {
        if (saving || savingTemplate) return;

        if (hasUnsavedDraft) {
            setCloseConfirmOpen(true);
            return;
        }

        closeEditor(true);
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
        setSavedFormId(formId);
        setCloseConfirmOpen(false);
        setInitialDraftSignature(JSON.stringify({name: '', fields: []}));
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
                const res = await api.get(`forms/details/${formId}`);
                const form = res.data.info;
                const normalizedFields = normalizeFields(form.fields);
                const normalizedName = form.name || '';
                setName(normalizedName);
                setFields(normalizedFields);
                setInitialDraftSignature(JSON.stringify({
                    name: normalizedName.trim(),
                    fields: normalizedFields,
                }));
                setPublishWizardState(parsePublishWizardState(form.assigned_to ?? form.assignedTo, form.fields, form.publish_target ?? form.publishTarget));
            } catch (err) {}
        };
        fetchForm();
    }, [open, formId, initialTemplate]);

    const buildDraftPayload = (draftName = name.trim()) => ({
        name: draftName,
        ...(!isExisting ? {status: 'DRAFT'} : {}),
        fields,
    });

    const buildPublishPayload = (draftName = name.trim(), status: 'PUBLISHED' | 'SCHEDULED') => {
        const publishTarget = buildPublishTargetPayload(publishWizardState);
        const currentTeamMemberCount = publishWizardState.selectedTeams.reduce(
            (sum, team) => sum + Number(team.memberCount || 0),
            0,
        );
        const currentAssigneeCount = currentTeamMemberCount + publishWizardState.selectedUsers.length;

        return {
            form_id: activeFormId,
            name: draftName,
            status,
            assigned_to: `${publishWizardState.selectedTeams.length} teams, ${publishWizardState.selectedUsers.length} users (${currentAssigneeCount} current assignees)`,
            publish_target: publishTarget,
        };
    };

    const getSavedFormId = (res: any) => res.data.info?.id || res.data.info?.form_id || res.data.form?.id || res.data.id || activeFormId;

    const saveDraft = async ({
        closeAfterSave = false,
        openPublishAfterSave = false,
        requireFields = false,
    } = {}) => {
        if (!name.trim()) {
            setFormNameError('Please enter\'s the form name.');
            return;
        }

        if (requireFields && fields.length === 0) {
            setFieldsError('Add at least one field');
            return;
        }

        setFormNameError('');
        setFieldsError('');
        setSaving(true);
        
        try {
            const payload = buildDraftPayload();
            const res = isExisting ? await api.post(`forms/edit/${activeFormId}`, payload) : await api.post('forms/store', payload);

            toast.success(res.data.message || 'Draft saved');

            const savedId = getSavedFormId(res);
            if (savedId) {
                const normalizedSavedId = String(savedId);
                setSavedFormId(normalizedSavedId);
                onSaved?.(normalizedSavedId);
            }

            setInitialDraftSignature(JSON.stringify({
                name: payload.name.trim(),
                fields,
            }));

            if (closeAfterSave) {
                closeEditor(true);
                return;
            }

            if (openPublishAfterSave) {
                setPublishWizardOpen(true);
            }
        } catch (err) {
            toast.error((err as any)?.response?.data?.message || 'Failed to save draft');
        } finally {
            setSaving(false);
        }
    };

    const saveForm = async () => {
        if (!name.trim()) {
            setFormNameError('Please enter\'s the form name.');
            setPublishWizardOpen(false);
            return;
        }

        setSaving(true);
        try {
            if (!activeFormId) {
                toast.error('Please save the form before publishing.');
                return;
            }

            const status = publishWizardState.settings.publishMode === 'schedule' ? 'SCHEDULED' : 'PUBLISHED';
            const payload = buildPublishPayload(name.trim(), status);

            const res = await api.post('forms/publish/store', payload);

            toast.success(res.data.message || 'Form saved');

            const savedId = getSavedFormId(res);
            if (savedId) {
                const normalizedSavedId = String(savedId);
                setSavedFormId(normalizedSavedId);
                onSaved?.(normalizedSavedId);
            }
            closeEditor(true);
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

    const saveDraftAndOpenPublishWizard = () => saveDraft({openPublishAfterSave: true, requireFields: true});

    return (
        <>
            <Dialog
                open={open && !publishWizardOpen}
                onClose={requestCloseEditor}
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
                <Box
                    sx={{
                        flexShrink: 0,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                    }}
                >
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
                        <IconButton onClick={requestCloseEditor} size="small" edge="end" disabled={saving || savingTemplate}>
                            <IconX size={20}/>
                        </IconButton>
                    </Stack>
                </Box>

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
                            height: '100%',
                            minHeight: 0,
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
                            overflow: 'hidden',
                            }}
                        >
                            <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                minHeight: 0,
                                height: '100%',
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

                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                minHeight: 0,
                                height: '100%',
                                overflow: 'auto',
                                bgcolor: '#fff',
                                p: {xs: 0, md: 2, xl: 3},
                            }}
                        >
                            <MobilePreview title={name} fields={fields}/>
                        </Box>
                    </Box>
                </Box>

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
                            onClick={saveDraftAndOpenPublishWizard}
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
                onBackToEditor={() => closeEditor(true)}
                onConfirm={saveForm}
            />
            <Dialog
                open={closeConfirmOpen}
                onClose={() => !saving && setCloseConfirmOpen(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle sx={{pr: 6}}>
                    Save draft?
                    <IconButton
                        aria-label="close"
                        onClick={() => setCloseConfirmOpen(false)}
                        disabled={saving}
                        sx={{
                            position: 'absolute',
                            right: 8,
                            top: 8,
                            color: (theme) => theme.palette.grey[500],
                        }}
                    >
                        <IconX size={20}/>
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Typography color="text.secondary" fontWeight={500}>
                        Do you want to save this form as a draft before closing?
                    </Typography>
                </DialogContent>
                <DialogActions sx={{px: 3, pb: 2}}>
                    <Button
                        onClick={() => closeEditor(true)}
                        color="inherit"
                        disabled={saving}
                    >
                        Don&apos;t save
                    </Button>
                    <Button
                        onClick={() => saveDraft({closeAfterSave: true})}
                        variant="contained"
                        disabled={saving}
                        sx={{bgcolor: '#0B55B7', '&:hover': {bgcolor: '#064AA3'}}}
                    >
                        {saving ? 'Saving…' : 'Save draft'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default FormEditorDrawer;

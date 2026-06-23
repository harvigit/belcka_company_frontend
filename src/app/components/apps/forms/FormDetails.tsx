'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { IconArrowLeft } from '@tabler/icons-react';
import toast from 'react-hot-toast';
import '@/app/global.css';
import api from '@/utils/axios';
import FormBuilderComponent from './list/FormBuilder';
import { PublishWizardState } from './types';

import { buildPublishTargetPayload, createDefaultPublishWizardState, parsePublishWizardState } from './common/formBuilderUtils';

import {
    DateRangeFilterValue,
    getPresetFilterValue,
    isDateInFilterRange,
} from './details/FormDetailsDateRangeFilter';

import FormDetailsArchiveConfirmDialog from './details/FormDetailsArchiveConfirmDialog';
import FormDetailsHeader from './details/FormDetailsHeader';
import FormDetailsListView from './details/FormDetailsListView';
import FormDetailsMobilePreviewDrawer from './details/FormDetailsMobilePreviewDrawer';
import PublishWizard from './list/components/PublishWizard';
import { normalizeFormRecord } from './common/formStatusUtils';

import {
    downloadElementAsPdf,
    getSubmissionFileName,
    PdfSubmissionTemplate,
} from './details/FormDetailsSubmissionPreview';

import FormDetailsSubmissionViewerDrawer from './details/FormDetailsSubmissionViewerDrawer';
import { buildUserRows, fullName, getApiErrorMessage } from './details/formDetailsHelpers';
import { DetailsForm, SubmissionListItem, UserRow } from './details/formDetailsTypes';

const FormDetails = ({ formId }: { formId: string }) => {
    
    const router = useRouter();
    const pdfTemplateRef = useRef<HTMLDivElement>(null);
    
    const [form, setForm] = useState<DetailsForm | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState(0);
    
    const [submissionSearch, setSubmissionSearch] = useState('');
    const [userSearch, setUserSearch] = useState('');
    const [userStatusFilter, setUserStatusFilter] = useState('all');
    const [submissionDateFilter, setSubmissionDateFilter] = useState<DateRangeFilterValue>(() => getPresetFilterValue('this_week'));
    const [userDateFilter, setUserDateFilter] = useState<DateRangeFilterValue>(() => getPresetFilterValue('this_week'));
    const [editorOpen, setEditorOpen] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [publishSettingsOpen, setPublishSettingsOpen] = useState(false);
    const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
    const [publishSettingsSaving, setPublishSettingsSaving] = useState(false);
    const [archiveLoading, setArchiveLoading] = useState(false);
    const [publishWizardState, setPublishWizardState] = useState<PublishWizardState>(createDefaultPublishWizardState);
    const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null);
    const [submissionViewerUserId, setSubmissionViewerUserId] = useState<number | null>(null);
    const [submissionViewerEntryId, setSubmissionViewerEntryId] = useState<number | null>(null);
    const [pdfItem, setPdfItem] = useState<SubmissionListItem | null>(null);
    const [pdfGeneratingEntryId, setPdfGeneratingEntryId] = useState<number | null>(null);

    const fetchForm = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get(`forms/details/${formId}`);
            setForm(res.data.info ? normalizeFormRecord(res.data.info) : null);
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Failed to fetch form details'));
        } finally {
            setLoading(false);
        }
    }, [formId]);

    useEffect(() => {
        fetchForm();
    }, [fetchForm]);

    const userRows = useMemo(() => buildUserRows(form), [form]);
    const submittedCount = userRows.filter((user) => user.submitted).length;
    const pendingCount = Math.max(userRows.length - submittedCount, 0);
    const progress = userRows.length ? Math.round((submittedCount / userRows.length) * 100) : 0;

    const filteredUsers = userRows.filter((user) => {
        const query = userSearch.trim().toLowerCase();
        
        const matchesQuery = !query || [user.first_name, user.last_name, user.email]
            .some((value) => String(value || '').toLowerCase().includes(query));
        const matchesStatus = userStatusFilter === 'all'
            || (userStatusFilter === 'submitted' && user.submitted) || (userStatusFilter === 'pending' && !user.submitted);
        
        const matchesDate = !user.last_submitted || isDateInFilterRange(user.last_submitted, userDateFilter);

        return matchesQuery && matchesStatus && matchesDate;
    });

    const submissionItems = useMemo<SubmissionListItem[]>(() => {
        const entries = Array.isArray(form?.formEntry) ? form.formEntry : [];
        const userRowsById = new Map(userRows.map((user) => [user.id, user]));

        return entries.map((entry: any) => {
            const userId = Number(entry.submitted_by_id || entry.submittedBy?.id);
            const userRow = userRowsById.get(userId);
            const userRowName = [userRow?.first_name, userRow?.last_name].filter(Boolean).join(' ');
            const name = userRowName || fullName(entry.submittedBy);
            const initials = name.split(/\s+/).map((part) => part.charAt(0)).join('').slice(0, 2).toUpperCase() || 'U';

            return {
                entry,
                user_id: userId,
                name,
                email: userRow?.email || entry.submittedBy?.email,
                avatar: userRow?.user_image || userRow?.user_thumb_image || entry.submittedBy?.user_image || entry.submittedBy?.user_thumb_image || entry.submittedBy?.image || null,
                trade_name: userRow?.trade_name || entry.submittedBy?.trade_name || null,
                initials,
                submitted_at: entry.created_at,
            };
        });
    }, [form, userRows]);

    const filteredSubmissionItems = submissionItems.filter((item) => {
        const query = submissionSearch.trim().toLowerCase();
        const matchesQuery = !query || [item.name, item.email, item.entry.id]
            .some((value) => String(value || '').toLowerCase().includes(query));
        const matchesDate = isDateInFilterRange(item.submitted_at, submissionDateFilter);

        return matchesQuery && matchesDate;
    });


    const selectedSubmissionItem = filteredSubmissionItems.find((item) => 
        item.entry.id === selectedEntryId) || filteredSubmissionItems[0] || null;
    const selectedEntry = selectedSubmissionItem?.entry || null;

    const submissionViewerItems = useMemo(
        () => submissionItems.filter((item) => item.user_id === submissionViewerUserId),
        [submissionItems, submissionViewerUserId],
    );

    const submissionViewerItem = submissionViewerItems.find((item) => item.entry.id === submissionViewerEntryId)
        || submissionViewerItems[0] || null;

    const submissionViewerIndex = submissionViewerItem
        ? Math.max(submissionViewerItems.findIndex((item) => item.entry.id === submissionViewerItem.entry.id), 0) : -1;

    const submissionViewerUser = userRows.find((user) => user.id === submissionViewerUserId);
    const submissionViewerName = submissionViewerItem?.name
        || [submissionViewerUser?.first_name, submissionViewerUser?.last_name].filter(Boolean).join(' ') || 'Submission';

    useEffect(() => {
        const selectedStillVisible = filteredSubmissionItems.some((item) => item.entry.id === selectedEntryId);

        if (!selectedStillVisible) {
            setSelectedEntryId(filteredSubmissionItems[0]?.entry.id || null);
        }

    }, [filteredSubmissionItems, selectedEntryId]);

    useEffect(() => {
        if (!submissionViewerUserId) return;

        const selectedStillExists = submissionViewerItems.some((item) => item.entry.id === submissionViewerEntryId);
        if (!selectedStillExists) {
            setSubmissionViewerEntryId(submissionViewerItems[0]?.entry.id || null);
        }
    }, [submissionViewerEntryId, submissionViewerItems, submissionViewerUserId]);

    const openSubmissionViewer = (user: UserRow) => {
        const userSubmission = submissionItems.find((item) => item.user_id === user.id);
        if (!userSubmission) return;

        setSubmissionViewerUserId(user.id);
        setSubmissionViewerEntryId(userSubmission.entry.id);
    };

    const closeSubmissionViewer = () => {
        setSubmissionViewerUserId(null);
        setSubmissionViewerEntryId(null);
    };

    const moveSubmissionViewer = (direction: -1 | 1) => {
        if (!submissionViewerItems.length || submissionViewerIndex < 0) return;

        const nextIndex = submissionViewerIndex + direction;
        if (nextIndex < 0 || nextIndex >= submissionViewerItems.length) return;

        setSubmissionViewerEntryId(submissionViewerItems[nextIndex].entry.id);
    };

    const handleDownloadSubmissionPdf = async (item: SubmissionListItem | null) => {
        if (!form || !item || pdfGeneratingEntryId) return;

        setPdfItem(item);
        setPdfGeneratingEntryId(item.entry.id);

        try {
            await new Promise<void>((resolve) => {
                requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
            });

            if (!pdfTemplateRef.current) {
                throw new Error('PDF template is not ready');
            }

            await downloadElementAsPdf(pdfTemplateRef.current, getSubmissionFileName(form, item));
        } catch (err) {
            toast.error('Failed to download submission PDF');
        } finally {
            setPdfGeneratingEntryId(null);
            setPdfItem(null);
        }
    };

    const openPublishSettings = () => {
        if (!form) return;

        setPublishWizardState(parsePublishWizardState(
            form.assigned_to ?? form.assignedTo,
            form.fields,
            form.publish_target ?? form.publishTarget,
        ));
        setPublishSettingsOpen(true);
    };

    const closePublishSettings = () => {
        setPublishSettingsOpen(false);
    };

    const savePublishSettings = async () => {
        if (!form || publishSettingsSaving) return;

        setPublishSettingsSaving(true);
        try {
            const publishTarget = buildPublishTargetPayload(publishWizardState);
            const currentTeamMemberCount = publishWizardState.selectedTeams.reduce(
                (sum, team) => sum + Number(team.memberCount || 0),
                0,
            );
            const currentAssigneeCount = currentTeamMemberCount + publishWizardState.selectedUsers.length;
            const status = publishWizardState.settings.publishMode === 'schedule' ? 'SCHEDULED' : 'PUBLISHED';

            const response = await api.post('forms/publish/store', {
                form_id: form.id,
                name: form.name,
                status,
                assigned_to: `${publishWizardState.selectedTeams.length} teams, ${publishWizardState.selectedUsers.length} users (${currentAssigneeCount} current assignees)`,
                publish_target: publishTarget,
            });

            toast.success(response.data?.message || 'Publish settings updated');
            setPublishSettingsOpen(false);
            await fetchForm();
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Failed to update publish settings'));
        } finally {
            setPublishSettingsSaving(false);
        }
    };

    const archiveForm = async () => {
        if (!form || archiveLoading) return;

        setArchiveLoading(true);
        try {
            const response = await api.post('forms/archive', {
                form_ids: String(form.id),
            }, {
                skipToast: true,
            } as any);

            toast.success(response.data?.message || 'Form archived successfully');
            setArchiveConfirmOpen(false);
            await fetchForm();
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Failed to archive form'));
        } finally {
            setArchiveLoading(false);
        }
    };

    if (loading) {
        return (
            <Stack alignItems="center" justifyContent="center" sx={{ minHeight: '55vh' }}>
                <CircularProgress />
            </Stack>
        );
    }

    if (!form) {
        return (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
                <Typography mb={2}>Form not found.</Typography>
                <Button startIcon={<IconArrowLeft size={18} />} onClick={() => router.push('/apps/forms')}>
                    Back to forms
                </Button>
            </Paper>
        );
    }

    return (
        <Box sx={{ height: { xs: 'auto', md: 'calc(100vh - 100px)' }, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormDetailsHeader
                form={form}
                onBack={() => router.push('/apps/forms')}
                onPreview={() => setPreviewOpen(true)}
                onEdit={() => setEditorOpen(true)}
                onEditPublishSettings={openPublishSettings}
                onArchive={() => setArchiveConfirmOpen(true)}
                archiveLoading={archiveLoading}
            />

            <FormDetailsListView
                form={form}
                tab={tab}
                onTabChange={setTab}
                submissionSearch={submissionSearch}
                onSubmissionSearchChange={setSubmissionSearch}
                submissionDateFilter={submissionDateFilter}
                onSubmissionDateFilterChange={setSubmissionDateFilter}
                filteredSubmissionItems={filteredSubmissionItems}
                selectedEntry={selectedEntry}
                selectedEntryId={selectedEntryId}
                onSelectEntry={setSelectedEntryId}
                selectedSubmissionItem={selectedSubmissionItem}
                pdfGeneratingEntryId={pdfGeneratingEntryId}
                onDownloadSubmissionPdf={handleDownloadSubmissionPdf}
                userSearch={userSearch}
                onUserSearchChange={setUserSearch}
                userDateFilter={userDateFilter}
                onUserDateFilterChange={setUserDateFilter}
                userStatusFilter={userStatusFilter}
                onUserStatusFilterChange={setUserStatusFilter}
                filteredUsers={filteredUsers}
                submittedCount={submittedCount}
                pendingCount={pendingCount}
                progress={progress}
                userRowsLength={userRows.length}
                onOpenSubmissionViewer={openSubmissionViewer}
            />

            <Box
                sx={{
                    position: 'fixed',
                    left: -10000,
                    top: 0,
                    width: 794,
                    pointerEvents: 'none',
                    zIndex: -1,
                }}
            >
                <Box ref={pdfTemplateRef}>
                    <PdfSubmissionTemplate form={form} item={pdfItem} />
                </Box>
            </Box>

            <FormBuilderComponent
                open={editorOpen}
                onClose={() => setEditorOpen(false)}
                formId={formId}
                onSaved={() => {
                    setEditorOpen(false);
                    fetchForm();
                }}
            />

            <PublishWizard
                open={publishSettingsOpen}
                saving={publishSettingsSaving}
                state={publishWizardState}
                initialStep={1}
                onChange={setPublishWizardState}
                onBackToEditor={closePublishSettings}
                onConfirm={savePublishSettings}
            />

            <FormDetailsArchiveConfirmDialog
                open={archiveConfirmOpen}
                formName={form.name || 'This form'}
                loading={archiveLoading}
                onClose={() => setArchiveConfirmOpen(false)}
                onConfirm={archiveForm}
            />

            <FormDetailsSubmissionViewerDrawer
                form={form}
                open={Boolean(submissionViewerUserId)}
                onClose={closeSubmissionViewer}
                submissionViewerUser={submissionViewerUser}
                submissionViewerName={submissionViewerName}
                submissionViewerItem={submissionViewerItem}
                submissionViewerItems={submissionViewerItems}
                submissionViewerIndex={submissionViewerIndex}
                pdfGeneratingEntryId={pdfGeneratingEntryId}
                onDownloadSubmissionPdf={handleDownloadSubmissionPdf}
                onMoveSubmissionViewer={moveSubmissionViewer}
            />

            <FormDetailsMobilePreviewDrawer
                form={form}
                open={previewOpen}
                onClose={() => setPreviewOpen(false)}
                onEdit={() => {
                    setPreviewOpen(false);
                    setEditorOpen(true);
                }}
            />
        </Box>
    );
};

export default FormDetails;

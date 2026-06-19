import React from 'react';
import { Box, Button, CircularProgress, Drawer, IconButton, Stack, Typography } from '@mui/material';
import { IconChevronLeft, IconChevronRight, IconDownload } from '@tabler/icons-react';
import dayjs from 'dayjs';
import FormUserIdentity from '../common/FormUserIdentity';
import ReadonlySubmissionPreview from './FormDetailsSubmissionPreview';
import { DetailsForm, SubmissionListItem, UserRow } from './formDetailsTypes';

type FormDetailsSubmissionViewerDrawerProps = {
    form: DetailsForm;
    open: boolean;
    onClose: () => void;
    submissionViewerUser?: UserRow;
    submissionViewerName: string;
    submissionViewerItem: SubmissionListItem | null;
    submissionViewerItems: SubmissionListItem[];
    submissionViewerIndex: number;
    pdfGeneratingEntryId: number | null;
    onDownloadSubmissionPdf: (item: SubmissionListItem | null) => void;
    onMoveSubmissionViewer: (direction: -1 | 1) => void;
};

const FormDetailsSubmissionViewerDrawer = ({
    form,
    open,
    onClose,
    submissionViewerUser,
    submissionViewerName,
    submissionViewerItem,
    submissionViewerItems,
    submissionViewerIndex,
    pdfGeneratingEntryId,
    onDownloadSubmissionPdf,
    onMoveSubmissionViewer,
}: FormDetailsSubmissionViewerDrawerProps) => {
    const submittedAt = submissionViewerItem?.entry.created_at 
        ? dayjs(submissionViewerItem.entry.created_at).format('DD/MM/YYYY [at] HH:mm') : '--';
    const submissionIdLabel = submissionViewerItem ? `, Submission ID: ${submissionViewerItem.entry.id}` : '';
    const isDownloading = pdfGeneratingEntryId === submissionViewerItem?.entry.id;

    return (
        <Drawer
            anchor="bottom"
            open={open}
            onClose={onClose}
            ModalProps={{
                keepMounted: true,
                BackdropProps: {
                    sx: {
                        bgcolor: 'rgba(31, 41, 55, 0.38)',
                        backdropFilter: 'blur(8px)',
                    },
                },
            }}
            sx={{
                '& .MuiDrawer-paper': {
                    width: '100%',
                    maxWidth: '100%',
                    height: '100%',
                    bgcolor: 'transparent',
                    boxShadow: 'none',
                    overflow: 'hidden',
                },
            }}
        >
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box
                    sx={{
                        height: 68,
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Button
                        variant="contained"
                        color="inherit"
                        onClick={onClose}
                        sx={{
                            minWidth: 64,
                            borderRadius: 999,
                            bgcolor: 'rgba(31, 41, 55, 0.58)',
                            color: '#fff',
                            boxShadow: 'none',
                            textTransform: 'none',
                            '&:hover': {
                                bgcolor: 'rgba(31, 41, 55, 0.72)',
                                boxShadow: 'none',
                            },
                        }}
                    >
                        Close
                    </Button>
                </Box>

                <Box
                    sx={{
                        flex: 1,
                        minHeight: 0,
                        bgcolor: '#F3F4F6',
                        borderTopLeftRadius: 3,
                        borderTopRightRadius: 3,
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    <Stack
                        direction={{ xs: 'column', md: 'row' }}
                        spacing={1.5}
                        alignItems={{ xs: 'stretch', md: 'center' }}
                        justifyContent="space-between"
                        sx={{
                            px: { xs: 2, md: 2.5 },
                            py: 2,
                            bgcolor: '#fff',
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                            flexShrink: 0,
                        }}
                    >
                        <Stack direction="row" spacing={1.25} alignItems="center" minWidth={0}>
                            <Box minWidth={0}>
                                <FormUserIdentity
                                    user={{
                                        name: submissionViewerName,
                                        user_image: submissionViewerUser?.user_thumb_image || submissionViewerUser?.user_image || null,
                                        trade_name: submissionViewerItem?.trade_name || submissionViewerUser?.trade_name,
                                    }}
                                />
                                
                                <Typography variant="caption" color="text.secondary" noWrap>
                                    {submittedAt}{submissionIdLabel}
                                </Typography>
                            </Box>
                        </Stack>

                        <Stack direction="row" spacing={1.25} alignItems="center" justifyContent={{ xs: 'space-between', md: 'flex-end' }}>
                            <Button
                                variant="outlined"
                                startIcon={isDownloading ? <CircularProgress size={17} thickness={5} /> : <IconDownload size={17} />}
                                disabled={!submissionViewerItem || Boolean(pdfGeneratingEntryId)}
                                onClick={() => onDownloadSubmissionPdf(submissionViewerItem)}
                                sx={{ borderRadius: 999, textTransform: 'none', whiteSpace: 'nowrap', bgcolor: '#fff' }}
                            >
                                {isDownloading ? 'Downloading...' : 'Download'}
                            </Button>
                        </Stack>
                    </Stack>

                    <Box sx={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex' }}>
                        <IconButton
                            aria-label="Previous submission"
                            disabled={submissionViewerIndex <= 0}
                            onClick={() => onMoveSubmissionViewer(-1)}
                            sx={{
                                position: 'absolute',
                                left: { xs: 6, md: 14 },
                                top: 12,
                                zIndex: 2,
                                color: 'text.secondary',
                            }}
                        >
                            <IconChevronLeft size={20} />
                        </IconButton>
                        
                        <IconButton
                            aria-label="Next submission"
                            disabled={submissionViewerIndex < 0 || submissionViewerIndex >= submissionViewerItems.length - 1}
                            onClick={() => onMoveSubmissionViewer(1)}
                            sx={{
                                position: 'absolute',
                                right: { xs: 6, md: 14 },
                                top: 12,
                                zIndex: 2,
                                color: 'text.secondary',
                            }}
                        >
                            <IconChevronRight size={20} />
                        </IconButton>
                        <ReadonlySubmissionPreview form={form} entry={submissionViewerItem?.entry || null} />
                    </Box>
                </Box>
            </Box>
        </Drawer>
    );
};

export default FormDetailsSubmissionViewerDrawer;

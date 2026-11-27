'use client';

import React, {useState} from 'react';
import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    Typography,
} from '@mui/material';
import {IconFileText} from '@tabler/icons-react';
import {ExpenseListItem} from '../types';
import ExpenseStatusBadge from './ExpenseStatusBadge';
import PhotoViewer, {SafeImage} from '@/app/components/apps/vehicles/shared/photo-viewer';

const isImage = (name?: string | null) => !!name && /\.(jpe?g|png|gif|webp|heic|bmp)(\?|$)/i.test(name);
const fileNameOf = (url: string) => decodeURIComponent(url.split('?')[0].split('/').pop() || '');

type Props = {
    expense: ExpenseListItem | null;
    onClose: () => void;
    onApprove: (id: number) => void;
    onReject: (id: number) => void;
};

// Details of a vehicle expense sent from the driver app; approve / reject go to the vehicle records.
const VehicleExpenseDialog: React.FC<Props> = ({expense, onClose, onApprove, onReject}) => {
    const [openAt, setOpenAt] = useState<number | null>(null);
    const vehicle = expense?.vehicle;
    if (!expense || !vehicle) return null;

    // photos and an image file open in the popup (previous / next, download); a PDF opens in a new tab
    const imageFile = vehicle.file && (isImage(vehicle.file.name) || isImage(vehicle.file.url)) ? vehicle.file : null;
    const slides = [
        ...vehicle.photos.map((src, i) => ({src, name: fileNameOf(src) || `Photo ${i + 1}`})),
        ...(imageFile ? [{src: imageFile.url, name: imageFile.name || fileNameOf(imageFile.url)}] : []),
    ];

    const rows: Array<[string, React.ReactNode]> = [
        ['Vehicle', vehicle.registration],
        ['Type', vehicle.kind_label],
        ['Date', expense.receiptDate],
        ['Submitted by', expense.submittedBy.name],
        ['Amount', `${expense.currency}${expense.amount.toFixed(2)}`],
        ['Supplier', vehicle.supplier || '-'],
        ['Project', expense.project],
        ['Note', expense.description],
        ...(expense.statusUpdatedByName
            ? [[expense.status === 'rejected' ? 'Rejected by' : 'Approved by', expense.statusUpdatedByName] as [string, string]]
            : []),
        ...(vehicle.reject_reason ? [['Reason', vehicle.reject_reason] as [string, string]] : []),
    ];

    return (
        <Dialog open onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="h6">{vehicle.kind_label}</Typography>
                    <Chip size="small" label="Vehicle" color="primary" variant="outlined"/>
                    <ExpenseStatusBadge status={expense.status}/>
                </Stack>
            </DialogTitle>
            <DialogContent>
                <Box display="grid" gridTemplateColumns="140px 1fr" rowGap={1.25} columnGap={2}>
                    {rows.map(([label, value]) => (
                        <React.Fragment key={label}>
                            <Typography className="f-14" color="text.secondary">{label}</Typography>
                            <Typography className="f-14" sx={{wordBreak: 'break-word'}}>{value || '-'}</Typography>
                        </React.Fragment>
                    ))}
                </Box>

                {(vehicle.photos.length > 0 || vehicle.file) && (
                    <Box mt={3}>
                        <Typography className="f-14" fontWeight={600} mb={1}>Receipt</Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {slides.map((slide, i) => (
                                <Box
                                    key={`${slide.src}${i}`}
                                    component="button"
                                    type="button"
                                    title={slide.name}
                                    onClick={() => setOpenAt(i)}
                                    sx={{width: 88, height: 88, p: 0, borderRadius: 1.5, overflow: 'hidden', border: '1px solid', borderColor: 'grey.300', cursor: 'zoom-in'}}
                                >
                                    <SafeImage src={slide.src} alt={slide.name} iconSize={32}/>
                                </Box>
                            ))}
                            {vehicle.file && !imageFile && (
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<IconFileText size={16}/>}
                                    href={vehicle.file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {vehicle.file.name || 'Open file'}
                                </Button>
                            )}
                        </Stack>
                    </Box>
                )}
            </DialogContent>
            <DialogActions sx={{px: 3, pb: 2}}>
                {expense.status === 'pending' && (
                    <>
                        <Button variant="contained" color="success" onClick={() => onApprove(expense.id)}>
                            Approve
                        </Button>
                        <Button variant="outlined" color="error" onClick={() => onReject(expense.id)}>
                            Reject
                        </Button>
                    </>
                )}
                <Button variant="outlined" onClick={onClose}>
                    Close
                </Button>
            </DialogActions>
            <PhotoViewer photos={slides} index={openAt} onClose={() => setOpenAt(null)}/>
        </Dialog>
    );
};

export default VehicleExpenseDialog;

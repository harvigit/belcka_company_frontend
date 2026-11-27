'use client';
import React from 'react';
import {
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Stack,
    Typography,
} from '@mui/material';
import {IconCheck, IconX} from '@tabler/icons-react';
import {PersonInline, PhotoThumbs, RegPlate} from './shared';
import {checklistSafe, DailyChecklist, formatDate, formatMiles, Vehicle} from './types';

const ChecklistDialog: React.FC<{
    checklist: DailyChecklist | null;
    vehicle: Vehicle | null;
    onClose: () => void;
}> = ({checklist, vehicle, onClose}) => {
    if (!checklist) return null;
    const safe = checklistSafe(checklist);
    return (
        <Dialog open onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>
                <Stack direction="row" spacing={1} alignItems="center">
                    <span>Daily checklist</span>
                    {vehicle && <RegPlate registration={vehicle.registration}/>}
                </Stack>
            </DialogTitle>
            <DialogContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="body2" color="textSecondary">
                        {formatDate(checklist.date)} · <PersonInline name={checklist.driver_name} image={checklist.driver_image}/> · {formatMiles(checklist.mileage)}
                    </Typography>
                    <Chip size="small" color={safe ? 'success' : 'error'}
                          label={safe ? 'Safe to drive' : 'Defects found'}/>
                </Stack>
                <Divider/>
                {checklist.items.map((i) => (
                    <Stack key={i.item} direction="row" spacing={1} alignItems="flex-start" py={0.75}>
                        {i.ok ? <IconCheck size={18} color="green"/> : <IconX size={18} color="red"/>}
                        <div>
                            <Typography variant="body2" fontWeight={i.ok ? 400 : 600}>
                                {i.item}
                            </Typography>
                            {i.note && (
                                <Typography variant="caption" color="error" display="block">
                                    {i.note}
                                </Typography>
                            )}
                            {!i.ok && (
                                <div style={{marginTop: 6}}>
                                    <PhotoThumbs photos={i.photos ?? []} size={64}/>
                                </div>
                            )}
                        </div>
                    </Stack>
                ))}
            </DialogContent>
            <DialogActions>
                <Button variant="outlined" onClick={onClose}>
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ChecklistDialog;

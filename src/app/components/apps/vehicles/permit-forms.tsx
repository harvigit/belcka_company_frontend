'use client';
import React, {useEffect, useState} from 'react';
import {Box, MenuItem, Stack, Typography} from '@mui/material';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import CustomTextField from '@/app/components/forms/theme-elements/CustomTextField';
import FormDrawer from '../inventory-new/shared/FormDrawer';
import FormField from '../inventory-new/shared/FormField';
import ConfirmDialog from '../inventory-new/shared/ConfirmDialog';
import {ParkingPermit, Vehicle} from './types';
import {NewPermit} from './useVehicles';

const blank = (vehicleId: number | null) => ({
    vehicle_id: vehicleId ? String(vehicleId) : '',
    zone: '',
    issuer: '',
    reference: '',
    valid_from: dayjs().format('YYYY-MM-DD'),
    valid_until: dayjs().add(1, 'year').subtract(1, 'day').format('YYYY-MM-DD'),
});

/** With `vehicle` it's for that vehicle; otherwise the user picks one. */
export const PermitDrawer: React.FC<{
    open: boolean;
    vehicle?: Vehicle | null;
    vehicles?: Vehicle[];
    onClose: () => void;
    onAdd: (permit: NewPermit) => Promise<void>;
}> = ({open, vehicle, vehicles = [], onClose, onAdd}) => {
    const [form, setForm] = useState(() => blank(vehicle?.id ?? null));
    const [showErrors, setShowErrors] = useState(false);

    useEffect(() => {
        if (open) {
            setForm(blank(vehicle?.id ?? null));
            setShowErrors(false);
        }
    }, [open, vehicle]);

    const picked = vehicle ?? vehicles.find((v) => String(v.id) === form.vehicle_id) ?? null;
    const errors = {
        vehicle: showErrors && !picked ? 'Choose the vehicle.' : '',
        zone: showErrors && !form.zone.trim() ? 'Enter the zone or car park.' : '',
        issuer: showErrors && !form.issuer.trim() ? 'Enter who issued it.' : '',
        valid_until:
            form.valid_until && form.valid_from && form.valid_until < form.valid_from
                ? 'Must be after the start date.'
                : showErrors && !form.valid_until
                    ? 'Choose the end date.'
                    : '',
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setShowErrors(true);
        if (
            !picked ||
            !form.zone.trim() ||
            !form.issuer.trim() ||
            !form.valid_from ||
            !form.valid_until ||
            form.valid_until < form.valid_from
        ) {
            toast.error('Please check the highlighted fields.');
            return;
        }
        try {
            await onAdd({
                vehicle_id: picked.id,
                zone: form.zone.trim(),
                issuer: form.issuer.trim(),
                reference: form.reference.trim(),
                valid_from: form.valid_from,
                valid_until: form.valid_until,
            });
        } catch {
            return;
        }
        toast.success(`Permit ${form.zone.trim()} added to ${picked.registration}.`);
        onClose();
    };

    if (!open) return null;

    return (
        <FormDrawer
            open
            title={vehicle ? `Add parking permit · ${vehicle.registration}` : 'Add parking permit'}
            onClose={onClose}
            onSubmit={submit}
            isSaving={false}
            submitLabel="Add permit"
        >
            <Typography variant="body2" color="textSecondary">
                A vehicle can have more than one permit. Permits you add here are active straight away.
            </Typography>
            {!vehicle && (
                <FormField label="Vehicle *">
                    <CustomTextField
                        select
                        fullWidth
                        value={form.vehicle_id}
                        onChange={(e: any) => setForm((f) => ({...f, vehicle_id: e.target.value}))}
                        error={!!errors.vehicle}
                        helperText={errors.vehicle}
                        slotProps={{select: {displayEmpty: true}}}
                    >
                        <MenuItem value="" disabled>
                            Choose a vehicle
                        </MenuItem>
                        {vehicles.map((v) => (
                            <MenuItem key={v.id} value={String(v.id)}>
                                {v.registration} · {v.make_model}
                            </MenuItem>
                        ))}
                    </CustomTextField>
                </FormField>
            )}
            <FormField label="Zone or car park *">
                <CustomTextField
                    value={form.zone}
                    onChange={(e: any) => setForm((f) => ({...f, zone: e.target.value.slice(0, 80)}))}
                    placeholder="Camden CA-F"
                    fullWidth
                    error={!!errors.zone}
                    helperText={errors.zone}
                />
            </FormField>
            <Stack direction="row" spacing={2}>
                <Box flex={1}>
                    <FormField label="Issued by *">
                        <CustomTextField
                            value={form.issuer}
                            onChange={(e: any) => setForm((f) => ({...f, issuer: e.target.value.slice(0, 80)}))}
                            placeholder="Camden Council"
                            fullWidth
                            error={!!errors.issuer}
                            helperText={errors.issuer}
                        />
                    </FormField>
                </Box>
                <Box flex={1}>
                    <FormField label="Permit reference">
                        <CustomTextField
                            value={form.reference}
                            onChange={(e: any) => setForm((f) => ({...f, reference: e.target.value.slice(0, 40)}))}
                            fullWidth
                        />
                    </FormField>
                </Box>
            </Stack>
            <Stack direction="row" spacing={2}>
                <Box flex={1}>
                    <FormField label="Valid from *">
                        <CustomTextField
                            type="date"
                            value={form.valid_from}
                            onChange={(e: any) => setForm((f) => ({...f, valid_from: e.target.value}))}
                            fullWidth
                        />
                    </FormField>
                </Box>
                <Box flex={1}>
                    <FormField label="Valid until *">
                        <CustomTextField
                            type="date"
                            value={form.valid_until}
                            onChange={(e: any) => setForm((f) => ({...f, valid_until: e.target.value}))}
                            fullWidth
                            error={!!errors.valid_until}
                            helperText={errors.valid_until}
                        />
                    </FormField>
                </Box>
            </Stack>
        </FormDrawer>
    );
};

/** Reject a driver permit request; reason is required and shown to the driver. */
export const PermitRejectDialog: React.FC<{
    permit: ParkingPermit | null;
    onClose: () => void;
    onReject: (id: number, reason: string) => Promise<void>;
}> = ({permit, onClose, onReject}) => {
    const [reason, setReason] = useState('');
    useEffect(() => setReason(''), [permit]);
    return (
        <ConfirmDialog
            open={!!permit}
            title="Reject permit request"
            message={permit ? `Reject ${permit.zone}? The driver sees your reason in the app.` : ''}
            confirmLabel="Reject"
            onClose={onClose}
            onConfirm={async () => {
                if (!permit) return;
                if (!reason.trim()) {
                    toast.error('Please add a reason for rejecting!');
                    return;
                }
                try {
                    await onReject(permit.id, reason.trim());
                } catch {
                    return;
                }
                toast.success(`${permit.zone} rejected.`);
                onClose();
            }}
        >
            <CustomTextField
                autoFocus
                fullWidth
                multiline
                minRows={2}
                placeholder="Reason..."
                value={reason}
                onChange={(e: any) => setReason(e.target.value.slice(0, 200))}
                sx={{mt: 2}}
            />
        </ConfirmDialog>
    );
};

// Pending first, then ending soon, active, starting later, ended, rejected.
export const PERMIT_ORDER = {pending: 0, expiring: 1, active: 2, upcoming: 3, expired: 4, rejected: 5} as const;

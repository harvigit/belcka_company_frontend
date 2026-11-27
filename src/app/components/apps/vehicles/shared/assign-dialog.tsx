'use client';
import React, {useEffect, useState} from 'react';
import {Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography} from '@mui/material';
import {Vehicle} from '../lib/types';
import {DriverOption} from '../hooks/useVehicles';
import {DriverName, DriverPicker, RegPlate} from '.';
import {busyExcept} from '../hooks/useVehicleEditor';

interface AssignDriverDialogProps {
    vehicle: Vehicle | null;
    drivers: DriverOption[];
    busyDriverIds: Map<number, string>;
    onClose: () => void;
    onSave: (vehicle: Vehicle, driver: DriverOption | null) => Promise<void>;
}

const AssignDriverDialog: React.FC<AssignDriverDialogProps> = ({vehicle, drivers, busyDriverIds, onClose, onSave}) => {
    const [driverId, setDriverId] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setDriverId(vehicle?.driver_id ?? null);
    }, [vehicle]);

    if (!vehicle) return null;

    const driver = drivers.find((d) => d.id === driverId) ?? null;
    const unchanged = driverId === vehicle.driver_id;
    // A private car always belongs to an employee, so its owner can only be changed, not removed.
    const isPrivate = vehicle.type === 'private';
    const canRemove = !!vehicle.driver_id && !isPrivate;
    // a company vehicle in service has no driver
    const inService = vehicle.status === 'in_service' && !isPrivate;

    const save = async () => {
        setSaving(true);
        try {
            await onSave(vehicle, driver);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>
                <Stack direction="row" spacing={1} alignItems="center">
                    <span>{vehicle.driver_id ? 'Change driver' : 'Assign driver'}</span>
                    <RegPlate registration={vehicle.registration} />
                </Stack>
            </DialogTitle>
            <DialogContent>
                <Stack spacing={2}>
                    {vehicle.driver_name && (
                        <Box>
                            <Typography variant="caption" color="textSecondary">
                                Current driver
                            </Typography>
                            <DriverName name={vehicle.driver_name} image={vehicle.driver_image} />
                        </Box>
                    )}
                    <Box>
                        <Typography mb={0.5}>New driver</Typography>
                        <DriverPicker
                            drivers={drivers}
                            value={driverId}
                            onChange={(d) => setDriverId(d?.id ?? null)}
                            busyDriverIds={busyExcept(busyDriverIds, vehicle.registration)}
                            disabled={inService}
                        />
                    </Box>

                    {vehicle.status === 'inactive' && !unchanged && driverId && (
                        <Alert severity="info">The vehicle is inactive. Assigning a driver sets it to Active.</Alert>
                    )}

                    {inService && (
                        <Alert severity="info">
                            This vehicle is in service, so it has no driver. Set it to Active to assign one.
                        </Alert>
                    )}

                    {isPrivate && vehicle.driver_id && (
                        <Typography variant="caption" color="textSecondary">
                            A private car always needs the employee who owns it. You can change the owner, but not
                            remove it.
                        </Typography>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                {canRemove && (
                    <Button
                        color="error"
                        disabled={saving}
                        onClick={async () => {
                            setSaving(true);
                            try {
                                await onSave(vehicle, null);
                            } finally {
                                setSaving(false);
                            }
                        }}
                        sx={{mr: 'auto'}}
                    >
                        Remove driver
                    </Button>
                )}
                <Button onClick={onClose} variant="outlined" color="primary">
                    Cancel
                </Button>
                <Button onClick={save} variant="contained" disabled={unchanged || !driverId || saving}>
                    {saving ? 'Saving...' : 'Save'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default AssignDriverDialog;

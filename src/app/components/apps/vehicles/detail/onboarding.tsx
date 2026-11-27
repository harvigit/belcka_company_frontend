'use client';
import React, {useState} from 'react';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    Chip,
    Divider,
    LinearProgress,
    MenuItem,
    Paper,
    Stack,
    Typography,
} from '@mui/material';
import {IconUserPlus} from '@tabler/icons-react';
import toast from 'react-hot-toast';
import CustomTextField from '@/app/components/forms/theme-elements/CustomTextField';
import ConfirmDialog from '../../inventory-new/shared/ConfirmDialog';
import {DriverName, PersonInline} from '../shared';
import {defaultTemplateFor, formatDate, ONBOARDING_TEMPLATES, Vehicle, VehicleOnboarding} from '../lib/types';
import {Section} from '../shared/common';

interface OnboardingTabProps {
    vehicle: Vehicle;
    onboardings: VehicleOnboarding[];
    readOnly: boolean;
    onAssign: () => void;
    onStart: (templateId: number) => Promise<void>;
    onToggle: (onboardingId: number, stepId: number) => Promise<void>;
}

const OnboardingTab: React.FC<OnboardingTabProps> = ({vehicle, onboardings, readOnly, onAssign, onStart, onToggle}) => {
    const [switchTo, setSwitchTo] = useState<number | null>(null);

    if (vehicle.type === 'private') {
        return (
            <Alert severity="info">
                Onboarding is for company vehicles. A private car only needs a valid MOT and insurance.
            </Alert>
        );
    }

    const current = vehicle.driver_id
        ? onboardings.filter((o) => o.driver_id === vehicle.driver_id).sort((a, b) => b.id - a.id)[0]
        : undefined;
    const earlier = onboardings.filter((o) => o !== current).sort((a, b) => b.started_at.localeCompare(a.started_at));

    const progress = (o: VehicleOnboarding) => {
        const done = o.steps.filter((s) => s.done_at).length;
        return {done, total: o.steps.length, pct: o.steps.length ? (done / o.steps.length) * 100 : 0};
    };

    if (!vehicle.driver_id) {
        return (
            <Stack spacing={2}>
                <Paper variant="outlined" sx={{p: 3, borderRadius: 2, borderStyle: 'dashed', textAlign: 'center'}}>
                    <Typography fontWeight={600}>No driver yet</Typography>
                    <Typography color="textSecondary" mb={2}>
                        When you give this vehicle to someone, their start list appears here: licence check, fuel card,
                        parking and toll accounts, handover photos.
                    </Typography>
                    {!readOnly && (
                        <Button variant="contained" startIcon={<IconUserPlus size={16} />} onClick={onAssign}>
                            Assign driver
                        </Button>
                    )}
                </Paper>
                {earlier.length > 0 && <EarlierLists list={earlier} progress={progress} />}
            </Stack>
        );
    }

    return (
        <Box display="flex" flexDirection="column" gap={3}>
            <Section
                title="Start list"
                subtitle="Things to sort out when a vehicle is given to a person. Tick each one when it is done."
                actions={
                    !readOnly && (
                        <CustomTextField
                            select
                            size="small"
                            label="Type"
                            value={current?.template_id ?? ''}
                            onChange={(e: any) => {
                                const id = Number(e.target.value);
                                if (!current) {
                                    onStart(id);
                                    toast.success('Start list created.');
                                } else if (id !== current.template_id) setSwitchTo(id);
                            }}
                            sx={{minWidth: 180}}
                        >
                            {ONBOARDING_TEMPLATES.map((t) => (
                                <MenuItem key={t.id} value={t.id}>
                                    {t.name}
                                </MenuItem>
                            ))}
                        </CustomTextField>
                    )
                }
            >
                {!current && !defaultTemplateFor(vehicle.type) ? (
                    <Paper variant="outlined" sx={{p: 3, borderRadius: 2, borderStyle: 'dashed', textAlign: 'center'}}>
                        <Typography color="textSecondary">
                            There are no onboarding types yet. Add one in Vehicles → Settings.
                        </Typography>
                    </Paper>
                ) : !current ? (
                    <Paper variant="outlined" sx={{p: 3, borderRadius: 2, borderStyle: 'dashed', textAlign: 'center'}}>
                        <Typography color="textSecondary" mb={2}>
                            No start list for {vehicle.driver_name} yet.
                        </Typography>
                        {!readOnly && (
                            <Button
                                variant="contained"
                                onClick={async () => {
                                    await onStart(defaultTemplateFor(vehicle.type)!.id);
                                    toast.success('Start list created.');
                                }}
                            >
                                Start {defaultTemplateFor(vehicle.type)!.name} list
                            </Button>
                        )}
                    </Paper>
                ) : (
                    <Paper variant="outlined" sx={{borderRadius: 2}}>
                        <Stack direction={{xs: 'column', sm: 'row'}} justifyContent="space-between" spacing={2} p={2}>
                            <Box>
                                <DriverName name={current.driver_name} image={current.driver_image} />
                                <Typography variant="caption" color="textSecondary">
                                    {current.template_name} list · started {formatDate(current.started_at)}
                                </Typography>
                            </Box>
                            <Box sx={{minWidth: 200}}>
                                {(() => {
                                    const p = progress(current);
                                    return (
                                        <>
                                            <Stack direction="row" justifyContent="space-between">
                                                <Typography variant="body2" fontWeight={600}>
                                                    {p.done} of {p.total} done
                                                </Typography>
                                                {p.done === p.total && (
                                                    <Chip size="small" color="success" label="Complete" />
                                                )}
                                            </Stack>
                                            <LinearProgress
                                                variant="determinate"
                                                value={p.pct}
                                                color={p.done === p.total ? 'success' : 'primary'}
                                                sx={{mt: 0.75, borderRadius: 1, height: 6}}
                                            />
                                        </>
                                    );
                                })()}
                            </Box>
                        </Stack>
                        <Divider />
                        {current.steps.map((s, i) => (
                            <React.Fragment key={s.id}>
                                {i > 0 && <Divider />}
                                <Stack direction="row" alignItems="center" spacing={1} px={1} py={0.5}>
                                    <Checkbox
                                        checked={!!s.done_at}
                                        disabled={readOnly}
                                        onChange={() => onToggle(current.id, s.id)}
                                        inputProps={{'aria-label': s.title}}
                                    />
                                    <Typography
                                        variant="body2"
                                        sx={{flex: 1, color: s.done_at ? 'text.secondary' : 'text.primary'}}
                                    >
                                        {s.title}
                                    </Typography>
                                    {s.done_at && (
                                        <Typography variant="caption" color="textSecondary" sx={{pr: 1}}>
                                            {formatDate(s.done_at)} ·{' '}
                                            <PersonInline name={s.done_by} image={s.done_by_image} />
                                        </Typography>
                                    )}
                                </Stack>
                            </React.Fragment>
                        ))}
                    </Paper>
                )}
            </Section>

            {earlier.length > 0 && <EarlierLists list={earlier} progress={progress} />}

            <ConfirmDialog
                open={switchTo !== null}
                title="Change list type"
                message={`Switch ${vehicle.driver_name}'s list to ${
                    ONBOARDING_TEMPLATES.find((t) => t.id === switchTo)?.name
                }? The ticks on the current list are cleared.`}
                confirmLabel="Switch"
                confirmColor="primary"
                onClose={() => setSwitchTo(null)}
                onConfirm={async () => {
                    if (switchTo === null) return;
                    await onStart(switchTo);
                    toast.success('List type changed.');
                    setSwitchTo(null);
                }}
            />
        </Box>
    );
};

const EarlierLists: React.FC<{
    list: VehicleOnboarding[];
    progress: (o: VehicleOnboarding) => {done: number; total: number};
}> = ({list, progress}) => (
    <Section title="Earlier drivers" subtitle="Start lists of people who had this vehicle before.">
        <Paper variant="outlined" sx={{borderRadius: 2}}>
            {list.map((o, i) => {
                const p = progress(o);
                return (
                    <React.Fragment key={o.id}>
                        {i > 0 && <Divider />}
                        <Stack direction="row" justifyContent="space-between" alignItems="center" px={2} py={1.25}>
                            <DriverName name={o.driver_name} image={o.driver_image} />
                            <Typography variant="body2" color="textSecondary">
                                {o.template_name} · {p.done}/{p.total} done · {formatDate(o.started_at)}
                            </Typography>
                        </Stack>
                    </React.Fragment>
                );
            })}
        </Paper>
    </Section>
);

export default OnboardingTab;

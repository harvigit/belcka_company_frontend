'use client';
import React, {useEffect, useRef, useState} from 'react';
import {Alert, Box, Button, Chip, MenuItem, Stack} from '@mui/material';
import {IconPhoto, IconUpload} from '@tabler/icons-react';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import CustomTextField from '@/app/components/forms/theme-elements/CustomTextField';
import FormDrawer from '../../inventory-new/shared/FormDrawer';
import FormField from '../../inventory-new/shared/FormField';
import {EventKind, EVENT_KINDS, FLEET_RULES, formatMiles, StationPlace, Vehicle, VehicleEvent} from '../types';
import {NewEvent} from '../useVehicles';
import StationField from './station-field';

interface FormState {
    date: string;
    mileage: string;
    cost: string;
    supplier: string;
    station: StationPlace | null;
    invoice_no: string;
    note: string;
    litres: string;
    passed: 'yes' | 'no';
    // tyre change: lowest tread after the change
    lowest_tread: string;
    // accident: photos picked now (uploaded after the record is saved)
    photos: File[];
}

const blank = (): FormState => ({
    date: dayjs().format('YYYY-MM-DD'),
    mileage: '',
    cost: '',
    supplier: '',
    station: null,
    invoice_no: '',
    note: '',
    litres: '',
    passed: 'yes',
    lowest_tread: '',
    photos: [],
});

// Fields per record type; invoice-only costs use the Invoices tab form.
const FIELDS: Partial<Record<
    EventKind,
    {
        title: string;
        mileage: 'required' | 'optional' | 'none';
        cost: boolean;
        supplier?: string;
        invoice?: boolean;
        note: string;
        noteRequired?: boolean;
        notePlaceholder?: string;
        // optional photos (accident)
        photos?: boolean;
        info?: string;
    }
>> = {
    service: {
        title: 'Add service',
        mileage: 'required',
        cost: true,
        supplier: 'Garage',
        invoice: true,
        note: 'Work done',
        info: `The next service moves to ${FLEET_RULES.serviceMonths} months after this date.`,
    },
    mot: {
        title: 'Add MOT',
        mileage: 'required',
        cost: true,
        supplier: 'Test centre',
        note: 'Advisories',
        info: `A pass moves the MOT date to ${FLEET_RULES.motValidMonths} months after the test.`,
    },
    // Tyre checks use their own dialog (tyre-check-dialog.tsx).
    tyre_change: {
        title: 'Add tyre change',
        mileage: 'required',
        cost: true,
        supplier: 'Garage / supplier',
        invoice: true,
        note: 'Note',
        notePlaceholder: 'e.g. 2 front tyres replaced',
        info: `The next tyre check moves to ${FLEET_RULES.tyreCheckMonths} months after this date.`,
    },
    fuel: {
        title: 'Log fuel',
        mileage: 'required',
        cost: true,
        supplier: 'Station',
        note: 'Note',
    },
    mileage: {
        title: 'Add mileage reading',
        mileage: 'required',
        cost: false,
        note: 'Note',
    },
    repair: {
        title: 'Add repair',
        mileage: 'optional',
        cost: true,
        supplier: 'Garage',
        invoice: true,
        note: 'What was repaired',
        noteRequired: true,
    },
    other_cost: {
        title: 'Add other cost',
        mileage: 'optional',
        cost: true,
        supplier: 'Garage / supplier',
        invoice: true,
        note: 'What was it for',
        noteRequired: true,
        notePlaceholder: 'e.g. new wiper blades, bulb, valet',
    },
    // Repair costs go on the Invoices tab as a Repair.
    accident: {
        title: 'Record accident',
        mileage: 'none',
        cost: false,
        note: 'What happened',
        noteRequired: true,
        notePlaceholder: 'Where it happened, what was damaged, was anyone hurt',
        photos: true,
    },
};

interface EventDrawerProps {
    kind: EventKind | null;
    // the record being changed; empty when adding a new one
    editing?: VehicleEvent | null;
    vehicle: Vehicle;
    events: VehicleEvent[];
    onClose: () => void;
    onSave: (event: NewEvent) => Promise<void>;
}

/** Pick up to `max` photos; they are uploaded with the record. */
const PhotoUpload: React.FC<{ value: File[]; onChange: (photos: File[]) => void; max: number }> = ({
                                                                                                       value,
                                                                                                       onChange,
                                                                                                       max,
                                                                                                   }) => {
    const input = useRef<HTMLInputElement>(null);
    return (
        <Stack spacing={1} alignItems="flex-start">
            <input
                ref={input}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    const images = files.filter((f) => f.type.startsWith('image/'));
                    if (images.length < files.length) toast.error('Only photos can be added.');
                    const next = [...value, ...images.filter((f) => !value.some((v) => v.name === f.name))].slice(0, max);
                    if (value.length + images.length > max) toast.error(`Up to ${max} photos.`);
                    onChange(next);
                    e.target.value = '';
                }}
            />
            {value.length > 0 && (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {value.map((file) => (
                        <Chip
                            key={file.name}
                            icon={<IconPhoto size={16}/>}
                            label={file.name}
                            variant="outlined"
                            onDelete={() => onChange(value.filter((f) => f !== file))}
                            sx={{maxWidth: 220}}
                        />
                    ))}
                </Stack>
            )}
            {value.length < max && (
                <Button variant="outlined" startIcon={<IconUpload size={16}/>} onClick={() => input.current?.click()}>
                    {value.length ? 'Add more photos' : 'Upload photos'}
                </Button>
            )}
        </Stack>
    );
};

const decimal = (value: string, max = 7) => new RegExp(`^\\d{0,${max}}(\\.\\d{0,2})?$`).test(value);

const EventDrawer: React.FC<EventDrawerProps> = ({
                                                     kind: newKind,
                                                     editing,
                                                     vehicle,
                                                     events: allEvents,
                                                     onClose,
                                                     onSave
                                                 }) => {
    const kind = editing?.kind ?? newKind;
    // the record being edited doesn't count against itself
    const events = editing ? allEvents.filter((e) => e.id !== editing.id) : allEvents;
    const [form, setForm] = useState<FormState>(blank);
    const [showErrors, setShowErrors] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!kind) return;
        setShowErrors(false);
        if (!editing) {
            setForm(blank());
            return;
        }
        setForm({
            date: editing.date,
            mileage: editing.mileage ? String(editing.mileage) : '',
            cost: editing.cost !== null && editing.cost !== undefined ? String(editing.cost) : '',
            supplier: editing.supplier,
            station: editing.station ?? null,
            invoice_no: editing.invoice_no,
            note: editing.note,
            litres: editing.litres ? String(editing.litres) : '',
            passed: editing.passed === false ? 'no' : 'yes',
            lowest_tread: typeof editing.lowest_tread === 'number' ? String(editing.lowest_tread) : '',
            photos: [],
        });
    }, [kind, editing]);

    const cfg = kind ? FIELDS[kind] : undefined;
    if (!kind || !cfg) return null;
    // Fuel follows the "odometer at every fill" setting; other records use their own rule.
    const mileageRequired = kind === 'fuel' ? FLEET_RULES.odometerEveryFill : cfg.mileage === 'required';
    const set = <K extends keyof FormState>(name: K, value: FormState[K]) =>
        setForm((prev) => ({...prev, [name]: value}));

    // Odometer can't go below the highest reading on or before this date.
    const readingBefore = Math.max(
        0,
        ...events.filter((e) => e.date <= form.date && e.mileage).map((e) => e.mileage as number),
        !editing && form.date >= dayjs().format('YYYY-MM-DD') ? vehicle.mileage : 0,
    );
    // ...and a back-dated reading can't be higher than a later one.
    const later = events.filter((e) => e.date > form.date && e.mileage).map((e) => e.mileage as number);
    const readingAfter = later.length ? Math.min(...later) : null;
    const mileage = form.mileage === '' ? null : Number(form.mileage);

    const errors: Partial<Record<'date' | 'mileage' | 'litres' | 'cost' | 'note' | 'lowest_tread', string>> = {};
    if (!form.date) errors.date = 'Choose a date.';
    else if (form.date > dayjs().format('YYYY-MM-DD')) errors.date = 'The date can\'t be in the future.';
    if (mileage === null && mileageRequired && showErrors) errors.mileage = 'Enter the odometer reading.';
    if (mileage !== null && mileage < readingBefore)
        errors.mileage = `Can't be lower than the last reading (${formatMiles(readingBefore)}).`;
    else if (mileage !== null && readingAfter !== null && mileage > readingAfter)
        errors.mileage = `Can't be higher than a later reading (${formatMiles(readingAfter)}).`;
    if (kind === 'fuel' && showErrors) {
        if (!(Number(form.litres) > 0)) errors.litres = 'Enter the litres.';
        if (!(Number(form.cost) > 0)) errors.cost = 'Enter the cost.';
    }
    if (cfg.noteRequired && showErrors && !form.note.trim()) errors.note = 'Please describe it.';
    else if (kind === 'accident' && showErrors && form.note.trim().length < 5) errors.note = 'Describe what happened.';
    if (form.lowest_tread !== '' && Number(form.lowest_tread) > 12) errors.lowest_tread = 'Enter 0–12 mm.';
    const lowTread = form.lowest_tread !== '' && Number(form.lowest_tread) <= FLEET_RULES.treadLimitMm;

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setShowErrors(true);
        // re-check the "after first attempt" rules with showErrors on
        const missing =
            (mileageRequired && mileage === null) ||
            (kind === 'fuel' && (!(Number(form.litres) > 0) || !(Number(form.cost) > 0))) ||
            (cfg.noteRequired && !form.note.trim()) ||
            (kind === 'accident' && form.note.trim().length < 5);
        if (missing || Object.keys(errors).length > 0) {
            toast.error('Please check the highlighted fields.');
            return;
        }
        setSaving(true);
        try {
            await onSave({
                vehicle_id: vehicle.id,
                kind,
                date: form.date,
                mileage,
                cost: cfg.cost && form.cost !== '' ? Number(form.cost) : null,
                supplier: form.supplier.trim(),
                station: kind === 'fuel' ? form.station : undefined,
                invoice_no: form.invoice_no.trim(),
                note: form.note.trim(),
                litres: kind === 'fuel' ? Number(form.litres) : null,
                passed: kind === 'mot' ? form.passed === 'yes' : undefined,
                lowest_tread: kind === 'tyre_change' && form.lowest_tread !== '' ? Number(form.lowest_tread) : undefined,
                photo_files: cfg.photos && form.photos.length ? form.photos.map((file) => ({file})) : undefined,
            });
            toast.success(`${EVENT_KINDS[kind].label} ${editing ? 'updated' : 'saved'} for ${vehicle.registration}.`);
            onClose();
        } catch {
            // API error already shown
        } finally {
            setSaving(false);
        }
    };

    return (
        <FormDrawer open
                    title={`${editing ? `Edit ${EVENT_KINDS[kind].label.toLowerCase()}` : cfg.title} · ${vehicle.registration}`}
                    onClose={onClose} onSubmit={submit} isSaving={saving}>
            {cfg.info && <Alert severity="info">{cfg.info}</Alert>}
            {editing && (
                <Alert severity="warning">
                    Saving works out the vehicle&apos;s mileage and due dates again from all its records.
                </Alert>
            )}

            <Stack direction="row" spacing={2}>
                <Box flex={1}>
                    <FormField label="Date *">
                        <CustomTextField
                            type="date"
                            value={form.date}
                            onChange={(e: any) => set('date', e.target.value)}
                            fullWidth
                            error={!!errors.date}
                            helperText={errors.date}
                            slotProps={{htmlInput: {max: dayjs().format('YYYY-MM-DD')}}}
                        />
                    </FormField>
                </Box>
                {cfg.mileage !== 'none' && (
                    <Box flex={1}>
                        <FormField label={`Odometer (miles)${mileageRequired ? ' *' : ''}`}>
                            <CustomTextField
                                value={form.mileage}
                                onChange={(e: any) => {
                                    const value = e.target.value.replace(/,/g, '');
                                    if (/^\d{0,7}$/.test(value)) set('mileage', value);
                                }}
                                placeholder={vehicle.mileage ? String(vehicle.mileage) : '0'}
                                fullWidth
                                error={!!errors.mileage}
                                helperText={errors.mileage ?? `Last: ${formatMiles(vehicle.mileage)}`}
                                slotProps={{htmlInput: {inputMode: 'numeric'}}}
                            />
                        </FormField>
                    </Box>
                )}
            </Stack>

            {kind === 'mot' && (
                <FormField label="Result">
                    <CustomTextField
                        select
                        value={form.passed}
                        onChange={(e: any) => set('passed', e.target.value)}
                        fullWidth
                        size="small"
                    >
                        <MenuItem value="yes">Pass</MenuItem>
                        <MenuItem value="no">Fail</MenuItem>
                    </CustomTextField>
                </FormField>
            )}
            {kind === 'mot' && form.passed === 'no' && (
                <Alert severity="warning">
                    A failed MOT does not move the MOT date. Book a re-test and record it when it passes.
                </Alert>
            )}

            {kind === 'tyre_change' && (
                <FormField label="Lowest tread (mm)" hint="Optional: the lowest tread after the change">
                    <CustomTextField
                        value={form.lowest_tread}
                        onChange={(e: any) => decimal(e.target.value, 2) && set('lowest_tread', e.target.value)}
                        fullWidth
                        error={!!errors.lowest_tread}
                        helperText={errors.lowest_tread}
                        slotProps={{htmlInput: {inputMode: 'decimal'}}}
                    />
                </FormField>
            )}
            {lowTread && (
                <Alert severity="error">
                    At or below {FLEET_RULES.treadLimitMm} mm: the tyres are due for replacement.
                </Alert>
            )}

            {kind === 'fuel' && (
                <Stack direction="row" spacing={2}>
                    <Box flex={1}>
                        <FormField label="Litres *">
                            <CustomTextField
                                value={form.litres}
                                onChange={(e: any) => decimal(e.target.value, 4) && set('litres', e.target.value)}
                                fullWidth
                                error={!!errors.litres}
                                helperText={errors.litres}
                                slotProps={{htmlInput: {inputMode: 'decimal'}}}
                            />
                        </FormField>
                    </Box>
                    <Box flex={1}>
                        <FormField label="Cost incl. VAT (£) *">
                            <CustomTextField
                                value={form.cost}
                                onChange={(e: any) => decimal(e.target.value) && set('cost', e.target.value)}
                                fullWidth
                                error={!!errors.cost}
                                helperText={
                                    errors.cost ??
                                    (Number(form.litres) > 0 && Number(form.cost) > 0
                                        ? `£${(Number(form.cost) / Number(form.litres)).toFixed(3)} per litre`
                                        : undefined)
                                }
                                slotProps={{htmlInput: {inputMode: 'decimal'}}}
                            />
                        </FormField>
                    </Box>
                </Stack>
            )}

            {(cfg.supplier || (cfg.cost && kind !== 'fuel')) && (
                <Stack direction="row" spacing={2}>
                    {cfg.supplier && (
                        <Box flex={1}>
                            <FormField label={cfg.supplier}>
                                {kind === 'fuel' ? (
                                    <StationField
                                        name={form.supplier}
                                        place={form.station}
                                        onChange={(name, station) => setForm((prev) => ({
                                            ...prev,
                                            supplier: name,
                                            station
                                        }))}
                                    />
                                ) : (
                                    <CustomTextField
                                        value={form.supplier}
                                        onChange={(e: any) => set('supplier', e.target.value.slice(0, 80))}
                                        fullWidth
                                    />
                                )}
                            </FormField>
                        </Box>
                    )}
                    {cfg.cost && kind !== 'fuel' && (
                        <Box flex={1}>
                            <FormField label="Cost incl. VAT (£)">
                                <CustomTextField
                                    value={form.cost}
                                    onChange={(e: any) => decimal(e.target.value) && set('cost', e.target.value)}
                                    fullWidth
                                    slotProps={{htmlInput: {inputMode: 'decimal'}}}
                                />
                            </FormField>
                        </Box>
                    )}
                </Stack>
            )}

            {cfg.invoice && (
                <FormField label="Invoice number">
                    <CustomTextField
                        value={form.invoice_no}
                        onChange={(e: any) => set('invoice_no', e.target.value.slice(0, 40))}
                        fullWidth
                    />
                </FormField>
            )}

            <FormField label={`${cfg.note}${cfg.noteRequired ? ' *' : ''}`}>
                <CustomTextField
                    value={form.note}
                    onChange={(e: any) => set('note', e.target.value.slice(0, 300))}
                    placeholder={cfg.notePlaceholder}
                    multiline
                    minRows={2}
                    fullWidth
                    error={!!errors.note}
                    helperText={errors.note}
                />
            </FormField>

            {cfg.photos && (
                <FormField label="Photos · optional" hint="Damage, the other vehicle, the place. Up to 5 photos.">
                    <PhotoUpload value={form.photos} onChange={(photos) => set('photos', photos)} max={5}/>
                </FormField>
            )}
        </FormDrawer>
    );
};

export default EventDrawer;

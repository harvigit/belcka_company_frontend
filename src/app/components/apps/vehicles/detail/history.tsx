'use client';
import React, {useState} from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    LinearProgress,
    MenuItem,
    Stack,
    Typography,
} from '@mui/material';
import {IconPlus} from '@tabler/icons-react';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import CustomTextField from '@/app/components/forms/theme-elements/CustomTextField';
import {DriverName, DueCell, PersonInline, PhotoThumbs} from '../shared';
import {
    Activity,
    ACTIVITY_AREA,
    DriverLog,
    dueItems,
    EVENT_KINDS,
    eventImages,
    EventKind,
    FLEET_RULES,
    formatDate,
    formatMiles,
    FUEL_RANGE_STATE,
    fuelRangeState,
    fuelRangeText,
    fuelUse,
    l100ToMpg,
    lowestTread,
    money,
    TYRE_STATE,
    Vehicle,
    VehicleEvent,
    wheelState,
} from '../types';
import {Column, RecordTable, Section, StatTile, toneAt} from './common';
import {WheelLayout} from './tyre-check-dialog';

interface TabProps {
    vehicle: Vehicle;
    events: VehicleEvent[];
    onAdd: (kind: EventKind) => void;
    readOnly: boolean;
}

const newestFirst = (a: VehicleEvent, b: VehicleEvent) =>
    b.date.localeCompare(a.date) || (b.mileage ?? 0) - (a.mileage ?? 0) || b.id - a.id;

const AddButton: React.FC<{ label: string; onClick: () => void; primary?: boolean; hidden?: boolean }> = ({
                                                                                                              label,
                                                                                                              onClick,
                                                                                                              primary,
                                                                                                              hidden,
                                                                                                          }) =>
    hidden ? null : (
        <Button variant={primary ? 'contained' : 'outlined'} startIcon={<IconPlus size={16}/>} onClick={onClick}>
            {label}
        </Button>
    );

const dateCol: Column<VehicleEvent> = {header: 'Date', render: (e) => formatDate(e.date)};
const mileageCol: Column<VehicleEvent> = {header: 'Mileage', render: (e) => formatMiles(e.mileage)};
const costCol: Column<VehicleEvent> = {header: 'Cost', render: (e) => money(e.cost), align: 'right'};
const byCol: Column<VehicleEvent> = {
    header: 'Added by',
    render: (e) => (e.created_by ? <DriverName name={e.created_by} image={e.created_by_image}/> : '-'),
};
const noteCol = (header = 'Note'): Column<VehicleEvent> => ({
    header,
    render: (e) => (
        <Box sx={{maxWidth: 280}}>
            <Typography variant="body2">{e.note || '-'}</Typography>
            {!!eventImages(e).length && (
                <Box mt={0.75}>
                    <PhotoThumbs photos={eventImages(e)} size={40}/>
                </Box>
            )}
        </Box>
    ),
});

export const MaintenanceTab: React.FC<TabProps> = (props) => {
    const {vehicle, events, onAdd, readOnly} = props;
    // Repairs are on the Invoices tab; accidents on the Overview tab.
    const rows = events.filter((e) => ['mot', 'service', 'other_cost'].includes(e.kind)).sort(newestFirst);
    const due = dueItems(vehicle).filter((d) => d.label !== 'Tyre check');
    return (
        <Box display="flex" flexDirection="column" gap={3}>
            <Grid container spacing={2}>
                {due.map((d, i) => (
                    <Grid key={d.label} size={{xs: 12, sm: 6, md: 3}}>
                        <StatTile tone={toneAt(i)} label={d.label} value={formatDate(d.date)}
                                  sub={<DueCell item={d}/>}/>
                    </Grid>
                ))}
            </Grid>
            <Section
                title="MOT and service history"
                subtitle={
                    vehicle.type === 'private'
                        ? 'Private car: only the MOT is tracked here.'
                        : `Service every ${FLEET_RULES.serviceMonths} months or ${FLEET_RULES.serviceMiles.toLocaleString('en-GB')} miles.`
                }
                actions={
                    <>
                        <AddButton label="MOT" onClick={() => onAdd('mot')} primary hidden={readOnly}/>
                        <AddButton label="Service" onClick={() => onAdd('service')}
                                   hidden={readOnly || vehicle.type === 'private'}/>
                        <AddButton label="Other cost" onClick={() => onAdd('other_cost')} hidden={readOnly}/>
                    </>
                }
            >
                <RecordTable
                    rows={rows}
                    empty="No MOT, service, repair or accident recorded yet."
                    columns={[
                        dateCol,
                        {
                            header: 'Type',
                            render: (e) => (
                                <Chip
                                    size="small"
                                    variant="outlined"
                                    color={EVENT_KINDS[e.kind].color}
                                    label={e.kind === 'mot' ? `MOT · ${e.passed ? 'Pass' : 'Fail'}` : EVENT_KINDS[e.kind].label}
                                />
                            ),
                        },
                        mileageCol,
                        {header: 'Garage', render: (e) => e.supplier || '-'},
                        {header: 'Invoice', render: (e) => e.invoice_no || '-'},
                        noteCol(),
                        costCol,
                    ]}
                />
            </Section>
        </Box>
    );
};

export const TyresTab: React.FC<TabProps> = (props) => {
    const {vehicle, events, onAdd, readOnly} = props;
    const rows = events.filter((e) => e.kind === 'tyre_check' || e.kind === 'tyre_change').sort(newestFirst);
    const next = dueItems(vehicle).find((d) => d.label === 'Tyre check') ?? null;
    const last = rows.find((e) => lowestTread(e) !== null);
    const lowest = last ? lowestTread(last) : null;
    // latest check with all four tyres, shown around the car
    const lastCheck = rows.find((e) => e.kind === 'tyre_check' && e.tread && Object.keys(e.tread).length);
    return (
        <Box display="flex" flexDirection="column" gap={3}>
            <Grid container spacing={2}>
                <Grid size={{xs: 12, sm: 4}}>
                    <StatTile tone="blue" label="Next tyre check" value={formatDate(next?.date)}
                              sub={<DueCell item={next}/>}/>
                </Grid>
                <Grid size={{xs: 12, sm: 4}}>
                    <StatTile tone="purple"
                              label="Lowest tread"
                              value={lowest === null ? '-' : `${lowest} mm`}
                              sub={
                                  lowest !== null && lowest <= FLEET_RULES.treadLimitMm ? (
                                      <Chip size="small" color="error" label="Replace now"/>
                                  ) : last ? (
                                      `Measured ${formatDate(last.date)}`
                                  ) : (
                                      'Not measured yet'
                                  )
                              }
                    />
                </Grid>
                <Grid size={{xs: 12, sm: 4}}>
                    <StatTile tone="green"
                              label="Rule"
                              value={`${FLEET_RULES.tyreCheckMonths} months`}
                              sub={`or ${FLEET_RULES.tyreCheckMiles.toLocaleString('en-GB')} mi · replace at ${FLEET_RULES.treadLimitMm} mm`}
                    />
                </Grid>
            </Grid>
            {lastCheck && (
                <Section
                    title={`Last tyre check · ${formatDate(lastCheck.date)}`}
                    subtitle={
                        <>
                            <PersonInline name={lastCheck.created_by} image={lastCheck.created_by_image}/>
                            {`${lastCheck.mileage ? ` · ${formatMiles(lastCheck.mileage)}` : ''}${lastCheck.note ? ` · ${lastCheck.note}` : ''}`}
                        </>
                    }
                >
                    <Box maxWidth={620}>
                        <WheelLayout
                            render={(w) => {
                                const tread = lastCheck.tread?.[w];
                                const state = wheelState(lastCheck, w);
                                const photo = lastCheck.wheels?.[w]?.photo;
                                return (
                                    <Stack spacing={1}>
                                        <Stack direction="row" spacing={1} alignItems="center"
                                               justifyContent="space-between">
                                            <Typography fontWeight={700} sx={{fontVariantNumeric: 'tabular-nums'}}>
                                                {typeof tread === 'number' ? `${tread} mm` : '-'}
                                            </Typography>
                                            <Chip size="small" color={TYRE_STATE[state].color}
                                                  label={TYRE_STATE[state].label}/>
                                        </Stack>
                                        {photo && <PhotoThumbs photos={[photo]} size={56}/>}
                                    </Stack>
                                );
                            }}
                        />
                        {lastCheck.extra_photo && (
                            <Box mt={1.5}>
                                <Typography variant="caption" color="textSecondary" display="block" mb={0.5}>
                                    Photo from any side
                                </Typography>
                                <PhotoThumbs photos={[lastCheck.extra_photo]} size={56}/>
                            </Box>
                        )}
                    </Box>
                </Section>
            )}

            <Section
                title="Tyre history"
                actions={
                    <>
                        <AddButton label="Tyre check" onClick={() => onAdd('tyre_check')} primary hidden={readOnly}/>
                        <AddButton label="Tyre change" onClick={() => onAdd('tyre_change')} hidden={readOnly}/>
                    </>
                }
            >
                <RecordTable
                    rows={rows}
                    empty="No tyre checks yet. Record the tread of each tyre to track wear."
                    columns={[
                        dateCol,
                        {header: 'Type', render: (e) => EVENT_KINDS[e.kind].label},
                        mileageCol,
                        {
                            header: 'Tread mm (FL / FR / RL / RR)',
                            render: (e) => {
                                const low = lowestTread(e);
                                if (!e.tread || !Object.keys(e.tread).length)
                                    return low === null ? (
                                        '-'
                                    ) : (
                                        <Typography
                                            variant="body2"
                                            color={low <= FLEET_RULES.treadLimitMm ? 'error' : undefined}
                                            fontWeight={low <= FLEET_RULES.treadLimitMm ? 700 : undefined}
                                        >
                                            Lowest {low} mm
                                        </Typography>
                                    );
                                return (
                                    <Typography
                                        variant="body2"
                                        color={low !== null && low <= FLEET_RULES.treadLimitMm ? 'error' : undefined}
                                        fontWeight={low !== null && low <= FLEET_RULES.treadLimitMm ? 700 : undefined}
                                    >
                                        {(['FL', 'FR', 'RL', 'RR'] as const).map((w) => e.tread?.[w] ?? '-').join(' / ')} mm
                                    </Typography>
                                );
                            },
                        },
                        {header: 'Fitter', render: (e) => e.supplier || '-'},
                        {header: 'Invoice', render: (e) => e.invoice_no || '-'},
                        costCol,
                        noteCol(),
                    ]}
                />
            </Section>
        </Box>
    );
};

type FuelPeriod = '30' | '90' | 'year' | '365' | 'all';
const FUEL_PERIODS: Record<FuelPeriod, string> = {
    '30': 'Last 30 days',
    '90': 'Last 90 days',
    year: 'This year',
    '365': 'Last 12 months',
    all: 'All time',
};
const periodFrom = (p: FuelPeriod) =>
    p === 'all'
        ? ''
        : p === 'year'
            ? dayjs().startOf('year').format('YYYY-MM-DD')
            : dayjs().subtract(Number(p), 'day').format('YYYY-MM-DD');

// "7.5" style number with up to 1 decimal, or "" (empty = not set)
const rangeInput = (value: string) => /^\d{0,2}(\.\d?)?$/.test(value);

export const FuelTab: React.FC<
    TabProps & {
    onSetLimit: (litres: number) => Promise<void>;
    onSetRange: (min: number | null, max: number | null) => Promise<void>;
}
> = (props) => {
    const {vehicle, events, onAdd, readOnly, onSetLimit, onSetRange} = props;
    const [limitOpen, setLimitOpen] = useState(false);
    const [limit, setLimit] = useState('');
    const [period, setPeriod] = useState<FuelPeriod>('30');
    const [rangeOpen, setRangeOpen] = useState(false);
    const [range, setRange] = useState({min: '', max: ''});
    const [rangeTried, setRangeTried] = useState(false);

    const fills = events.filter((e) => e.kind === 'fuel').sort(newestFirst);
    const yearStart = dayjs().startOf('year').format('YYYY-MM-DD');
    const thisYear = fuelUse(events, yearStart);
    // Monday of the current week (dayjs weeks start on Sunday)
    const weekStart = dayjs().subtract((dayjs().day() + 6) % 7, 'day').format('YYYY-MM-DD');
    // the weekly limit counts fuel waiting for approval too: it is already in the tank
    const weekLitres = fills
        .filter((f) => f.date >= weekStart && f.status !== 'rejected')
        .reduce((s, f) => s + (f.litres ?? 0), 0);
    const weeklyLimit = vehicle.weekly_fuel_limit ?? 0;
    const overLimit = weeklyLimit > 0 && weekLitres > weeklyLimit;

    const from = periodFrom(period);
    const use = fuelUse(events, from);
    const readings = events
        .filter((e) => e.mileage)
        .sort((a, b) => a.date.localeCompare(b.date) || (a.mileage ?? 0) - (b.mileage ?? 0));
    const startReading = from ? [...readings].reverse().find((r) => r.date <= from) ?? readings[0] : readings[0];
    const milesDriven = startReading ? Math.max(0, vehicle.mileage - (startReading.mileage ?? 0)) : 0;
    const rangeState = fuelRangeState(vehicle, use.l100);

    const rangeMin = range.min === '' ? null : Number(range.min);
    const rangeMax = range.max === '' ? null : Number(range.max);
    const rangeError =
        rangeMin !== null && rangeMax !== null && rangeMin > rangeMax
            ? 'The lowest can\'t be higher than the highest.'
            : (rangeMin !== null && rangeMin <= 0) || (rangeMax !== null && rangeMax <= 0)
                ? 'Use a number above 0, or leave it empty.'
                : '';
    const allUse = fuelUse(events);

    return (
        <Box display="flex" flexDirection="column" gap={3}>
            <Grid container spacing={2}>
                <Grid size={{xs: 12, sm: 4}}>
                    <StatTile tone="blue" label="Fuel this year" value={money(thisYear.cost)}
                              sub={`${thisYear.litres.toFixed(1)} L`}/>
                </Grid>
                <Grid size={{xs: 6, sm: 4}}>
                    <StatTile tone="purple"
                              label="Average price"
                              value={thisYear.litres > 0 ? `£${(thisYear.cost / thisYear.litres).toFixed(3)}` : '-'}
                              sub="per litre this year"
                    />
                </Grid>
                <Grid size={{xs: 6, sm: 4}}>
                    <StatTile tone="green"
                              label="This week"
                              value={`${weekLitres.toFixed(1)} L`}
                              sub={
                                  weeklyLimit > 0 ? (
                                      <Box>
                                          <LinearProgress
                                              variant="determinate"
                                              color={overLimit ? 'error' : 'primary'}
                                              value={Math.min(100, (weekLitres / weeklyLimit) * 100)}
                                              sx={{my: 0.5, borderRadius: 1}}
                                          />
                                          {overLimit ? `Over the ${weeklyLimit} L limit` : `Limit ${weeklyLimit} L (Mon–Sun)`}
                                      </Box>
                                  ) : (
                                      'No weekly limit'
                                  )
                              }
                    />
                </Grid>
            </Grid>

            <Section
                title="Fuel use"
                subtitle="Measured fill to fill: the miles between two fills and the litres put in at the second one. Fills need an odometer reading."
                actions={
                    <>
                        <CustomTextField
                            select
                            size="small"
                            value={period}
                            onChange={(e: any) => setPeriod(e.target.value)}
                            sx={{minWidth: 160}}
                            aria-label="Period"
                        >
                            {(Object.keys(FUEL_PERIODS) as FuelPeriod[]).map((p) => (
                                <MenuItem key={p} value={p}>
                                    {FUEL_PERIODS[p]}
                                </MenuItem>
                            ))}
                        </CustomTextField>
                        {!readOnly && (
                            <Button
                                variant="outlined"
                                onClick={() => {
                                    setRange({
                                        min: vehicle.fuel_use_min ? String(vehicle.fuel_use_min) : '',
                                        max: vehicle.fuel_use_max ? String(vehicle.fuel_use_max) : '',
                                    });
                                    setRangeTried(false);
                                    setRangeOpen(true);
                                }}
                            >
                                Normal fuel use
                            </Button>
                        )}
                    </>
                }
            >
                <Grid container spacing={2}>
                    <Grid size={{xs: 6, md: 2}}>
                        <StatTile tone="blue" label="Miles driven" value={formatMiles(milesDriven)}
                                  sub="from odometer readings"/>
                    </Grid>
                    <Grid size={{xs: 6, md: 2}}>
                        <StatTile tone="purple"
                                  label="Fuel filled"
                                  value={`${use.litres.toFixed(1)} L`}
                                  sub={`${use.fills} fill${use.fills === 1 ? '' : 's'}`}
                        />
                    </Grid>
                    <Grid size={{xs: 6, md: 2}}>
                        <StatTile tone="green" label="Fuel cost" value={money(use.cost)}/>
                    </Grid>
                    <Grid size={{xs: 6, md: 2}}>
                        <StatTile tone="pink"
                                  label="Fuel use"
                                  value={use.l100 ? `${use.l100.toFixed(1)} L/100 km` : '-'}
                                  sub={use.mpg ? `${use.mpg.toFixed(1)} mpg` : 'Needs two fills with odometer'}
                        />
                    </Grid>
                    <Grid size={{xs: 6, md: 2}}>
                        <StatTile tone="orange"
                                  label="Cost per mile"
                                  value={use.measured_miles > 0 ? `£${(use.measured_cost / use.measured_miles).toFixed(2)}` : '-'}
                                  sub="fuel only"
                        />
                    </Grid>
                    <Grid size={{xs: 6, md: 2}}>
                        <StatTile tone="teal"
                                  label="Normal range"
                                  value={<Typography fontWeight={700}>{fuelRangeText(vehicle)}</Typography>}
                                  sub={
                                      rangeState !== 'not_set' ? (
                                          <Chip
                                              size="small"
                                              sx={{mt: 0.5}}
                                              color={FUEL_RANGE_STATE[rangeState].color}
                                              label={FUEL_RANGE_STATE[rangeState].label}
                                          />
                                      ) : (
                                          'Set it to get warnings'
                                      )
                                  }
                        />
                    </Grid>
                </Grid>
            </Section>

            <Section
                title="Fuel log"
                actions={
                    <>
                        <AddButton label="Log fuel" onClick={() => onAdd('fuel')} primary hidden={readOnly}/>
                        {!readOnly && (
                            <Button
                                variant="outlined"
                                onClick={() => {
                                    setLimit(weeklyLimit ? String(weeklyLimit) : '');
                                    setLimitOpen(true);
                                }}
                            >
                                Weekly limit
                            </Button>
                        )}
                    </>
                }
            >
                <RecordTable
                    rows={fills}
                    empty="No fuel logged yet."
                    columns={[
                        dateCol,
                        mileageCol,
                        {header: 'Litres', render: (e) => (e.litres ? `${e.litres.toFixed(1)} L` : '-')},
                        {
                            header: 'Station',
                            render: (e) =>
                                e.supplier ? (
                                    <>
                                        {e.supplier}
                                        {e.station?.address && (
                                            <Typography variant="caption" color="textSecondary" display="block">
                                                {e.station.address}
                                            </Typography>
                                        )}
                                    </>
                                ) : (
                                    '-'
                                ),
                        },
                        {
                            header: 'Per litre',
                            render: (e) => (e.litres && e.cost ? `£${(e.cost / e.litres).toFixed(3)}` : '-'),
                        },
                        byCol,
                        costCol,
                    ]}
                />
            </Section>

            <Dialog open={limitOpen} onClose={() => setLimitOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle>Weekly fuel limit · {vehicle.registration}</DialogTitle>
                <DialogContent>
                    <Typography color="textSecondary" mb={2}>
                        Litres per week, Monday to Sunday. Leave empty or 0 for no limit. Going over shows a warning.
                    </Typography>
                    <CustomTextField
                        autoFocus
                        fullWidth
                        value={limit}
                        placeholder="0"
                        onChange={(e: any) => /^\d{0,4}$/.test(e.target.value) && setLimit(e.target.value)}
                        slotProps={{htmlInput: {inputMode: 'numeric'}}}
                    />
                </DialogContent>
                <DialogActions>
                    <Button variant="outlined" onClick={() => setLimitOpen(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={async () => {
                            try {
                                await onSetLimit(Number(limit || 0));
                            } catch {
                                return;
                            }
                            toast.success(Number(limit) > 0 ? `Weekly limit set to ${limit} L.` : 'Weekly limit removed.');
                            setLimitOpen(false);
                        }}
                    >
                        Save
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={rangeOpen} onClose={() => setRangeOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle>Normal fuel use · {vehicle.registration}</DialogTitle>
                <DialogContent>
                    <Typography color="textSecondary" mb={2}>
                        The lowest and highest normal use for this vehicle, in litres per 100 km. Outside this range it
                        shows a
                        warning here and in the Action Centre. Leave both empty to switch it off.
                    </Typography>
                    {allUse.l100 && (
                        <Alert severity="info" sx={{mb: 2}}>
                            So far this vehicle uses {allUse.l100.toFixed(1)} L/100 km ({allUse.mpg?.toFixed(1)} mpg).
                        </Alert>
                    )}
                    <Stack direction="row" spacing={2}>
                        {(['min', 'max'] as const).map((k) => (
                            <CustomTextField
                                key={k}
                                label={k === 'min' ? 'Lowest (L/100 km)' : 'Highest (L/100 km)'}
                                fullWidth
                                value={range[k]}
                                onChange={(e: any) => rangeInput(e.target.value) && setRange({
                                    ...range,
                                    [k]: e.target.value
                                })}
                                error={rangeTried && !!rangeError}
                                helperText={range[k] && Number(range[k]) > 0 ? `${l100ToMpg(Number(range[k])).toFixed(1)} mpg` : ' '}
                                slotProps={{htmlInput: {inputMode: 'decimal'}}}
                            />
                        ))}
                    </Stack>
                    {rangeTried && rangeError && (
                        <Typography variant="caption" color="error">
                            {rangeError}
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button variant="outlined" onClick={() => setRangeOpen(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={async () => {
                            setRangeTried(true);
                            if (rangeError) return;
                            try {
                                await onSetRange(rangeMin, rangeMax);
                            } catch {
                                return;
                            }
                            toast.success(rangeMin || rangeMax ? 'Normal fuel use saved.' : 'Normal fuel use removed.');
                            setRangeOpen(false);
                        }}
                    >
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export const MileageTab: React.FC<TabProps> = (props) => {
    const {vehicle, events, onAdd, readOnly} = props;
    const readings = events
        .filter((e) => e.mileage)
        .sort((a, b) => a.date.localeCompare(b.date) || (a.mileage ?? 0) - (b.mileage ?? 0));
    const withDiff = readings
        .map((e, i) => ({
            ...e,
            previous: i > 0 ? (readings[i - 1].mileage ?? null) : null,
            diff: i > 0 ? (e.mileage ?? 0) - (readings[i - 1].mileage ?? 0) : null,
        }))
        .reverse();
    const since = (days: number) => {
        const from = dayjs().subtract(days, 'day').format('YYYY-MM-DD');
        const before = [...readings].reverse().find((r) => r.date <= from);
        return before ? vehicle.mileage - (before.mileage ?? 0) : null;
    };
    const last30 = since(30);
    const last365 = since(365);

    return (
        <Box display="flex" flexDirection="column" gap={3}>
            <Grid container spacing={2}>
                <Grid size={{xs: 12, sm: 4}}>
                    <StatTile tone="blue" label="Odometer" value={formatMiles(vehicle.mileage)}
                              sub={readings.length ? `Last reading ${formatDate(readings[readings.length - 1].date)}` : undefined}/>
                </Grid>
                <Grid size={{xs: 6, sm: 4}}>
                    <StatTile tone="purple" label="Last 30 days" value={last30 === null ? '-' : formatMiles(last30)}/>
                </Grid>
                <Grid size={{xs: 6, sm: 4}}>
                    <StatTile tone="green" label="Last 12 months"
                              value={last365 === null ? '-' : formatMiles(last365)}/>
                </Grid>
            </Grid>
            <Section
                title="Odometer readings"
                subtitle="Readings come from fuel, service, MOT and tyre records, or are added here."
                actions={<AddButton label="Add reading" onClick={() => onAdd('mileage')} primary hidden={readOnly}/>}
            >
                <RecordTable
                    rows={withDiff}
                    empty="No readings yet."
                    columns={[
                        dateCol,
                        {header: 'Previous', render: (e) => formatMiles(e.previous)},
                        {header: 'Odometer', render: (e) => formatMiles(e.mileage)},
                        {header: 'Since previous', render: (e) => (e.diff === null ? '-' : `+${formatMiles(e.diff)}`)},
                        {header: 'Came with', render: (e) => EVENT_KINDS[e.kind].label},
                        byCol,
                    ]}
                />
            </Section>
        </Box>
    );
};

// For mileage records: the counted reading just before each one (pending and rejected ones don't count).
const previousReadings = (events: VehicleEvent[]) => {
    const counted = events
        .filter((e) => e.mileage && (!e.status || e.status === 'approved'))
        .sort((a, b) => a.date.localeCompare(b.date) || (a.mileage ?? 0) - (b.mileage ?? 0) || a.id - b.id);
    const map = new Map<number, number | null>();

    counted.forEach((e, i) => {
        if (e.kind === 'mileage') map.set(e.id, i > 0 ? (counted[i - 1].mileage ?? null) : null);
    });
    return map;
};

export const ActivityTab: React.FC<{
    events: VehicleEvent[];
    driverLogs: DriverLog[];
    changes: Activity[];
    onOpenLog: () => void;
}> = ({events, driverLogs, changes, onOpenLog}) => {
    type Row = {
        id: string;
        date: string;
        what: React.ReactNode;
        detail: string;
        photos?: string[];
        mileage: number | null;
        // mileage records: the reading before this one
        previous?: number | null;
        // driver logs: the driver, shown with their avatar
        person?: { name: string; image?: string | null };
        by: string;
        by_image?: string | null;
    };
    const previous = previousReadings(events);
    const rows: Row[] = [
        ...events.map((e) => ({
            id: `e${e.id}`,
            date: e.date,
            what: (
                <Chip
                    size="small"
                    variant="outlined"
                    color={EVENT_KINDS[e.kind].color}
                    label={EVENT_KINDS[e.kind].label}
                />
            ),
            detail: [e.supplier, e.note, e.cost ? money(e.cost) : '', e.litres ? `${e.litres} L` : '']
                .filter(Boolean)
                .join(' · '),
            photos: eventImages(e),
            mileage: e.mileage,
            previous: previous.get(e.id) ?? null,
            by: e.created_by,
            by_image: e.created_by_image,
        })),
        ...driverLogs.flatMap((l) => [
            {
                id: `d${l.id}`,
                date: l.from,
                what: <Chip size="small" variant="outlined" label="Driver assigned"/>,
                detail: l.driver_name,
                person: {name: l.driver_name, image: l.driver_image},
                mileage: null,
                by: '-'
            },
            ...(l.to
                ? [{
                    id: `u${l.id}`,
                    date: l.to,
                    what: <Chip size="small" variant="outlined" label="Driver removed"/>,
                    detail: l.driver_name,
                    person: {name: l.driver_name, image: l.driver_image},
                    mileage: null,
                    by: '-'
                }]
                : []),
        ]),
    ].sort((a, b) => b.date.localeCompare(a.date));

    const changeRows = [...changes].sort((a, b) => b.at.localeCompare(a.at) || b.id - a.id);

    return (
        <Box display="flex" flexDirection="column" gap={3}>
            <Section title="History" subtitle="Everything recorded for this vehicle, newest first.">
                <RecordTable
                    rows={rows}
                    empty="Nothing recorded yet."
                    columns={[
                        {header: 'Date', render: (r) => formatDate(r.date)},
                        {header: 'What', render: (r) => r.what},
                        {
                            header: 'Details',
                            render: (r) => (
                                <Box>
                                    {r.person ? (
                                        <DriverName name={r.person.name} image={r.person.image}/>
                                    ) : (
                                        <Typography variant="body2">{r.detail || '-'}</Typography>
                                    )}
                                    {!!r.photos?.length && (
                                        <Box mt={0.75}>
                                            <PhotoThumbs photos={r.photos} size={40}/>
                                        </Box>
                                    )}
                                </Box>
                            ),
                        },
                        {
                            header: 'Mileage',
                            render: (r) =>
                                r.previous !== undefined && r.previous !== null ? (
                                    <Typography variant="body2" noWrap>
                                        {formatMiles(r.previous)} → {formatMiles(r.mileage)}
                                    </Typography>
                                ) : (
                                    formatMiles(r.mileage)
                                ),
                        },
                        {
                            header: 'By',
                            render: (r) =>
                                r.by && r.by !== '-' ? (
                                    <DriverName name={r.by} image={r.by_image}/>
                                ) : (
                                    <Typography variant="body2" color="textSecondary">-</Typography>
                                ),
                        },
                    ]}
                />
            </Section>

            <Section
                title="Changes"
                subtitle="Who added, changed or removed something on this vehicle."
                actions={
                    <Button variant="outlined" onClick={onOpenLog}>
                        Full activity log
                    </Button>
                }
            >
                <RecordTable<Activity>
                    rows={changeRows}
                    empty="No changes recorded yet."
                    columns={[
                        {
                            header: 'When',
                            render: (a) => `${dayjs(a.at).format('DD/MM/YYYY')} · ${dayjs(a.at).format('HH:mm')}`
                        },
                        {header: 'Who', render: (a) => (a.by ? <DriverName name={a.by} image={a.by_image}/> : '-')},
                        {
                            header: 'What',
                            render: (a) => (
                                <Box>
                                    <Typography variant="body2" fontWeight={600}>
                                        {a.action}
                                    </Typography>
                                    <Typography variant="caption" color="textSecondary">
                                        {ACTIVITY_AREA[a.area]}
                                    </Typography>
                                </Box>
                            ),
                        },
                        {header: 'Details', render: (a) => <Typography variant="body2">{a.detail || '-'}</Typography>},
                    ]}
                />
            </Section>
        </Box>
    );
};

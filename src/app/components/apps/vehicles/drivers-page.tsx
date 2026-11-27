'use client';
import React, {useMemo, useState} from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Grid,
    IconButton,
    InputAdornment,
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from '@mui/material';
import {createColumnHelper, SortingState, useReactTable, getCoreRowModel, getPaginationRowModel, getSortedRowModel} from '@tanstack/react-table';
import {IconAlertTriangle, IconCoin, IconId, IconPlus, IconSearch, IconUsers} from '@tabler/icons-react';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import {useRouter} from 'next/navigation';
import {useSession} from 'next-auth/react';
import {User} from 'next-auth';
import TablePaginationFooter from '@/app/components/common/TablePaginationFooter';
import CustomTextField from '@/app/components/forms/theme-elements/CustomTextField';
import InventoryTable from '../inventory-new/shared/InventoryTable';
import FormDrawer from '../inventory-new/shared/FormDrawer';
import FormField from '../inventory-new/shared/FormField';
import FleetNav from './fleet-nav';
import {CARD_TONE, RecordTable, StatCard} from './detail/common';
import {DriverName, DriverPicker, NoCompany, RegPlate} from './shared';
import {
    countsAsCost,
    DriverLicence,
    FLEET_RULES,
    formatDate,
    formatMiles,
    LICENCE_STATE,
    licenceState,
    LicenceState,
    money,
    Reimbursement,
    Vehicle,
} from './types';
import {DriverOption, useVehicles} from './useVehicles';
import {useDrivers} from './useDrivers';

type Period = '30' | '365' | 'all';
type Focus = 'all' | 'ok' | 'soon' | 'problem';

const DRIVER_HINT: Record<Focus, string> = {
    all: 'People driving or with a card',
    ok: 'Checked and in date',
    soon: 'Check the new licence',
    problem: 'Can\'t drive until checked',
};

interface DriverRow {
    id: number;
    name: string;
    image?: string | null;
    current: Vehicle[];
    licence?: DriverLicence;
    licenceState: LicenceState;
    reimbursement?: Reimbursement;
    miles: number;
    litres: number;
    fuelCost: number;
    expenses: number;
    accidents: number;
}

const reimbursementText = (r?: Reimbursement) =>
    !r ? '-' : r.method === 'per_mile' ? `${r.rate_pence}p per mile` : `${money(r.fixed_amount)} a month`;

const DriversPage: React.FC = () => {
    const router = useRouter();
    const session = useSession();
    const user = session.data?.user as User & { company_id?: number | null; name?: string | null };
    const store = useVehicles(user?.company_id, user?.name || 'You');
    const employees = useDrivers(user?.company_id);
    const {vehicles, loading} = store;

    const [period, setPeriod] = useState<Period>('30');
    const [focus, setFocus] = useState<Focus>('all');
    const [search, setSearch] = useState('');
    const [sorting, setSorting] = useState<SortingState>([]);
    const [pagination, setPagination] = useState({pageIndex: 0, pageSize: 50});
    const [openId, setOpenId] = useState<number | null>(null);
    const [licenceFor, setLicenceFor] = useState<{ driverId: number | null } | null>(null);
    const [reimburseFor, setReimburseFor] = useState<DriverRow | null>(null);

    const from = period === 'all' ? '0000-00-00' : dayjs().subtract(Number(period), 'day').format('YYYY-MM-DD');

    // A driver: anyone who had a vehicle, or has a licence or reimbursement recorded.
    const drivers: DriverRow[] = useMemo(() => {
        const ids = new Set<number>([
            ...store.driverLogs.map((l) => l.driver_id),
            ...store.licences.map((l) => l.driver_id),
            ...store.reimbursements.map((r) => r.driver_id),
        ]);
        return [...ids].map((id) => {
            const emp = employees.find((e) => e.id === id);
            const logs = store.driverLogs.filter((l) => l.driver_id === id);
            const name = emp?.name ?? logs[0]?.driver_name ?? store.licences.find((l) => l.driver_id === id)?.driver_name ?? 'Employee';
            // records on their vehicles while they had them, inside the period
            const theirs = store.events.filter((e) =>
                logs.some(
                    (l) => l.vehicle_id === e.vehicle_id && e.date >= l.from && e.date <= (l.to ?? '9999') && e.date >= from,
                ),
            );
            const miles = logs.reduce((sum, l) => {
                const readings = theirs.filter((e) => e.vehicle_id === l.vehicle_id && e.mileage).map((e) => e.mileage as number);
                return sum + (readings.length > 1 ? Math.max(...readings) - Math.min(...readings) : 0);
            }, 0);
            const fuel = theirs.filter((e) => e.kind === 'fuel');
            const licence = store.licences.find((l) => l.driver_id === id);
            return {
                id,
                name,
                image: emp?.image,
                current: vehicles.filter((v) => v.driver_id === id && v.status !== 'archived'),
                licence,
                licenceState: licenceState(licence),
                reimbursement: store.reimbursements.find((r) => r.driver_id === id),
                miles,
                litres: fuel.reduce((s, e) => s + (e.litres ?? 0), 0),
                fuelCost: fuel.reduce((s, e) => s + (e.cost ?? 0), 0),
                expenses: store.events
                    .filter((e) => e.submitted_by === name && e.date >= from && countsAsCost(e))
                    .reduce((s, e) => s + (e.cost ?? 0), 0),
                // accidents the driver recorded in the app, plus any the office added on the vehicle
                accidents:
                    store.defects.filter((d) => d.type === 'accident' && d.reported_by === name && (d.incident_date ?? d.reported_at) >= from).length +
                    theirs.filter((e) => e.kind === 'accident').length,
            };
        });
    }, [store.driverLogs, store.licences, store.reimbursements, store.events, store.defects, vehicles, employees, from]);

    const counts = {
        all: drivers.length,
        ok: drivers.filter((d) => d.licenceState === 'valid').length,
        soon: drivers.filter((d) => d.licenceState === 'soon').length,
        problem: drivers.filter((d) => d.licenceState === 'expired' || d.licenceState === 'missing').length,
    };

    const rows = useMemo(() => {
        const term = search.trim().toLowerCase();
        return drivers
            .filter((d) => {
                if (focus === 'ok' && d.licenceState !== 'valid') return false;
                if (focus === 'soon' && d.licenceState !== 'soon') return false;
                if (focus === 'problem' && d.licenceState !== 'expired' && d.licenceState !== 'missing') return false;
                if (!term) return true;
                return [d.name, ...d.current.map((v) => v.registration)].join(' ').toLowerCase().includes(term);
            })
            .sort((a, b) => b.current.length - a.current.length || a.name.localeCompare(b.name));
    }, [drivers, focus, search]);

    const columnHelper = createColumnHelper<DriverRow>();
    const columns = [
        columnHelper.accessor('name', {
            header: 'Driver',
            cell: ({row}) => (
                <Box sx={{pl: 1}}>
                    <DriverName name={row.original.name} image={row.original.image}/>
                </Box>
            ),
        }),
        columnHelper.accessor((d) => d.current.map((v) => v.registration).join(' '), {
            id: 'vehicle',
            header: 'Vehicle now',
            cell: ({row}) =>
                row.original.current.length ? (
                    <Stack direction="row" spacing={0.5} sx={{pl: 1}} flexWrap="wrap">
                        {row.original.current.map((v) => (
                            <RegPlate key={v.id} registration={v.registration}/>
                        ))}
                    </Stack>
                ) : (
                    <Typography className="f-14" color="textSecondary" sx={{pl: 1}}>
                        None
                    </Typography>
                ),
        }),
        columnHelper.accessor((d) => d.licence?.valid_until ?? '', {
            id: 'licence',
            header: 'Driving licence',
            cell: ({row}) => {
                const s = LICENCE_STATE[row.original.licenceState];
                return (
                    <Box sx={{pl: 1}}>
                        <Chip size="small" color={s.color} label={s.label}/>
                        {row.original.licence && (
                            <Typography variant="caption" color="textSecondary" display="block">
                                until {formatDate(row.original.licence.valid_until)}
                            </Typography>
                        )}
                    </Box>
                );
            },
        }),
        columnHelper.accessor('miles', {
            header: 'Miles',
            cell: ({row}) => (
                <Typography className="f-14" sx={{pl: 1, fontVariantNumeric: 'tabular-nums'}}>
                    {row.original.miles ? formatMiles(row.original.miles) : '-'}
                </Typography>
            ),
        }),
        columnHelper.accessor('fuelCost', {
            header: 'Fuel',
            cell: ({row}) => (
                <Box sx={{pl: 1}}>
                    <Typography
                        className="f-14">{row.original.fuelCost ? money(row.original.fuelCost) : '-'}</Typography>
                    {row.original.litres > 0 && (
                        <Typography variant="caption" color="textSecondary">
                            {row.original.litres.toFixed(1)} L
                        </Typography>
                    )}
                </Box>
            ),
        }),
        columnHelper.accessor('expenses', {
            header: 'Expenses',
            cell: ({row}) => (
                <Typography className="f-14" sx={{pl: 1}}>
                    {row.original.expenses ? money(row.original.expenses) : '-'}
                </Typography>
            ),
        }),
        columnHelper.accessor('accidents', {
            header: 'Accidents',
            cell: ({row}) => (
                <Typography className="f-14" sx={{pl: 1}} color={row.original.accidents ? 'error' : undefined}>
                    {row.original.accidents}
                </Typography>
            ),
        }),
        columnHelper.accessor((d) => reimbursementText(d.reimbursement), {
            id: 'reimbursement',
            header: 'Reimbursement',
            cell: ({row}) => (
                <Typography className="f-14" sx={{pl: 1}}
                            color={row.original.reimbursement ? undefined : 'textSecondary'}>
                    {reimbursementText(row.original.reimbursement)}
                </Typography>
            ),
        }),
        columnHelper.display({
            id: 'actions',
            header: 'Actions',
            cell: ({row}) => (
                <Stack direction="row" spacing={0.5}>
                    <Tooltip title={row.original.licence ? 'Update licence' : 'Record licence'}>
                        <IconButton color="primary" onClick={() => setLicenceFor({driverId: row.original.id})}>
                            <IconId size={18}/>
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Reimbursement">
                        <IconButton color="primary" onClick={() => setReimburseFor(row.original)}>
                            <IconCoin size={18}/>
                        </IconButton>
                    </Tooltip>
                </Stack>
            ),
        }),
    ];

    const table = useReactTable({
        data: rows,
        columns,
        state: {sorting, pagination},
        onSortingChange: setSorting,
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        autoResetPageIndex: true,
    });

    const tiles: {
        key: Focus;
        label: string;
        count: number;
        icon: React.ReactNode;
        color: 'primary' | 'success' | 'warning' | 'error'
    }[] = [
        {key: 'all', label: 'Drivers', count: counts.all, icon: <IconUsers size={22}/>, color: 'primary'},
        {key: 'ok', label: 'Licence valid', count: counts.ok, icon: <IconId size={22}/>, color: 'success'},
        {
            key: 'soon',
            label: 'Licence expires soon',
            count: counts.soon,
            icon: <IconAlertTriangle size={22}/>,
            color: 'warning'
        },
        {
            key: 'problem',
            label: 'Expired or not recorded',
            count: counts.problem,
            icon: <IconAlertTriangle size={22}/>,
            color: 'error'
        },
    ];

    const open = drivers.find((d) => d.id === openId) ?? null;

    if (store.noCompany) return <NoCompany/>;

    return (
        <Box sx={{minHeight: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column'}}>
            <FleetNav data={store}/>

            <Stack direction={{xs: 'column', sm: 'row'}} justifyContent="space-between" alignItems={{sm: 'center'}}
                   px={2} pt={2} spacing={1}>
                <Box>
                    <Typography variant="h5" fontWeight={700}>
                        Drivers
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        Counted by person, whichever vehicle they drove. Licences are checked here; anyone driving now
                        needs a valid one.
                    </Typography>
                </Box>
                <Button variant="contained" startIcon={<IconPlus size={18}/>}
                        onClick={() => setLicenceFor({driverId: null})}>
                    Record licence
                </Button>
            </Stack>

            <Grid container spacing={2} sx={{px: 2, pt: 2}}>
                {tiles.map((t) => (
                    <Grid key={t.key} size={{xs: 6, md: 3}}>
                        <StatCard
                            icon={t.icon}
                            tone={CARD_TONE[t.color]}
                            value={t.count}
                            label={t.label}
                            hint={DRIVER_HINT[t.key]}
                            active={focus === t.key && t.key !== 'all'}
                            onClick={() => setFocus(focus === t.key && t.key !== 'all' ? 'all' : t.key)}
                        />
                    </Grid>
                ))}
            </Grid>

            <Stack direction={{xs: 'column', sm: 'row'}} justifyContent="space-between" mx={2} my={1.5} spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <TextField
                        size="small"
                        placeholder="Search driver or registration..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        sx={{minWidth: {sm: 280}}}
                        slotProps={{
                            input: {
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconSearch size={16}/>
                                    </InputAdornment>
                                ),
                            },
                        }}
                    />
                    {focus !== 'all' && (
                        <Chip label={tiles.find((t) => t.key === focus)?.label} onDelete={() => setFocus('all')}
                              color="primary" variant="outlined"/>
                    )}
                </Stack>
                <ToggleButtonGroup
                    exclusive
                    size="small"
                    color="primary"
                    value={period}
                    onChange={(_, v: Period | null) => v && setPeriod(v)}
                >
                    <ToggleButton value="30" sx={{textTransform: 'none'}}>
                        Last 30 days
                    </ToggleButton>
                    <ToggleButton value="365" sx={{textTransform: 'none'}}>
                        Last 12 months
                    </ToggleButton>
                    <ToggleButton value="all" sx={{textTransform: 'none'}}>
                        All time
                    </ToggleButton>
                </ToggleButtonGroup>
            </Stack>
            <Divider/>

            <InventoryTable table={table} loading={loading} rowCount={rows.length}
                            onRowClick={(d: DriverRow) => setOpenId(d.id)}/>
            <Divider/>
            <TablePaginationFooter table={table} totalRows={rows.length}/>

            {open && (
                <Dialog open onClose={() => setOpenId(null)} fullWidth maxWidth="sm">
                    <DialogTitle>
                        <DriverName name={open.name} image={open.image}/>
                    </DialogTitle>
                    <DialogContent>
                        <Stack spacing={2}>
                            <Box>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                                    <Typography fontWeight={700}>Driving licence</Typography>
                                    <Button size="small" variant="outlined"
                                            onClick={() => setLicenceFor({driverId: open.id})}>
                                        {open.licence ? 'Update' : 'Record licence'}
                                    </Button>
                                </Stack>
                                {open.licence ? (
                                    <Stack spacing={0.5}>
                                        {[
                                            ['Status', <Chip key="s" size="small"
                                                             color={LICENCE_STATE[open.licenceState].color}
                                                             label={LICENCE_STATE[open.licenceState].label}/>],
                                            ['Categories', open.licence.categories],
                                            ['Valid until', formatDate(open.licence.valid_until)],
                                            ['Checked', `${formatDate(open.licence.checked_on)} · ${open.licence.checked_by}`],
                                            ['Reference', open.licence.reference || '-'],
                                        ].map(([label, value]) => (
                                            <Stack key={String(label)} direction="row" justifyContent="space-between">
                                                <Typography variant="body2" color="textSecondary">
                                                    {label}
                                                </Typography>
                                                {/* a div, not a <p>: the Status value is a Chip */}
                                                <Typography component="div" variant="body2" fontWeight={600}>
                                                    {value}
                                                </Typography>
                                            </Stack>
                                        ))}
                                    </Stack>
                                ) : (
                                    <Alert severity="warning">No licence check recorded.</Alert>
                                )}
                            </Box>
                            <Divider/>
                            <Box>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                                    <Typography fontWeight={700}>Reimbursement</Typography>
                                    <Button size="small" variant="outlined" onClick={() => setReimburseFor(open)}>
                                        Change
                                    </Button>
                                </Stack>
                                <Typography
                                    variant="body2">{open.reimbursement ? reimbursementText(open.reimbursement) : 'None set'}</Typography>
                            </Box>
                            <Divider/>
                            <Box>
                                <Typography fontWeight={700} mb={1}>
                                    Vehicles
                                </Typography>
                                <RecordTable
                                    rows={store.driverLogs
                                        .filter((l) => l.driver_id === open.id)
                                        .sort((a, b) => b.from.localeCompare(a.from))}
                                    empty="Has not had a vehicle."
                                    columns={[
                                        {
                                            header: 'Vehicle',
                                            render: (l) => {
                                                const v = vehicles.find((x) => x.id === l.vehicle_id);
                                                return v ? (
                                                    <Button size="small" variant="outlined"
                                                            onClick={() => router.push(`/apps/vehicles/${v.id}`)}>
                                                        {v.registration}
                                                    </Button>
                                                ) : (
                                                    '-'
                                                );
                                            },
                                        },
                                        {header: 'From', render: (l) => formatDate(l.from)},
                                        {
                                            header: 'To',
                                            render: (l) => (l.to ? formatDate(l.to) :
                                                <Chip size="small" color="success" label="Current"/>)
                                        },
                                    ]}
                                />
                            </Box>
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button variant="outlined" onClick={() => setOpenId(null)}>
                            Close
                        </Button>
                    </DialogActions>
                </Dialog>
            )}

            <LicenceDrawer
                target={licenceFor}
                employees={employees}
                licences={store.licences}
                onClose={() => setLicenceFor(null)}
                onSave={store.saveLicence}
            />
            <ReimbursementDialog
                driver={reimburseFor}
                onClose={() => setReimburseFor(null)}
                onSave={async (r) => {
                    if (!reimburseFor) return;
                    try {
                        await store.saveReimbursement(reimburseFor.id, r);
                    } catch {
                        return;
                    }
                    toast.success(`Reimbursement for ${reimburseFor.name} saved.`);
                    setReimburseFor(null);
                }}
            />
        </Box>
    );
};

const LicenceDrawer: React.FC<{
    target: { driverId: number | null } | null;
    employees: DriverOption[];
    licences: DriverLicence[];
    onClose: () => void;
    onSave: (l: Omit<DriverLicence, 'checked_by'> & { checked_by?: string }) => Promise<void>;
}> = ({target, employees, licences, onClose, onSave}) => {
    const today = dayjs().format('YYYY-MM-DD');
    const [driverId, setDriverId] = useState<number | null>(null);
    const [form, setForm] = useState({categories: '', checked_on: today, valid_until: '', reference: ''});
    const [showErrors, setShowErrors] = useState(false);

    React.useEffect(() => {
        if (!target) return;
        const existing = licences.find((l) => l.driver_id === target.driverId);
        setDriverId(target.driverId);
        setForm({
            categories: existing?.categories ?? '',
            checked_on: today,
            valid_until: existing?.valid_until ?? '',
            reference: existing?.reference ?? '',
        });
        setShowErrors(false);
    }, [target]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!target) return null;
    const existing = licences.find((l) => l.driver_id === driverId);
    const errors = {
        driver: showErrors && !driverId ? 'Choose the employee.' : '',
        categories: showErrors && !form.categories.trim() ? 'Enter the categories, e.g. B.' : '',
        checked_on: form.checked_on > today ? 'Can\'t be in the future.' : showErrors && !form.checked_on ? 'Choose the date.' : '',
        valid_until:
            form.valid_until && form.valid_until <= form.checked_on
                ? 'Must be after the check date.'
                : showErrors && !form.valid_until
                    ? 'Enter the expiry date on the licence.'
                    : '',
    };
    const expired = !!form.valid_until && form.valid_until < today;

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setShowErrors(true);
        if (
            !driverId ||
            !form.categories.trim() ||
            !form.checked_on ||
            !form.valid_until ||
            form.checked_on > today ||
            form.valid_until <= form.checked_on
        ) {
            toast.error('Please check the highlighted fields.');
            return;
        }
        const name = employees.find((x) => x.id === driverId)?.name ?? existing?.driver_name ?? 'Employee';
        try {
            await onSave({
                driver_id: driverId,
                driver_name: name,
                categories: form.categories.trim().toUpperCase(),
                checked_on: form.checked_on,
                valid_until: form.valid_until,
                reference: form.reference.trim(),
            });
        } catch {
            return;
        }
        toast.success(`Licence check saved for ${name}.`);
        onClose();
    };

    return (
        <FormDrawer
            open
            title={existing ? 'Update driving licence' : 'Record driving licence'}
            onClose={onClose}
            onSubmit={submit}
            isSaving={false}
            submitLabel="Save licence"
        >
            <Typography variant="body2" color="textSecondary">
                Record that you checked the licence. Don&apos;t store the licence number or a photo of it here.
            </Typography>
            <FormField label="Employee *">
                {target.driverId ? (
                    <DriverName
                        name={employees.find((x) => x.id === driverId)?.name ?? existing?.driver_name ?? 'Employee'}/>
                ) : (
                    <DriverPicker drivers={employees} value={driverId} onChange={(d) => setDriverId(d?.id ?? null)}
                                  error={errors.driver}/>
                )}
            </FormField>
            {existing && !target.driverId && (
                <Alert severity="info">This employee already has a licence record. Saving replaces it.</Alert>
            )}
            <FormField label="Categories *" hint="As on the back of the licence, e.g. B, BE">
                <CustomTextField
                    fullWidth
                    value={form.categories}
                    onChange={(e: any) => setForm((f) => ({...f, categories: e.target.value.slice(0, 30)}))}
                    error={!!errors.categories}
                    helperText={errors.categories}
                />
            </FormField>
            <Stack direction="row" spacing={2}>
                <Box flex={1}>
                    <FormField label="Checked on *">
                        <CustomTextField
                            type="date"
                            fullWidth
                            value={form.checked_on}
                            onChange={(e: any) => setForm((f) => ({...f, checked_on: e.target.value}))}
                            error={!!errors.checked_on}
                            helperText={errors.checked_on}
                            slotProps={{htmlInput: {max: today}}}
                        />
                    </FormField>
                </Box>
                <Box flex={1}>
                    <FormField label="Valid until *">
                        <CustomTextField
                            type="date"
                            fullWidth
                            value={form.valid_until}
                            onChange={(e: any) => setForm((f) => ({...f, valid_until: e.target.value}))}
                            error={!!errors.valid_until}
                            helperText={errors.valid_until}
                        />
                    </FormField>
                </Box>
            </Stack>
            {expired && !errors.valid_until && (
                <Alert severity="error">This licence has expired. The employee should not drive a company
                    vehicle.</Alert>
            )}
            <FormField label="Check reference" hint="Optional, e.g. the DVLA check code">
                <CustomTextField
                    fullWidth
                    value={form.reference}
                    onChange={(e: any) => setForm((f) => ({...f, reference: e.target.value.slice(0, 60)}))}
                />
            </FormField>
        </FormDrawer>
    );
};

const ReimbursementDialog: React.FC<{
    driver: DriverRow | null;
    onClose: () => void;
    onSave: (r: Reimbursement | null) => Promise<void>;
}> = ({driver, onClose, onSave}) => {
    const [method, setMethod] = useState<'per_mile' | 'fixed' | 'none'>('none');
    const [rate, setRate] = useState('');
    const [fixed, setFixed] = useState('');
    const [showErrors, setShowErrors] = useState(false);

    React.useEffect(() => {
        if (!driver) return;
        const r = driver.reimbursement;
        setMethod(r?.method ?? 'none');
        setRate(String(r?.rate_pence ?? FLEET_RULES.mileageRatePence));
        setFixed(r?.fixed_amount ? String(r.fixed_amount) : '');
        setShowErrors(false);
    }, [driver]);

    if (!driver) return null;
    const rateError = method === 'per_mile' && !(Number(rate) >= 1 && Number(rate) <= 200) ? 'Between 1p and 200p.' : '';
    const fixedError = method === 'fixed' && !(Number(fixed) > 0) ? 'Enter the monthly amount.' : '';

    return (
        <Dialog open onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>Reimbursement · {driver.name}</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="textSecondary" mb={2}>
                    How the employee is paid back for using their own car for work. Mileage claims from the app use this
                    rate.
                </Typography>
                <ToggleButtonGroup
                    exclusive
                    fullWidth
                    size="small"
                    color="primary"
                    value={method}
                    onChange={(_, v) => v && setMethod(v)}
                    sx={{mb: 2}}
                >
                    <ToggleButton value="per_mile" sx={{textTransform: 'none'}}>
                        Per mile
                    </ToggleButton>
                    <ToggleButton value="fixed" sx={{textTransform: 'none'}}>
                        Fixed a month
                    </ToggleButton>
                    <ToggleButton value="none" sx={{textTransform: 'none'}}>
                        None
                    </ToggleButton>
                </ToggleButtonGroup>
                {method === 'per_mile' && (
                    <CustomTextField
                        fullWidth
                        label="Pence per mile"
                        value={rate}
                        onChange={(e: any) => /^\d{0,3}$/.test(e.target.value) && setRate(e.target.value)}
                        error={showErrors && !!rateError}
                        helperText={(showErrors && rateError) || `Company default ${FLEET_RULES.mileageRatePence}p (HMRC rate for the first 10,000 miles)`}
                        slotProps={{htmlInput: {inputMode: 'numeric'}}}
                    />
                )}
                {method === 'fixed' && (
                    <CustomTextField
                        fullWidth
                        label="Amount a month (£)"
                        value={fixed}
                        onChange={(e: any) => /^\d{0,5}(\.\d{0,2})?$/.test(e.target.value) && setFixed(e.target.value)}
                        error={showErrors && !!fixedError}
                        helperText={showErrors && fixedError}
                        slotProps={{htmlInput: {inputMode: 'decimal'}}}
                    />
                )}
                {method === 'none' && (
                    <Typography variant="body2" color="textSecondary">
                        The employee can&apos;t send mileage claims.
                    </Typography>
                )}
            </DialogContent>
            <DialogActions>
                <Button variant="outlined" onClick={onClose}>
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    onClick={async () => {
                        setShowErrors(true);
                        if (rateError || fixedError) return;
                        await onSave(
                            method === 'none'
                                ? null
                                : {
                                    driver_id: driver.id,
                                    method,
                                    rate_pence: method === 'per_mile' ? Number(rate) : 0,
                                    fixed_amount: method === 'fixed' ? Number(fixed) : 0,
                                },
                        );
                    }}
                >
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default DriversPage;

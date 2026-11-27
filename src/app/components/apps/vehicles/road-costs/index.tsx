'use client';
import React, {useMemo, useState} from 'react';
import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Grid,
    InputAdornment,
    Stack,
    Tab,
    Tabs,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import {
    createColumnHelper,
    SortingState,
    useReactTable,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
} from '@tanstack/react-table';
import {IconArrowBackUp, IconDownload, IconFileImport, IconSearch} from '@tabler/icons-react';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import {useRouter, useSearchParams} from 'next/navigation';
import {useSession} from 'next-auth/react';
import {User} from 'next-auth';
import TablePaginationFooter from '@/app/components/common/TablePaginationFooter';
import CustomTextField from '@/app/components/forms/theme-elements/CustomTextField';
import InventoryTable from '../../inventory-new/shared/InventoryTable';
import ConfirmDialog from '../../inventory-new/shared/ConfirmDialog';
import FilterButton from '../../inventory-new/shared/FilterButton';
import FleetNav, {FLEET_PAGE_SX} from '../shared/fleet-nav';
import ImportDialog, {PreviewRow} from '../shared/import-dialog';
import {downloadExcel, normaliseReg, parseAmount, parseDate, pick} from '../lib/csv';
import {RecordTable, StatTile} from '../shared/common';
import {NoCompany, PersonInline, RegPlate} from '../shared';
import {
    CONFLICT_TYPE,
    Connection,
    countsAsCost,
    EVENT_KINDS,
    EventKind,
    formatDate,
    ImportBatch,
    ImportConflict,
    money,
    VehicleEvent,
} from '../lib/types';
import {useVehicles} from '../hooks/useVehicles';

type Section = 'charges' | 'imports' | 'conflicts';
const ROAD_KINDS: EventKind[] = ['parking', 'road_charge', 'fine'];

const RoadCostsPage: React.FC = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const session = useSession();
    const user = session.data?.user as User & {company_id?: number | null; name?: string | null};
    const store = useVehicles(user?.company_id, user?.name || 'You');
    const {vehicles, loading} = store;
    const byId = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);

    const initial = searchParams?.get('tab') as Section | null;
    const [section, setSection] = useState<Section>(
        initial && ['charges', 'imports', 'conflicts'].includes(initial) ? initial : 'charges',
    );
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState({kind: '', vehicle: '', source: ''});
    const [sorting, setSorting] = useState<SortingState>([]);
    const [pagination, setPagination] = useState({pageIndex: 0, pageSize: 50});
    const [importOpen, setImportOpen] = useState(false);
    const [toUndo, setToUndo] = useState<ImportBatch | null>(null);
    const [conflictView, setConflictView] = useState<'open' | 'all'>('open');
    const [resolving, setResolving] = useState<ImportConflict | null>(null);
    const [note, setNote] = useState('');

    const changeSection = (s: Section) => {
        setSection(s);
        router.replace(`/apps/vehicles/road-costs${s === 'charges' ? '' : `?tab=${s}`}`, {scroll: false});
    };

    // Parking, road charges, fines: imported, added on a vehicle, or from the app.
    const charges = useMemo(
        () =>
            store.events
                .filter((e) => ROAD_KINDS.includes(e.kind) && countsAsCost(e))
                .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id),
        [store.events],
    );
    const yearStart = dayjs().startOf('year').format('YYYY-MM-DD');
    const sumYear = (kind: EventKind) =>
        charges.filter((e) => e.kind === kind && e.date >= yearStart).reduce((s, e) => s + (e.cost ?? 0), 0);

    const rows = useMemo(() => {
        const term = search.trim().toLowerCase();
        return charges.filter((e) => {
            if (filters.kind && e.kind !== filters.kind) return false;
            if (filters.vehicle && String(e.vehicle_id) !== filters.vehicle) return false;
            if (filters.source && (e.import_id ? e.supplier : 'Added by hand') !== filters.source) return false;
            if (!term) return true;
            return [byId.get(e.vehicle_id)?.registration ?? '', e.supplier, e.note, e.invoice_no]
                .join(' ')
                .toLowerCase()
                .includes(term);
        });
    }, [charges, filters, search, byId]);

    const chargeImports = store.imports
        .filter((i) => i.id.startsWith('charge'))
        .sort((a, b) => b.imported_at.localeCompare(a.imported_at) || b.id.localeCompare(a.id));
    const openConflicts = store.conflicts.filter((c) => !c.resolved);
    const conflicts = [...store.conflicts]
        .filter((c) => conflictView === 'all' || !c.resolved)
        .sort((a, b) => Number(a.resolved) - Number(b.resolved) || b.date.localeCompare(a.date));
    const sources = store.connections.filter((c) => c.connected && c.target === 'charges');

    const columnHelper = createColumnHelper<VehicleEvent>();
    const columns = [
        columnHelper.accessor('date', {
            header: 'Date',
            cell: ({row}) => (
                <Typography className="f-14" sx={{pl: 1}}>
                    {formatDate(row.original.date)}
                </Typography>
            ),
        }),
        columnHelper.accessor((e) => byId.get(e.vehicle_id)?.registration ?? '', {
            id: 'vehicle',
            header: 'Vehicle',
            cell: ({row}) => (
                <Box sx={{pl: 1}}>
                    <RegPlate registration={byId.get(row.original.vehicle_id)?.registration ?? '-'} />
                </Box>
            ),
        }),
        columnHelper.accessor('kind', {
            header: 'Type',
            cell: ({row}) => (
                <Chip
                    size="small"
                    variant="outlined"
                    color={EVENT_KINDS[row.original.kind].color}
                    label={EVENT_KINDS[row.original.kind].label}
                />
            ),
        }),
        columnHelper.accessor('supplier', {
            header: 'Source',
            cell: ({row}) => (
                <Box sx={{pl: 1}}>
                    <Typography className="f-14">{row.original.supplier || '-'}</Typography>
                    <Typography variant="caption" color="textSecondary">
                        {row.original.import_id ? (
                            'Imported'
                        ) : row.original.submitted_by ? (
                            <>
                                From{' '}
                                <PersonInline
                                    name={row.original.submitted_by}
                                    image={row.original.submitted_by_image}
                                />
                            </>
                        ) : (
                            'Added by hand'
                        )}
                    </Typography>
                </Box>
            ),
        }),
        columnHelper.accessor('note', {
            header: 'Place / note',
            cell: ({row}) => (
                <Typography className="f-14" sx={{pl: 1, maxWidth: 260}}>
                    {row.original.note || '-'}
                </Typography>
            ),
        }),
        columnHelper.accessor('invoice_no', {
            header: 'Reference',
            cell: ({row}) => (
                <Typography className="f-14" sx={{pl: 1}}>
                    {row.original.invoice_no || '-'}
                </Typography>
            ),
        }),
        columnHelper.accessor('cost', {
            header: 'Amount',
            cell: ({row}) => (
                <Typography className="f-14" fontWeight={700} sx={{pl: 1, fontVariantNumeric: 'tabular-nums'}}>
                    {money(row.original.cost)}
                </Typography>
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

    const exportCsv = async () => {
        if (!rows.length) {
            toast.error('No road costs to export.');
            return;
        }
        try {
            await downloadExcel(
                `road-costs-${dayjs().format('YYYY-MM-DD')}`,
                ['Date', 'Registration', 'Type', 'Source', 'Place / note', 'Reference', 'Amount'],
                rows.map((e) => [
                    formatDate(e.date),
                    byId.get(e.vehicle_id)?.registration ?? '',
                    EVENT_KINDS[e.kind].label,
                    e.supplier,
                    e.note,
                    e.invoice_no,
                    (e.cost ?? 0).toFixed(2),
                ]),
                {moneyColumns: [6]},
            );
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Export failed. Please try again.');
            return;
        }
        toast.success(`${rows.length} row${rows.length === 1 ? '' : 's'} exported.`);
    };

    const sampleCsv = (source: Connection) => {
        const d = (n: number) => dayjs().subtract(n, 'day').format('DD/MM/YYYY');
        if (source.id === 'ringgo')
            return [
                'Session Reference,VRM,Start Date,Location,Total Cost',
                `RG-7741203,LX21 ABC,${d(5)},Wood Green · Zone 8812,4.20`,
                `RG-7752210,LX21 ABC,${d(1)},Hackney · Zone 3301,3.60`,
                `RG-7752388,KP70XYZ,${d(1)},Camden · Zone 5120,7.40`,
                `RG-7752561,ZZ99 ZZZ,${d(2)},Stratford · Zone 6004,5.10`,
            ].join('\n');
        return [
            'Vehicle Registration,Charge Date,Charge Type,Reference,Amount',
            `LX21ABC,${d(3)},ULEZ,ULEZ-56110,12.50`,
            `KP70 XYZ,${d(2)},Congestion Charge,CC-88120,15.00`,
            `YH18 VAN,${d(1)},ULEZ,ULEZ-56240,12.50`,
            `AB12CDE,${d(1)},Congestion Charge,CC-88301,15.00`,
        ].join('\n');
    };

    const buildPreview = (records: Record<string, string>[]): PreviewRow[] =>
        records.map((r, i) => {
            const registration = pick(r, ['vrm', 'registration', 'vehicleregistration', 'reg']);
            const date = parseDate(pick(r, ['startdate', 'chargedate', 'date', 'transactiondate']));
            const amount = parseAmount(pick(r, ['totalcost', 'amount', 'total', 'cost']));
            const reference = pick(r, ['sessionreference', 'reference', 'ref', 'journeyreference']);
            const base = {
                key: `r${i}`,
                date,
                registration,
                amount,
                reference,
                place: pick(r, ['location', 'zone', 'chargetype', 'crossing']),
            };
            if (!date || !Number.isFinite(amount) || !registration)
                return {
                    ...base,
                    vehicleId: null,
                    status: 'invalid' as const,
                    reason: 'Registration, date or amount missing',
                };
            if (reference && store.events.some((e) => e.invoice_no === reference))
                return {...base, vehicleId: null, status: 'duplicate' as const};
            const v = vehicles.find((x) => normaliseReg(x.registration) === normaliseReg(registration));
            if (!v)
                return {
                    ...base,
                    vehicleId: null,
                    status: 'unknown' as const,
                    reason: 'Registration not in the fleet',
                };
            return {
                ...base,
                vehicleId: v.id,
                status: 'ready' as const,
                reason: v.status === 'archived' ? 'Archived vehicle' : undefined,
            };
        });

    const applyCharges = async (source: Connection, fileName: string, ready: PreviewRow[], skipped: PreviewRow[]) => {
        const dates = [...ready, ...skipped]
            .map((r) => r.date)
            .filter(Boolean)
            .sort();
        const message = await store.applyImport(
            {
                connection_id: source.id,
                source: source.name,
                file_name: fileName,
                period_from: dates[0] ?? '',
                period_to: dates[dates.length - 1] ?? '',
                rows: ready.length,
                litres: 0,
                total: ready.reduce((s, r) => s + r.amount, 0),
            },
            ready.map((r) => ({
                vehicle_id: r.vehicleId as number,
                kind: source.charge_kind ?? 'road_charge',
                date: r.date,
                mileage: null,
                cost: r.amount,
                supplier: source.name,
                invoice_no: r.reference ?? '',
                note: r.place ?? '',
            })),
            skipped.map((r) => ({
                type: 'unknown_registration',
                detail: [r.registration, r.place, r.reference].filter(Boolean).join(' · '),
                vehicle_id: null,
                date: r.date,
                amount: r.amount,
            })),
            'charge',
        );
        toast.success(
            message ??
                `${ready.length} charge${ready.length === 1 ? '' : 's'} imported${skipped.length ? `, ${skipped.length} added to conflicts` : ''}.`,
        );
        changeSection(skipped.length ? 'conflicts' : 'charges');
    };

    const sourceOptions = [...new Set(charges.map((e) => (e.import_id ? e.supplier : 'Added by hand')))].map((s) => ({
        value: s,
        label: s,
    }));

    if (store.noCompany) return <NoCompany />;

    return (
        <Box sx={FLEET_PAGE_SX}>
            <FleetNav data={store} />

            <Stack
                direction={{xs: 'column', sm: 'row'}}
                justifyContent="space-between"
                alignItems={{sm: 'center'}}
                px={2}
                pt={2}
                spacing={1}
            >
                <Box>
                    <Typography variant="h5" fontWeight={700}>
                        Road costs
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        Parking, Congestion Charge, ULEZ, Dart Charge and fines land on the vehicle by its registration.
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<IconFileImport size={18} />}
                    onClick={() => setImportOpen(true)}
                >
                    Import charges
                </Button>
            </Stack>

            <Tabs value={section} onChange={(_, v: Section) => changeSection(v)} sx={{px: 2, mt: 1}}>
                <Tab value="charges" label={`Charges (${charges.length})`} />
                <Tab value="imports" label={`Imports (${chargeImports.length})`} />
                <Tab
                    value="conflicts"
                    label={
                        <Stack direction="row" spacing={0.75} alignItems="center">
                            <span>Conflicts</span>
                            {openConflicts.length > 0 && (
                                <Chip size="small" color="error" label={openConflicts.length} sx={{height: 20}} />
                            )}
                        </Stack>
                    }
                />
            </Tabs>
            <Divider />

            {section === 'charges' && (
                <>
                    <Grid container spacing={2} sx={{px: 2, pt: 2}}>
                        <Grid size={{xs: 6, md: 3}}>
                            <StatTile tone="blue" label="Parking this year" value={money(sumYear('parking'))} />
                        </Grid>
                        <Grid size={{xs: 6, md: 3}}>
                            <StatTile
                                tone="purple"
                                label="Road charges this year"
                                value={money(sumYear('road_charge'))}
                                sub="Congestion, ULEZ, Dart"
                            />
                        </Grid>
                        <Grid size={{xs: 6, md: 3}}>
                            <StatTile tone="green" label="Fines this year" value={money(sumYear('fine'))} />
                        </Grid>
                        <Grid size={{xs: 6, md: 3}}>
                            <StatTile tone="pink" label="Records" value={charges.length} />
                        </Grid>
                    </Grid>
                    <Stack
                        direction={{xs: 'column', sm: 'row'}}
                        justifyContent="space-between"
                        mx={2}
                        my={1.5}
                        spacing={1}
                    >
                        <Stack direction="row" spacing={1} alignItems="center">
                            <TextField
                                size="small"
                                placeholder="Search vehicle, place or reference..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                sx={{minWidth: {sm: 300}}}
                                slotProps={{
                                    input: {
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconSearch size={16} />
                                            </InputAdornment>
                                        ),
                                    },
                                }}
                            />
                            <FilterButton
                                value={filters}
                                onApply={(v) =>
                                    setFilters({
                                        kind: v.kind ?? '',
                                        vehicle: v.vehicle ?? '',
                                        source: v.source ?? '',
                                    })
                                }
                                fields={[
                                    {
                                        key: 'kind',
                                        label: 'Type',
                                        options: ROAD_KINDS.map((k) => ({value: k, label: EVENT_KINDS[k].label})),
                                    },
                                    {
                                        key: 'vehicle',
                                        label: 'Vehicle',
                                        options: vehicles
                                            .filter((v) => charges.some((e) => e.vehicle_id === v.id))
                                            .map((v) => ({
                                                value: String(v.id),
                                                label: v.registration,
                                            })),
                                    },
                                    {key: 'source', label: 'Source', options: sourceOptions},
                                ]}
                            />
                        </Stack>
                        <Button
                            variant="outlined"
                            startIcon={<IconDownload size={18} />}
                            disabled={!rows.length}
                            onClick={exportCsv}
                        >
                            Export Excel
                        </Button>
                    </Stack>
                    <Divider />
                    {!loading && rows.length === 0 ? (
                        <Stack alignItems="center" spacing={1} py={6}>
                            <Typography variant="h6">No road costs</Typography>
                            <Typography color="textSecondary">
                                {charges.length
                                    ? 'Nothing matches your search or filters.'
                                    : 'Import a file from RingGo, TfL or Dart Charge, or add an invoice on a vehicle.'}
                            </Typography>
                        </Stack>
                    ) : (
                        <>
                            <InventoryTable
                                table={table}
                                loading={loading}
                                rowCount={rows.length}
                                onRowClick={(e: VehicleEvent) =>
                                    router.push(`/apps/vehicles/${e.vehicle_id}?tab=invoices`)
                                }
                            />
                            <Divider />
                            <TablePaginationFooter table={table} totalRows={rows.length} />
                        </>
                    )}
                </>
            )}

            {section === 'imports' && (
                <Box p={2}>
                    <RecordTable<ImportBatch>
                        rows={chargeImports}
                        empty="No files imported yet."
                        columns={[
                            {
                                header: 'Imported',
                                render: (i) => (
                                    <>
                                        {formatDate(i.imported_at)} ·{' '}
                                        <PersonInline name={i.imported_by} image={i.imported_by_image} />
                                    </>
                                ),
                            },
                            {
                                header: 'File',
                                render: (i) => (
                                    <Box>
                                        <Typography variant="body2" fontWeight={600}>
                                            {i.file_name}
                                        </Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            {i.source}
                                        </Typography>
                                    </Box>
                                ),
                            },
                            {
                                header: 'Period',
                                render: (i) =>
                                    i.period_from ? `${formatDate(i.period_from)} – ${formatDate(i.period_to)}` : '-',
                            },
                            {header: 'Rows', render: (i) => i.rows},
                            {
                                header: 'Conflicts',
                                render: (i) => {
                                    const n = store.conflicts.filter((c) => c.import_id === i.id && !c.resolved).length;
                                    return n ? (
                                        <Chip
                                            size="small"
                                            color="error"
                                            label={`${n} open`}
                                            onClick={() => changeSection('conflicts')}
                                        />
                                    ) : (
                                        '-'
                                    );
                                },
                            },
                            {header: 'Total', align: 'right', render: (i) => <b>{money(i.total)}</b>},
                            {
                                header: '',
                                align: 'right',
                                render: (i) =>
                                    i.undone_at ? (
                                        <Tooltip title={`Undone by ${i.undone_by} on ${formatDate(i.undone_at)}`}>
                                            <Chip size="small" label="Undone" />
                                        </Tooltip>
                                    ) : (
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            color="error"
                                            startIcon={<IconArrowBackUp size={16} />}
                                            onClick={() => setToUndo(i)}
                                        >
                                            Undo
                                        </Button>
                                    ),
                            },
                        ]}
                    />
                </Box>
            )}

            {section === 'conflicts' && (
                <Box p={2} display="flex" flexDirection="column" gap={1.5}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" color="textSecondary">
                            Rows from fuel and charge imports that could not be placed on a vehicle, and weeks over the
                            fuel limit.
                        </Typography>
                        <Tabs value={conflictView} onChange={(_, v) => setConflictView(v)} sx={{minHeight: 0}}>
                            <Tab value="open" label={`Open (${openConflicts.length})`} sx={{minHeight: 0, py: 1}} />
                            <Tab value="all" label="All" sx={{minHeight: 0, py: 1}} />
                        </Tabs>
                    </Stack>
                    <RecordTable<ImportConflict>
                        rows={conflicts}
                        empty={conflictView === 'open' ? 'No open conflicts.' : 'No conflicts yet.'}
                        columns={[
                            {header: 'Date', render: (c) => formatDate(c.date)},
                            {
                                header: 'Problem',
                                render: (c) => (
                                    <Box sx={{maxWidth: 380}}>
                                        <Typography variant="body2" fontWeight={600}>
                                            {CONFLICT_TYPE[c.type]}
                                        </Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            {c.detail}
                                        </Typography>
                                    </Box>
                                ),
                            },
                            {header: 'Source', render: (c) => c.source},
                            {
                                header: 'Vehicle',
                                render: (c) =>
                                    c.vehicle_id ? (
                                        <RegPlate registration={byId.get(c.vehicle_id)?.registration ?? '-'} />
                                    ) : (
                                        '-'
                                    ),
                            },
                            {header: 'Amount', render: (c) => money(c.amount)},
                            {
                                header: 'Status',
                                render: (c) =>
                                    c.resolved ? (
                                        <Tooltip title={`${c.note} · ${c.resolved_by}, ${formatDate(c.resolved_at)}`}>
                                            <Chip size="small" color="success" label="Resolved" />
                                        </Tooltip>
                                    ) : (
                                        <Chip size="small" color="error" label="Open" />
                                    ),
                            },
                            {
                                header: '',
                                align: 'right',
                                render: (c) => (
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={() => {
                                            setNote(c.resolved ? c.note : '');
                                            setResolving(c);
                                        }}
                                    >
                                        {c.resolved ? 'View' : 'Resolve'}
                                    </Button>
                                ),
                            },
                        ]}
                    />
                </Box>
            )}

            <ImportDialog
                open={importOpen}
                title="Import charges"
                columnsHint="CSV with one row per parking session or charge: vehicle registration, date and amount. Place and reference are used when present; a reference that is already imported is skipped."
                sources={sources}
                vehicles={vehicles.filter((v) => v.status !== 'archived')}
                sampleCsv={sampleCsv}
                buildPreview={buildPreview}
                onApply={applyCharges}
                onClose={() => setImportOpen(false)}
                onGoToConnections={() => router.push('/apps/vehicles/settings#connections')}
            />

            <ConfirmDialog
                open={!!toUndo}
                title="Undo import"
                message={
                    toUndo
                        ? `Remove the ${toUndo.rows} charge${toUndo.rows === 1 ? '' : 's'} (${money(toUndo.total)}) that ${toUndo.file_name} added? Its open conflicts are closed.`
                        : ''
                }
                confirmLabel="Undo import"
                onClose={() => setToUndo(null)}
                onConfirm={async () => {
                    if (!toUndo) return;
                    try {
                        await store.undoImport(toUndo.id);
                    } catch {
                        return;
                    }
                    toast.success('Import undone.');
                    setToUndo(null);
                }}
            />

            {resolving && (
                <Dialog open onClose={() => setResolving(null)} fullWidth maxWidth="xs">
                    <DialogTitle>{CONFLICT_TYPE[resolving.type]}</DialogTitle>
                    <DialogContent>
                        <Typography variant="body2" mb={0.5}>
                            {resolving.detail}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                            {resolving.source} · {formatDate(resolving.date)}
                            {resolving.amount ? ` · ${money(resolving.amount)}` : ''}
                        </Typography>
                        <CustomTextField
                            autoFocus
                            fullWidth
                            multiline
                            minRows={2}
                            label="What was done"
                            placeholder="e.g. Hire car, cost recharged to the hire company"
                            value={note}
                            onChange={(e: any) => setNote(e.target.value.slice(0, 300))}
                            sx={{mt: 2}}
                        />
                        {resolving.resolved && (
                            <Typography variant="caption" color="textSecondary" display="block" mt={1}>
                                Resolved by{' '}
                                <PersonInline name={resolving.resolved_by} image={resolving.resolved_by_image} /> on{' '}
                                {formatDate(resolving.resolved_at)}
                            </Typography>
                        )}
                    </DialogContent>
                    <DialogActions>
                        {resolving.resolved ? (
                            <Button
                                color="error"
                                sx={{mr: 'auto'}}
                                onClick={async () => {
                                    try {
                                        await store.resolveConflict(resolving.id, false, '');
                                    } catch {
                                        return;
                                    }
                                    toast.success('Conflict reopened.');
                                    setResolving(null);
                                }}
                            >
                                Reopen
                            </Button>
                        ) : null}
                        <Button variant="outlined" onClick={() => setResolving(null)}>
                            Close
                        </Button>
                        {!resolving.resolved && (
                            <Button
                                variant="contained"
                                onClick={async () => {
                                    if (!note.trim()) {
                                        toast.error('Say what was done before resolving it.');
                                        return;
                                    }
                                    try {
                                        await store.resolveConflict(resolving.id, true, note.trim());
                                    } catch {
                                        return;
                                    }
                                    toast.success('Conflict resolved.');
                                    setResolving(null);
                                }}
                            >
                                Resolve
                            </Button>
                        )}
                    </DialogActions>
                </Dialog>
            )}
        </Box>
    );
};

export default RoadCostsPage;

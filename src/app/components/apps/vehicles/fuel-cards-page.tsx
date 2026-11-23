"use client";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  createColumnHelper,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { IconArrowBackUp, IconEdit, IconFileImport, IconPlus, IconSearch } from "@tabler/icons-react";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import InventoryTable from "../inventory-new/shared/InventoryTable";
import FormDrawer from "../inventory-new/shared/FormDrawer";
import FormField from "../inventory-new/shared/FormField";
import ConfirmDialog from "../inventory-new/shared/ConfirmDialog";
import FleetNav from "./fleet-nav";
import ImportDialog, { PreviewRow } from "./import-dialog";
import { normaliseReg, parseAmount, parseDate, pick } from "./csv";
import { RecordTable, StatTile } from "./detail/common";
import { DriverName, DriverPicker, RegPlate, NoCompany } from "./shared";
import { CARD_GROUPS, cardState, Connection, formatDate, FuelCard, ImportBatch, money } from "./types";
import { useVehicles } from "./useVehicles";
import { useDrivers } from "./useDrivers";

type Section = "cards" | "reports";

interface CardRow extends FuelCard {
  litres30: number;
  cost30: number;
  vehicles: string[];
}

const FuelCardsPage: React.FC = () => {
  const router = useRouter();
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null; name?: string | null };
  const store = useVehicles(user?.company_id, user?.name || "You");
  const employees = useDrivers(user?.company_id);
  const { vehicles, loading } = store;

  const [section, setSection] = useState<Section>("cards");
  const [search, setSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
  const [editing, setEditing] = useState<(Omit<FuelCard, "id"> & { id?: number }) | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [toUndo, setToUndo] = useState<ImportBatch | null>(null);

  const monthAgo = dayjs().subtract(30, "day").format("YYYY-MM-DD");
  const cardRows: CardRow[] = useMemo(
    () =>
      store.cards.map((c) => {
        const fills = store.events.filter((e) => e.kind === "fuel" && e.card === c.number && e.date >= monthAgo);
        return {
          ...c,
          litres30: fills.reduce((s, e) => s + (e.litres ?? 0), 0),
          cost30: fills.reduce((s, e) => s + (e.cost ?? 0), 0),
          vehicles: c.driver_id
            ? vehicles.filter((v) => v.driver_id === c.driver_id && v.status !== "archived").map((v) => v.registration)
            : [],
        };
      }),
    [store.cards, store.events, vehicles, monthAgo],
  );

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return cardRows.filter(
      (c) => !term || [c.number, c.holder, c.driver_name ?? "", c.group, ...c.vehicles].join(" ").toLowerCase().includes(term),
    );
  }, [cardRows, search]);

  const unlinked = store.cards.filter((c) => !c.driver_id && !c.blocked).length;
  const expiring = store.cards.filter((c) => ["Expires soon", "Expired"].includes(cardState(c).label)).length;
  const fuelImports = store.imports.filter((i) => i.id.startsWith("fuel")).sort((a, b) => b.imported_at.localeCompare(a.imported_at) || b.id.localeCompare(a.id));
  const sources = store.connections.filter((c) => c.connected && c.target === "fuel");

  const columnHelper = createColumnHelper<CardRow>();
  const columns = [
    columnHelper.accessor("number", {
      header: "Card",
      cell: ({ row }) => (
        <Box sx={{ pl: 1 }}>
          <Typography className="f-14" fontWeight={700} sx={{ fontVariantNumeric: "tabular-nums" }}>
            •••• {row.original.number}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {row.original.holder}
          </Typography>
        </Box>
      ),
    }),
    columnHelper.accessor((c) => c.driver_name ?? "", {
      id: "person",
      header: "Person",
      cell: ({ row }) =>
        row.original.driver_name ? (
          <DriverName name={row.original.driver_name} />
        ) : (
          <Chip size="small" color="warning" variant="outlined" label="Not linked" />
        ),
    }),
    columnHelper.accessor("group", {
      header: "Group",
      cell: ({ row }) => (
        <Typography className="f-14" sx={{ pl: 1 }}>
          {row.original.group}
        </Typography>
      ),
    }),
    columnHelper.accessor((c) => c.vehicles.join(" "), {
      id: "vehicle",
      header: "Fuels vehicle",
      cell: ({ row }) =>
        row.original.vehicles.length ? (
          <Stack direction="row" spacing={0.5} sx={{ pl: 1 }}>
            {row.original.vehicles.map((r) => (
              <RegPlate key={r} registration={r} />
            ))}
          </Stack>
        ) : (
          <Typography className="f-14" color="textSecondary" sx={{ pl: 1 }}>
            {row.original.driver_id ? "No vehicle now" : "-"}
          </Typography>
        ),
    }),
    columnHelper.accessor("cost30", {
      header: "Last 30 days",
      cell: ({ row }) => (
        <Box sx={{ pl: 1 }}>
          <Typography className="f-14">{row.original.cost30 ? money(row.original.cost30) : "-"}</Typography>
          {row.original.litres30 > 0 && (
            <Typography variant="caption" color="textSecondary">
              {row.original.litres30.toFixed(1)} L
            </Typography>
          )}
        </Box>
      ),
    }),
    columnHelper.accessor("expires", {
      header: "Expires",
      cell: ({ row }) => {
        const s = cardState(row.original);
        return (
          <Box sx={{ pl: 1 }}>
            <Chip size="small" color={s.color} label={s.label} />
            <Typography variant="caption" color="textSecondary" display="block">
              {dayjs(`${row.original.expires}-01`).format("MM/YYYY")}
            </Typography>
          </Box>
        );
      },
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Tooltip title="Edit card">
          <IconButton color="primary" onClick={() => setEditing(row.original)}>
            <IconEdit size={18} />
          </IconButton>
        </Tooltip>
      ),
    }),
  ];

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: true,
  });

  /* ---------- Shell report import ---------- */
  // The vehicle a person had on a given day, from the driver history.
  const vehicleOn = (driverId: number, date: string) =>
    store.driverLogs.find((l) => l.driver_id === driverId && l.from <= date && (l.to ?? "9999") >= date)?.vehicle_id ?? null;

  const sampleCsv = (_source: Connection) => {
    const d = (n: number) => dayjs().subtract(n, "day").format("DD/MM/YYYY");
    return [
      "Card Number,Driver,Transaction Date,Site,Litres,Gross Amount,Odometer,Registration",
      `7077 0000 0042 4421,J STOREMAN,${d(10)},Shell Wood Green,55.10,81.55,47930,LX21ABC`,
      `7077 0000 0042 4421,J STOREMAN,${d(1)},Shell Tottenham,48.20,71.80,48530,LX21ABC`,
      `7077 0000 0042 7730,M BUYER,${d(2)},Shell Camden,39.50,58.70,62010,KP70XYZ`,
      `7077 0000 0043 0019,POOL CARD 1,${d(3)},Shell Enfield,30.00,44.40,,`,
      `7077 0000 0099 9999,UNKNOWN,${d(4)},Shell Stratford,25.00,37.10,,AB12CDE`,
      `7077 0000 0042 7730,M BUYER,,Shell Camden,12.00,,,KP70XYZ`,
    ].join("\n");
  };

  // Highest odometer already recorded for a vehicle on or before a date.
  const lastReading = (vehicleId: number, date: string) =>
    Math.max(0, ...store.events.filter((e) => e.vehicle_id === vehicleId && e.date <= date && e.mileage).map((e) => e.mileage as number));

  // An odometer lower than one already recorded is a typo in the report: the fill is kept, the reading is not.
  const checkOdometer = (row: PreviewRow): PreviewRow => {
    if (!row.vehicleId || !row.odometer) return row;
    const last = lastReading(row.vehicleId, row.date);
    if (row.odometer >= last) return row;
    return {
      ...row,
      odometer: null,
      reason: `Odometer ${row.odometer.toLocaleString("en-GB")} is lower than ${last.toLocaleString("en-GB")}: not used`,
    };
  };

  const buildPreview = (records: Record<string, string>[]): PreviewRow[] =>
    records.map((r, i) => checkOdometer(previewRow(r, i)));

  const previewRow = (r: Record<string, string>, i: number): PreviewRow => {
      const card = pick(r, ["cardnumber", "card", "pan"]).replace(/\D/g, "").slice(-6);
      const date = parseDate(pick(r, ["transactiondate", "date"]));
      const litres = parseAmount(pick(r, ["litres", "quantity", "volume"]));
      const amount = parseAmount(pick(r, ["grossamount", "amount", "total", "cost"]));
      const odo = parseAmount(pick(r, ["odometer", "mileage"]));
      const registration = pick(r, ["registration", "vrm", "reg"]);
      const base = {
        key: `r${i}`,
        date,
        registration,
        amount,
        litres,
        odometer: Number.isFinite(odo) && odo > 0 ? odo : null,
        card,
        place: pick(r, ["site", "station", "location"]),
      };
      if (!date || !Number.isFinite(amount) || !(litres > 0))
        return { ...base, vehicleId: null, status: "invalid" as const, reason: "Date, litres or amount missing" };
      const duplicate = store.events.some(
        (e) => e.kind === "fuel" && e.card === card && e.date === date && Math.abs((e.litres ?? 0) - litres) < 0.01,
      );
      if (duplicate) return { ...base, vehicleId: null, status: "duplicate" as const };
      const byReg = registration ? vehicles.find((v) => normaliseReg(v.registration) === normaliseReg(registration)) : undefined;
      const c = store.cards.find((x) => x.number === card);
      if (!c) return { ...base, vehicleId: null, status: "unlinked_card" as const, reason: "Card not in your list" };
      if (c.driver_id) {
        const vid = vehicleOn(c.driver_id, date);
        if (vid) return { ...base, vehicleId: vid, status: "ready" as const };
        return { ...base, vehicleId: byReg?.id ?? null, status: "unknown" as const, reason: `${c.driver_name} had no vehicle that day` };
      }
      if (byReg) return { ...base, vehicleId: byReg.id, status: "ready" as const, reason: "Matched by registration" };
      return { ...base, vehicleId: null, status: "unlinked_card" as const, reason: "Card not linked to a person" };
  };

  const applyFuel = async (source: Connection, fileName: string, ready: PreviewRow[], skipped: PreviewRow[]) => {
    const dates = [...ready, ...skipped].map((r) => r.date).filter(Boolean).sort();
    const message = await store.applyImport(
      {
        connection_id: source.id,
        source: source.name,
        file_name: fileName,
        period_from: dates[0] ?? "",
        period_to: dates[dates.length - 1] ?? "",
        rows: ready.length,
        litres: ready.reduce((s, r) => s + (r.litres ?? 0), 0),
        total: ready.reduce((s, r) => s + r.amount, 0),
      },
      // rows whose vehicle was chosen by hand get the same odometer check
      ready.map(checkOdometer).map((r) => ({
        vehicle_id: r.vehicleId as number,
        kind: "fuel",
        date: r.date,
        mileage: r.odometer ?? null,
        cost: r.amount,
        litres: r.litres,
        supplier: r.place || source.name,
        invoice_no: "",
        note: "",
        card: r.card,
      })),
      skipped.map((r) => ({
        type: r.status === "unlinked_card" ? "card_not_linked" : "unknown_registration",
        detail: `•••• ${r.card} · ${r.place ?? ""} · ${(r.litres ?? 0).toFixed(1)} L${r.reason ? ` · ${r.reason}` : ""}`,
        vehicle_id: null,
        date: r.date,
        amount: r.amount,
      })),
      "fuel",
    );
    toast.success(
      message ??
        `${ready.length} fill${ready.length === 1 ? "" : "s"} imported${skipped.length ? `, ${skipped.length} added to conflicts` : ""}.`,
    );
    setSection("reports");
  };

  if (store.noCompany) return <NoCompany />;

  return (
    <Box sx={{ minHeight: "calc(100vh - 100px)", display: "flex", flexDirection: "column" }}>
      <FleetNav data={store} />

      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} px={2} pt={2} spacing={1}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Fuel cards
          </Typography>
          <Typography variant="body2" color="textSecondary">
            A card belongs to a person. Fuel goes to the vehicle that person is driving on the day.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<IconFileImport size={18} />} onClick={() => setImportOpen(true)}>
            Import fuel report
          </Button>
          <Button
            variant="contained"
            startIcon={<IconPlus size={18} />}
            onClick={() =>
              setEditing({ number: "", holder: "", driver_id: null, driver_name: null, group: "Drivers", expires: "", blocked: false })
            }
          >
            Add card
          </Button>
        </Stack>
      </Stack>

      <Tabs value={section} onChange={(_, v: Section) => setSection(v)} sx={{ px: 2, mt: 1 }}>
        <Tab value="cards" label={`Cards (${store.cards.length})`} />
        <Tab value="reports" label={`Imported reports (${fuelImports.length})`} />
      </Tabs>
      <Divider />

      {section === "cards" && (
        <>
          <Grid container spacing={2} sx={{ px: 2, pt: 2 }}>
            <Grid size={{ xs: 6, md: 3 }}>
              <StatTile tone="blue" label="Cards" value={store.cards.length} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <StatTile tone="purple" label="Not linked to a person" value={unlinked} sub={unlinked ? "Their fuel can't be placed on a vehicle" : "All linked"} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <StatTile tone="green" label="Expired or expiring" value={expiring} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <StatTile tone="pink"
                label="Fuel on cards · 30 days"
                value={money(cardRows.reduce((s, c) => s + c.cost30, 0))}
                sub={`${cardRows.reduce((s, c) => s + c.litres30, 0).toFixed(1)} L`}
              />
            </Grid>
          </Grid>
          <Stack direction="row" mx={2} my={1.5}>
            <TextField
              size="small"
              placeholder="Search card, holder or vehicle..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ minWidth: { sm: 300 } }}
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
          </Stack>
          <Divider />
          <InventoryTable table={table} loading={loading} rowCount={rows.length} onRowClick={(c: CardRow) => setEditing(c)} />
          <Divider />
          <TablePaginationFooter table={table} totalRows={rows.length} />
        </>
      )}

      {section === "reports" && (
        <Box p={2}>
          <RecordTable<ImportBatch>
            rows={fuelImports}
            empty="No fuel reports imported yet."
            columns={[
              { header: "Imported", render: (i) => `${formatDate(i.imported_at)} · ${i.imported_by}` },
              {
                header: "File",
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
              { header: "Period", render: (i) => (i.period_from ? `${formatDate(i.period_from)} – ${formatDate(i.period_to)}` : "-") },
              { header: "Fills", render: (i) => i.rows },
              { header: "Litres", render: (i) => `${i.litres.toFixed(1)} L` },
              { header: "Total", align: "right", render: (i) => <b>{money(i.total)}</b> },
              {
                header: "",
                align: "right",
                render: (i) =>
                  i.undone_at ? (
                    <Tooltip title={`Undone by ${i.undone_by} on ${formatDate(i.undone_at)}`}>
                      <Chip size="small" label="Undone" />
                    </Tooltip>
                  ) : (
                    <Button size="small" variant="outlined" color="error" startIcon={<IconArrowBackUp size={16} />} onClick={() => setToUndo(i)}>
                      Undo
                    </Button>
                  ),
              },
            ]}
          />
        </Box>
      )}

      <CardDrawer
        value={editing}
        employees={employees}
        numbers={store.cards.filter((c) => c.id !== editing?.id).map((c) => c.number)}
        onClose={() => setEditing(null)}
        onSave={async (c) => {
          try {
            await store.saveCard(c);
          } catch {
            return; // the API's message is already shown
          }
          toast.success(c.id ? `Card •••• ${c.number} updated.` : `Card •••• ${c.number} added.`);
          setEditing(null);
        }}
      />

      <ImportDialog
        open={importOpen}
        title="Import fuel report"
        columnsHint="Use the supplier's Fuel Consumption Report (CSV): card number, date, litres and amount on each row. Odometer, site and registration are used when present. Only the last 6 digits of each card are kept."
        sources={sources}
        vehicles={vehicles.filter((v) => v.status !== "archived")}
        sampleCsv={sampleCsv}
        buildPreview={buildPreview}
        onApply={applyFuel}
        onClose={() => setImportOpen(false)}
        onGoToConnections={() => router.push("/apps/vehicles/settings#connections")}
      />

      <ConfirmDialog
        open={!!toUndo}
        title="Undo import"
        message={
          toUndo
            ? `Remove the ${toUndo.rows} fill${toUndo.rows === 1 ? "" : "s"} (${money(toUndo.total)}) that ${toUndo.file_name} added? Its open conflicts are closed. Mileage already moved on is not changed.`
            : ""
        }
        confirmLabel="Undo import"
        onClose={() => setToUndo(null)}
        onConfirm={async () => {
          if (!toUndo) return;
          try {
            await store.undoImport(toUndo.id);
          } catch {
            return; // the API's message is already shown
          }
          toast.success("Import undone.");
          setToUndo(null);
        }}
      />
    </Box>
  );
};

/* ---------- Add / edit a fuel card (fleet_fuel_cards) ---------- */
const CardDrawer: React.FC<{
  value: (Omit<FuelCard, "id"> & { id?: number }) | null;
  employees: { id: number; name: string }[];
  numbers: string[];
  onClose: () => void;
  onSave: (c: Omit<FuelCard, "id"> & { id?: number }) => Promise<void>;
}> = ({ value, employees, numbers, onClose, onSave }) => {
  const [form, setForm] = useState<(Omit<FuelCard, "id"> & { id?: number }) | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  React.useEffect(() => {
    setForm(value ? { ...value } : null);
    setShowErrors(false);
  }, [value]);

  if (!value || !form) return null;
  const set = <K extends keyof FuelCard>(k: K, v: FuelCard[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const errors = {
    number:
      form.number && form.number.length !== 6
        ? "Enter the last 6 digits."
        : numbers.includes(form.number)
          ? "This card is already in the list."
          : showErrors && !form.number
            ? "Enter the last 6 digits of the card."
            : "",
    holder: showErrors && !form.holder.trim() ? "Enter the name printed on the card." : "",
    expires: showErrors && !form.expires ? "Enter the expiry month." : "",
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowErrors(true);
    if (form.number.length !== 6 || numbers.includes(form.number) || !form.holder.trim() || !form.expires) {
      toast.error("Please check the highlighted fields.");
      return;
    }
    await onSave({ ...form, holder: form.holder.trim().toUpperCase() });
  };

  return (
    <FormDrawer open title={value.id ? `Fuel card •••• ${value.number}` : "Add fuel card"} onClose={onClose} onSubmit={submit} isSaving={false} submitLabel="Save card">
      <Alert severity="info">
        The card belongs to the person. Fuel bought with it goes to the vehicle they are driving on the day, so the cost lands on the right vehicle.
      </Alert>
      <Stack direction="row" spacing={2}>
        <Box flex={1}>
          <FormField label="Last 6 digits *">
            <CustomTextField
              fullWidth
              value={form.number}
              disabled={!!value.id}
              onChange={(e: any) => /^\d{0,6}$/.test(e.target.value) && set("number", e.target.value)}
              error={!!errors.number}
              helperText={errors.number || "Only the last 6 digits are kept"}
              slotProps={{ htmlInput: { inputMode: "numeric" } }}
            />
          </FormField>
        </Box>
        <Box flex={1}>
          <FormField label="Expires *">
            <CustomTextField
              type="month"
              fullWidth
              value={form.expires}
              onChange={(e: any) => set("expires", e.target.value)}
              error={!!errors.expires}
              helperText={errors.expires}
            />
          </FormField>
        </Box>
      </Stack>
      <FormField label="Name on the card *">
        <CustomTextField
          fullWidth
          value={form.holder}
          onChange={(e: any) => set("holder", e.target.value.slice(0, 40))}
          error={!!errors.holder}
          helperText={errors.holder}
          slotProps={{ htmlInput: { style: { textTransform: "uppercase" } } }}
        />
      </FormField>
      <FormField label="Person" hint={form.driver_id ? undefined : "Leave empty for a pool card. Its fuel is placed by registration, or listed in Conflicts."}>
        <DriverPicker
          drivers={employees}
          value={form.driver_id}
          onChange={(d) => setForm((f) => (f ? { ...f, driver_id: d?.id ?? null, driver_name: d?.name ?? null } : f))}
        />
      </FormField>
      <FormField label="Group">
        <CustomTextField select size="small" fullWidth value={form.group} onChange={(e: any) => set("group", e.target.value)}>
          {CARD_GROUPS.map((g) => (
            <MenuItem key={g} value={g}>
              {g}
            </MenuItem>
          ))}
        </CustomTextField>
      </FormField>
      <FormControlLabel
        control={<Switch checked={form.blocked} onChange={(e) => set("blocked", e.target.checked)} color="error" />}
        label="Card blocked (lost, stolen or cancelled)"
      />
    </FormDrawer>
  );
};

export default FuelCardsPage;

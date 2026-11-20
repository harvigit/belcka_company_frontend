"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  ButtonBase,
  Chip,
  Divider,
  Grid,
  InputAdornment,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import {
  createColumnHelper,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  IconAlertOctagon,
  IconCalendarDue,
  IconCamera,
  IconChecklist,
  IconEye,
  IconReceipt,
  IconSearch,
  IconTool,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import TablePaginationFooter from "@/app/components/common/TablePaginationFooter";
import InventoryTable from "../inventory-new/shared/InventoryTable";
import FleetNav from "./fleet-nav";
import { ActionCategory, ActionRow, ACTION_CATEGORY, buildActions, PRIORITY } from "./actions";
import { DefectReviewDrawer } from "./defect-drawer";
import ChecklistDialog from "./checklist-dialog";
import { RecordTable, CARD_TONE, TONES } from "./detail/common";
import { RegPlate, NoCompany } from "./shared";
import {
  checklistSafe,
  defectItem,
  DailyChecklist,
  Defect,
  DEFECT_STATUS,
  formatDate,
  formatMiles,
  SEVERITY,
  Vehicle,
} from "./types";
import { useVehicles } from "./useVehicles";

type Focus = "all" | "urgent" | "defects" | "due" | "approvals";
type Section = "queue" | "checks" | "register";

const FOCUS_MATCH: Record<Focus, (r: ActionRow) => boolean> = {
  all: () => true,
  urgent: (r) => r.priority !== "normal",
  defects: (r) => r.category === "defect" || r.category === "accident",
  due: (r) => r.category === "due" || r.category === "licence",
  approvals: (r) =>
    r.category === "permit" || r.category === "expense" || r.category === "conflict" || r.category === "fuel",
};

const ActionCentre: React.FC = () => {
  const router = useRouter();
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null; name?: string | null };
  const store = useVehicles(user?.company_id, user?.name || "You");
  const { vehicles, loading } = store;

  const [section, setSection] = useState<Section>("queue");
  const [focus, setFocus] = useState<Focus>("all");
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
  const [reviewId, setReviewId] = useState<number | null>(null);
  const [checklistId, setChecklistId] = useState<number | null>(null);

  // Opened from elsewhere: ?defect=ID shows that report (Map), ?section=checks|register opens
  // that tab (Vehicles tiles).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = Number(params.get("defect"));
    const tab = params.get("section");
    if (tab === "checks" || tab === "register") setSection(tab);
    if (id) setReviewId(id);
    if (id || tab) router.replace("/apps/vehicles/action-centre", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [registerFilter, setRegisterFilter] = useState<"open" | "all">("open");

  const actions = useMemo(
    () =>
      buildActions({
        vehicles,
        events: store.events,
        defects: store.defects,
        permits: store.permits,
        onboardings: store.onboardings,
        licences: store.licences,
        conflicts: store.conflicts,
      }),
    [vehicles, store.events, store.defects, store.permits, store.onboardings, store.licences, store.conflicts],
  );
  const byId = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);
  const urgent = actions.filter((a) => a.priority !== "normal").length;
  const pendingExpenses = store.events.filter((e) => e.status === "pending").length;

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return actions.filter(
      (a) =>
        FOCUS_MATCH[focus](a) &&
        (!term ||
          [a.title, a.detail, a.vehicle?.registration ?? "", a.vehicle?.driver_name ?? ""]
            .join(" ")
            .toLowerCase()
            .includes(term)),
    );
  }, [actions, focus, search]);

  const openTarget = (a: ActionRow) => {
    if (a.target.kind === "defect") setReviewId(a.target.defectId);
    else if (a.target.kind === "expenses") router.push("/apps/vehicles/expenses");
    else if (a.target.kind === "drivers") router.push("/apps/vehicles/drivers");
    else if (a.target.kind === "conflicts") router.push("/apps/vehicles/road-costs?tab=conflicts");
    else router.push(`/apps/vehicles/${a.target.vehicleId}${a.target.tab === "overview" ? "" : `?tab=${a.target.tab}`}`);
  };

  const columnHelper = createColumnHelper<ActionRow>();
  const columns = [
    columnHelper.accessor((r) => PRIORITY[r.priority].order, {
      id: "priority",
      header: "Priority",
      cell: ({ row }) => {
        const p = PRIORITY[row.original.priority];
        return <Chip size="small" color={p.color} label={p.label} sx={{ ml: 1 }} />;
      },
    }),
    columnHelper.accessor("title", {
      header: "What needs doing",
      cell: ({ row }) => (
        <Box sx={{ pl: 1, maxWidth: 420 }}>
          <Typography className="f-14" fontWeight={600}>
            {row.original.title}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {ACTION_CATEGORY[row.original.category]} · {row.original.detail}
          </Typography>
        </Box>
      ),
    }),
    columnHelper.accessor((r) => r.vehicle?.registration ?? "", {
      id: "vehicle",
      header: "Vehicle",
      cell: ({ row }) =>
        row.original.vehicle ? (
          <Stack spacing={0.5} alignItems="flex-start" sx={{ pl: 1 }}>
            <RegPlate registration={row.original.vehicle.registration} />
            <Typography variant="caption" color="textSecondary" noWrap>
              {row.original.vehicle.driver_name ?? "No driver"}
            </Typography>
          </Stack>
        ) : (
          <Typography className="f-14" sx={{ pl: 1 }} color="textSecondary">
            Several
          </Typography>
        ),
    }),
    columnHelper.accessor("date", {
      header: "Date",
      cell: ({ row }) => {
        const d = row.original.date;
        const past = d < dayjs().format("YYYY-MM-DD");
        return (
          <Typography className="f-14" sx={{ pl: 1 }} color={row.original.category === "due" && past ? "error" : undefined}>
            {formatDate(d)}
          </Typography>
        );
      },
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: ({ row }) => (
        <Typography className="f-14" sx={{ pl: 1 }} color="textSecondary">
          {row.original.status}
        </Typography>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button size="small" variant="outlined" onClick={() => openTarget(row.original)}>
          {row.original.target.kind === "defect" ? "Review" : row.original.target.kind === "expenses" ? "Approve" : row.original.target.kind === "drivers" ? "Check" : "Open"}
        </Button>
      ),
    }),
  ];

  const table = useReactTable({
    data: rows,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: true,
  });

  // Daily checks: every company vehicle in use with a driver should have one each day.
  const today = dayjs().format("YYYY-MM-DD");
  const needCheck = vehicles.filter((v) => v.status === "active" && v.driver_id && v.type !== "private");
  const todaysChecks = new Map(
    store.checklists.filter((c) => c.date === today).map((c) => [c.vehicle_id, c] as [number, DailyChecklist]),
  );
  const recentChecks = [...store.checklists]
    .filter((c) => c.date >= dayjs().subtract(14, "day").format("YYYY-MM-DD"))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);

  const register = [...store.defects]
    .filter((d) => registerFilter === "all" || d.status === "open" || d.status === "in_progress")
    .sort((a, b) => b.reported_at.localeCompare(a.reported_at) || b.id - a.id);

  const tiles: { key: Focus; label: string; count: number; icon: React.ReactNode; color: "primary" | "error" | "warning" | "info" | "secondary" }[] = [
    { key: "all", label: "Open actions", count: actions.length, icon: <IconChecklist size={22} />, color: "primary" },
    { key: "urgent", label: "Critical or high", count: urgent, icon: <IconAlertOctagon size={22} />, color: "error" },
    { key: "defects", label: "Defects and accidents", count: actions.filter(FOCUS_MATCH.defects).length, icon: <IconTool size={22} />, color: "warning" },
    { key: "due", label: "Due dates and licences", count: actions.filter(FOCUS_MATCH.due).length, icon: <IconCalendarDue size={22} />, color: "info" },
    { key: "approvals", label: "Approvals and fuel", count: actions.filter(FOCUS_MATCH.approvals).length, icon: <IconReceipt size={22} />, color: "secondary" },
  ];

  const reviewDefect = store.defects.find((d) => d.id === reviewId) ?? null;
  const checklist = store.checklists.find((c) => c.id === checklistId) ?? null;

  if (store.noCompany) return <NoCompany />;

  return (
    <Box sx={{ minHeight: "calc(100vh - 100px)", display: "flex", flexDirection: "column" }}>
      <FleetNav data={store} />

      <Box px={2} pt={2}>
        <Typography variant="h5" fontWeight={700}>
          Action Centre
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Everything about the vehicles that needs the office, most urgent first. Defects come from the drivers&apos; daily checklists.
        </Typography>
      </Box>

      <Tabs value={section} onChange={(_, v: Section) => setSection(v)} sx={{ px: 2, mt: 1 }}>
        <Tab value="queue" label={`To do (${actions.length})`} />
        <Tab value="checks" label={`Daily checks (${todaysChecks.size}/${needCheck.length} today)`} />
        <Tab value="register" label="Defect register" />
      </Tabs>
      <Divider />

      {section === "queue" && (
        <>
          <Grid container spacing={2} sx={{ px: 2, pt: 2 }}>
            {tiles.map((t) => {
              const active = focus === t.key;
              return (
                <Grid key={t.key} size={{ xs: 6, sm: 4, md: "grow" }}>
                  <ButtonBase
                    onClick={() => setFocus(active && t.key !== "all" ? "all" : t.key)}
                    aria-pressed={active}
                    sx={{
                      width: "100%",
                      justifyContent: "flex-start",
                      gap: 1.5,
                      p: 1.5,
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: active ? TONES[CARD_TONE[t.color]].fg : "transparent",
                      backgroundColor: TONES[CARD_TONE[t.color]].bg,
                      boxShadow: active ? 1 : 0,
                      textAlign: "left",
                      "&:hover": { borderColor: TONES[CARD_TONE[t.color]].fg },
                    }}
                  >
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: TONES[CARD_TONE[t.color]].fg,
                        backgroundColor: "background.paper",
                        flexShrink: 0,
                      }}
                    >
                      {t.icon}
                    </Box>
                    <Box>
                      <Typography variant="h5" fontWeight={700} lineHeight={1.1}>
                        {t.count}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {t.label}
                      </Typography>
                    </Box>
                  </ButtonBase>
                </Grid>
              );
            })}
          </Grid>

          <Stack direction="row" spacing={1} alignItems="center" mx={2} my={1.5} flexWrap="wrap">
            <TextField
              size="small"
              placeholder="Search action, vehicle or driver..."
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
            {focus !== "all" && (
              <Chip label={tiles.find((t) => t.key === focus)?.label} onDelete={() => setFocus("all")} color="primary" variant="outlined" />
            )}
          </Stack>
          <Divider />

          {!loading && rows.length === 0 ? (
            <Stack alignItems="center" spacing={1} py={6}>
              <Typography variant="h6">{actions.length ? "Nothing matches" : "All clear"}</Typography>
              <Typography color="textSecondary">
                {actions.length
                  ? "No actions match your search or filter."
                  : "No defects, accidents, due dates or approvals need you right now."}
              </Typography>
              {actions.length > 0 && (
                <Button variant="outlined" onClick={() => { setSearch(""); setFocus("all"); }}>
                  Show all actions
                </Button>
              )}
            </Stack>
          ) : (
            <>
              <InventoryTable table={table} loading={loading} rowCount={rows.length} onRowClick={openTarget} />
              <Divider />
              <TablePaginationFooter table={table} totalRows={rows.length} />
            </>
          )}
        </>
      )}

      {section === "checks" && (
        <Box p={2} display="flex" flexDirection="column" gap={3}>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Today
            </Typography>
            <Typography variant="body2" color="textSecondary" mb={1.5}>
              Drivers complete a daily checklist in the app before the first journey. An item marked as a defect needs a camera photo and goes to the queue straight away.
            </Typography>
            <Grid container spacing={2}>
              {needCheck.map((v) => {
                const c = todaysChecks.get(v.id);
                const safe = c ? checklistSafe(c) : false;
                return (
                  <Grid key={v.id} size={{ xs: 12, sm: 6, md: 4 }}>
                    <Paper variant="outlined" sx={{ borderRadius: 2, height: "100%", display: "flex", flexDirection: "column" }}>
                      <Box p={1.5} flex={1}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <RegPlate registration={v.registration} />
                          <Chip
                            size="small"
                            color={!c ? "default" : safe ? "success" : "error"}
                            label={!c ? "Not done yet" : safe ? "Safe to drive" : "Defects found"}
                          />
                        </Stack>
                        <Typography variant="body2" fontWeight={600} mt={1.5}>
                          {v.driver_name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {c ? `Sent ${formatDate(c.date)} · ${formatMiles(c.mileage)}` : "Waiting for the driver to send it"}
                        </Typography>
                      </Box>
                      {c && (
                        <>
                          <Divider />
                          <Box px={1.5} py={1}>
                            <Button
                              size="small"
                              variant="outlined"
                              color={safe ? "primary" : "error"}
                              startIcon={<IconEye size={16} />}
                              onClick={() => setChecklistId(c.id)}
                            >
                              {safe ? "View checklist" : "View defects"}
                            </Button>
                          </Box>
                        </>
                      )}
                    </Paper>
                  </Grid>
                );
              })}
              {needCheck.length === 0 && (
                <Grid size={12}>
                  <Typography color="textSecondary">No company vehicles with a driver today.</Typography>
                </Grid>
              )}
            </Grid>
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700} mb={1.5}>
              Last 14 days
            </Typography>
            <RecordTable
              rows={recentChecks}
              empty="No checklists in the last 14 days."
              columns={[
                { header: "Date", render: (c) => formatDate(c.date) },
                { header: "Vehicle", render: (c) => <RegPlate registration={byId.get(c.vehicle_id)?.registration ?? "-"} /> },
                { header: "Driver", render: (c) => c.driver_name },
                { header: "Odometer", render: (c) => formatMiles(c.mileage) },
                {
                  header: "Result",
                  render: (c) => {
                    const failed = c.items.filter((i) => !i.ok);
                    return (
                      <Chip
                        size="small"
                        color={failed.length ? "error" : "success"}
                        label={failed.length ? `${failed.length} defect${failed.length > 1 ? "s" : ""}` : "Safe to drive"}
                      />
                    );
                  },
                },
                {
                  header: "",
                  align: "right",
                  render: (c) => (
                    <Button size="small" onClick={() => setChecklistId(c.id)}>
                      View
                    </Button>
                  ),
                },
              ]}
            />
          </Box>
        </Box>
      )}

      {section === "register" && (
        <Box p={2} display="flex" flexDirection="column" gap={1.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="textSecondary">
              Every defect and accident, with what was done about it.
            </Typography>
            <Tabs value={registerFilter} onChange={(_, v) => setRegisterFilter(v)} sx={{ minHeight: 0 }}>
              <Tab value="open" label="Open" sx={{ minHeight: 0, py: 1 }} />
              <Tab value="all" label="All" sx={{ minHeight: 0, py: 1 }} />
            </Tabs>
          </Stack>
          <RecordTable<Defect>
            rows={register}
            empty={registerFilter === "open" ? "No open defects or accidents." : "No defects reported yet."}
            columns={[
              { header: "Reported", render: (d) => `${formatDate(d.reported_at)} · ${d.reported_by}` },
              { header: "Vehicle", render: (d) => <RegPlate registration={byId.get(d.vehicle_id)?.registration ?? "-"} /> },
              {
                header: "Defect / accident",
                render: (d) => (
                  <Box sx={{ maxWidth: 320 }}>
                    <Typography variant="body2" fontWeight={600}>
                      {d.type === "accident" ? `Accident · ${formatDate(d.incident_date)}` : d.category}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {d.description}
                    </Typography>
                  </Box>
                ),
              },
              {
                header: "Photos",
                render: (d) => {
                  const n = d.type === "accident" ? d.photos?.length ?? 0 : defectItem(d, store.checklists)?.photos.length ?? 0;
                  if (d.type === "accident" && !n) return <Typography variant="body2" color="textSecondary">None</Typography>;
                  return n ? (
                    <Chip size="small" variant="outlined" icon={<IconCamera size={14} />} label={n} />
                  ) : (
                    <Chip size="small" color="warning" variant="outlined" label="None" />
                  );
                },
              },
              {
                header: "Severity",
                render: (d) =>
                  d.type === "accident" ? (
                    <Chip size="small" color="error" variant="outlined" label="Accident" />
                  ) : (
                    <Chip size="small" color={SEVERITY[d.severity].color} label={SEVERITY[d.severity].label} />
                  ),
              },
              { header: "Status", render: (d) => <Chip size="small" color={DEFECT_STATUS[d.status].color} label={DEFECT_STATUS[d.status].label} /> },
              { header: "Responsible", render: (d) => d.owner || "-" },
              {
                header: "",
                align: "right",
                render: (d) => (
                  <Button size="small" variant="outlined" onClick={() => setReviewId(d.id)}>
                    {d.status === "open" || d.status === "in_progress" ? "Review" : "View"}
                  </Button>
                ),
              },
            ]}
          />
        </Box>
      )}

      <DefectReviewDrawer
        defect={reviewDefect}
        vehicle={reviewDefect ? byId.get(reviewDefect.vehicle_id) ?? null : null}
        checklists={store.checklists}
        onClose={() => setReviewId(null)}
        onSave={store.updateDefect}
        onTakeOffRoad={(id) => store.updateVehicle(id, { status: "in_service" })}
        onOpenVehicle={(id) => router.push(`/apps/vehicles/${id}`)}
        onViewChecklist={(id) => setChecklistId(id)}
      />
      <ChecklistDialog
        checklist={checklist}
        vehicle={checklist ? byId.get(checklist.vehicle_id) ?? null : null}
        onClose={() => setChecklistId(null)}
      />
    </Box>
  );
};

export default ActionCentre;

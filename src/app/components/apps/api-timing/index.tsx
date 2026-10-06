"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tabs,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import { IconChevronDown, IconChevronRight, IconRefresh, IconTrash } from "@tabler/icons-react";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import DateRangePickerBox from "@/app/components/common/DateRangePickerBox";

type DateRange = { from: Date | null; to: Date | null };

// The selected local days, sent to the API as exact instants (start of the first day, end of the last day).
const toRangeParams = (range: DateRange) => {
  const params = new URLSearchParams();
  if (range.from) params.set("from", dayjs(range.from).startOf("day").toISOString());
  if (range.to) params.set("to", dayjs(range.to).endOf("day").toISOString());
  return params;
};

type DbQuery = { model: string; operation: string; caller: string; count: number; ms: number };
type TimingRequest = {
  id: string;
  timestamp: string;
  method: string;
  endpoint: string;
  route: string;
  query: string;
  status: number | null;
  totalMs: number;
  uploadMs: number | null;
  serverMs: number | null;
  bodyMB: number | null;
  uploadSpeed: number | null;
  responseKB: number | null;
  ua: string | null;
  db: { count: number; ms: number; queries: DbQuery[] } | null;
  service: { label: string; totalMs: number; meta: Record<string, any>; steps: { name: string; ms: number; count: number }[] } | null;
};

// Categorical slots validated for light/dark surfaces (upload, DB, server code).
const SEGMENT_COLORS = {
  light: { upload: "#2a78d6", db: "#eb6834", code: "#1baf7a" },
  dark: { upload: "#3987e5", db: "#d95926", code: "#199e70" },
};
type SegmentColors = typeof SEGMENT_COLORS.light;

const AUTO_REFRESH_MS = 10000;

const formatMs = (ms: number | null | undefined) => {
  if (ms == null) return "-";
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;
};

const deviceLabel = (ua?: string | null) => {
  if (!ua) return "-";
  if (ua.startsWith("Dart/")) return `App (${ua.split(" ")[0].replace("/", " ")})`;
  if (ua.startsWith("PostmanRuntime")) return "Postman";
  if (ua.startsWith("curl")) return "curl";
  if (/Mozilla/.test(ua)) return "Web";
  return ua.length > 24 ? `${ua.slice(0, 24)}…` : ua;
};

const shortEndpoint = (endpoint: string) => endpoint.replace(/^\//, "");

const toRow = (request: TimingRequest) => {
  const upload = request.uploadMs ?? 0;
  const server = request.serverMs ?? Math.max(0, request.totalMs - upload);
  // Parallel queries can add up to more than the wall-clock server time.
  const db = request.db ? Math.min(request.db.ms, server) : null;
  const code = db != null ? Math.max(0, server - db) : server;
  const isError = (request.status != null && request.status >= 400) || request.service?.meta?.success === "false" || request.service?.meta?.success === false;

  return { ...request, upload, server, dbShown: db, code, isError, device: deviceLabel(request.ua) };
};

type Row = ReturnType<typeof toRow>;

const average = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

const StatTile = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <Paper variant="outlined" sx={{ p: 2, flex: "1 1 160px", minWidth: 150 }}>
    <Typography variant="body2" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="h4" mt={0.5}>
      {value}
    </Typography>
    {hint && (
      <Typography variant="caption" color="text.secondary">
        {hint}
      </Typography>
    )}
  </Paper>
);

const BreakdownBar = ({ row, maxTotal, colors }: { row: Row; maxTotal: number; colors: SegmentColors }) => {
  const segments = [
    { key: "upload", label: "Upload", ms: row.upload, color: colors.upload },
    { key: "db", label: "DB queries", ms: row.dbShown ?? 0, color: colors.db },
    { key: "code", label: row.dbShown != null ? "Server code (non-DB)" : "Server", ms: row.code, color: colors.code },
  ].filter((segment) => segment.ms > 0);

  const widthPct = maxTotal > 0 ? Math.max(2, (row.totalMs / maxTotal) * 100) : 0;

  return (
    <Tooltip
      arrow
      title={
        <Box>
          {segments.map((segment) => (
            <Box key={segment.key} display="flex" justifyContent="space-between" gap={2}>
              <span>{segment.label}</span>
              <span>
                {formatMs(segment.ms)} ({Math.round((segment.ms / Math.max(row.totalMs, 1)) * 100)}%)
              </span>
            </Box>
          ))}
        </Box>
      }
    >
      <Box sx={{ width: 120, py: 1 }}>
        <Box sx={{ display: "flex", gap: "2px", width: `${widthPct}%`, height: 10 }}>
          {segments.map((segment, index) => (
            <Box
              key={segment.key}
              sx={{
                flexGrow: segment.ms,
                flexBasis: 0,
                minWidth: 2,
                bgcolor: segment.color,
                borderTopLeftRadius: index === 0 ? 4 : 0,
                borderBottomLeftRadius: index === 0 ? 4 : 0,
                borderTopRightRadius: index === segments.length - 1 ? 4 : 0,
                borderBottomRightRadius: index === segments.length - 1 ? 4 : 0,
              }}
            />
          ))}
        </Box>
      </Box>
    </Tooltip>
  );
};

const BarList = ({
  title,
  items,
  color,
}: {
  title: string;
  items: { key: string; label: React.ReactNode; title?: string; ms: number; count: number }[];
  color: string;
}) => {
  const max = Math.max(...items.map((item) => item.ms), 1);

  return (
    <Box>
      <Typography variant="subtitle2" mb={1}>
        {title}
      </Typography>
      <Stack spacing={0.5}>
        {items.map((item) => (
          <Box key={item.key} display="grid" gridTemplateColumns="minmax(0, 3fr) minmax(60px, 2fr) 100px" alignItems="center" gap={1}>
            <Typography variant="body2" color="text.secondary" title={item.title} sx={{ wordBreak: "break-word" }}>
              {item.label}
            </Typography>
            <Box sx={{ height: 8 }}>
              <Box
                sx={{
                  width: `${(item.ms / max) * 100}%`,
                  minWidth: item.ms ? 2 : 0,
                  height: "100%",
                  bgcolor: color,
                  borderRadius: "0 4px 4px 0",
                }}
              />
            </Box>
            <Typography variant="body2" textAlign="right">
              {formatMs(item.ms)}
              {item.count > 1 ? ` (x${item.count})` : ""}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Box>
  );
};

const TimingRow = ({ row, maxTotal, colors }: { row: Row; maxTotal: number; colors: SegmentColors }) => {
  const [open, setOpen] = useState(false);

  const queryItems = (row.db?.queries ?? []).map((query) => ({
    key: `${query.model}.${query.operation}@${query.caller}`,
    title: `${query.model}.${query.operation} @ ${query.caller}`,
    label: (
      <>
        <Box component="span" sx={{ display: "block", color: "text.primary", fontWeight: 500 }}>
          {query.model}.{query.operation}
        </Box>
        <Box component="span" sx={{ display: "block", fontSize: 12 }}>
          {query.caller}
        </Box>
      </>
    ),
    ms: query.ms,
    count: query.count,
  }));

  const stepItems = (row.service?.steps ?? [])
    .slice()
    .sort((a, b) => b.ms - a.ms)
    .map((step) => ({ key: step.name, title: step.name, label: step.name, ms: step.ms, count: step.count }));

  const details: [string, React.ReactNode][] = [
    ["Endpoint", `${row.method} ${row.endpoint}`],
    ["Query string", row.query || "-"],
    ["DB queries", row.db ? `${row.db.count} queries · ${formatMs(row.db.ms)} total` : "-"],
    ["Response", row.responseKB ? `${row.responseKB} KB` : "-"],
    ["Request body", row.bodyMB ? `${row.bodyMB} MB` : "-"],
    ...(row.service
      ? Object.entries(row.service.meta).map(([key, value]) => [key, String(value)] as [string, React.ReactNode])
      : []),
    ["User agent", row.ua || "-"],
  ];

  return (
    <>
      <TableRow hover sx={{ "& > td": { borderBottom: open ? "none" : undefined } }}>
        <TableCell padding="checkbox">
          <IconButton size="small" onClick={() => setOpen(!open)} aria-label="Show details">
            {open ? <IconChevronDown size={18} /> : <IconChevronRight size={18} />}
          </IconButton>
        </TableCell>
        <TableCell sx={{ whiteSpace: "nowrap" }}>{dayjs(row.timestamp).format("DD/MM HH:mm:ss")}</TableCell>
        <TableCell>
          <Chip size="small" variant="outlined" label={`${row.method} ${shortEndpoint(row.endpoint)}`} />
        </TableCell>
        <TableCell>
          <Typography variant="body2" color={row.isError ? "error.main" : "text.primary"}>
            {row.status ?? (row.isError ? "Error" : "OK")}
          </Typography>
        </TableCell>
        <TableCell sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>{formatMs(row.totalMs)}</TableCell>
        <TableCell>
          <BreakdownBar row={row} maxTotal={maxTotal} colors={colors} />
        </TableCell>
        <TableCell sx={{ whiteSpace: "nowrap" }}>{formatMs(row.upload)}</TableCell>
        <TableCell sx={{ whiteSpace: "nowrap" }}>{row.db ? `${formatMs(row.db.ms)} / ${row.db.count}q` : "-"}</TableCell>
        <TableCell sx={{ whiteSpace: "nowrap" }}>{formatMs(row.server)}</TableCell>
        <TableCell>{row.bodyMB ? row.bodyMB : "-"}</TableCell>
        <TableCell sx={{ whiteSpace: "nowrap" }}>
          <Tooltip title={row.ua ?? ""}>
            <span>{row.device}</span>
          </Tooltip>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={11} sx={{ py: 0 }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box py={2} display="grid" gridTemplateColumns={{ xs: "1fr", lg: "2fr 1fr" }} gap={3}>
              <Stack spacing={3} minWidth={0}>
                {queryItems.length > 0 && (
                  <BarList title="DB queries by call site (slowest first)" items={queryItems} color={colors.db} />
                )}
                {stepItems.length > 0 && (
                  <BarList title={`${row.service?.label} steps (total ${formatMs(row.service?.totalMs)})`} items={stepItems} color={colors.code} />
                )}
                {queryItems.length === 0 && stepItems.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    No DB queries recorded (request rejected before the handler ran, or an older log entry).
                  </Typography>
                )}
              </Stack>
              <Box minWidth={0}>
                <Typography variant="subtitle2" mb={1}>
                  Details
                </Typography>
                <Stack spacing={0.5}>
                  {details.map(([label, value]) => (
                    <Box key={label} display="flex" gap={2}>
                      <Typography variant="body2" color="text.secondary" minWidth={120}>
                        {label}
                      </Typography>
                      <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
                        {value}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

const DetailsTab = ({
  endpoint,
  setEndpoint,
  range,
}: {
  endpoint: string;
  setEndpoint: (value: string) => void;
  range: DateRange;
}) => {
  const theme = useTheme();
  const colors = SEGMENT_COLORS[theme.palette.mode === "dark" ? "dark" : "light"];

  const [requests, setRequests] = useState<TimingRequest[]>([]);
  const [endpoints, setEndpoints] = useState<string[]>([]);
  const [logFile, setLogFile] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(200);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = toRangeParams(range);
      params.set("limit", String(limit));
      if (endpoint !== "all") params.set("endpoint", endpoint);
      const res = await api.get(`api-timing/logs?${params.toString()}`);
      setRequests(res.data?.info?.requests ?? []);
      setEndpoints(res.data?.info?.endpoints ?? []);
      setLogFile(res.data?.info?.file ?? "");
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to load timing logs.");
    } finally {
      setLoading(false);
    }
  }, [limit, range, endpoint]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(fetchLogs, AUTO_REFRESH_MS);
    return () => clearInterval(timer);
  }, [autoRefresh, fetchLogs]);

  const handleClear = async () => {
    try {
      await api.post("api-timing/logs/clear");
      toast.success("Timing logs cleared.");
      setConfirmClear(false);
      fetchLogs();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to clear timing logs.");
    }
  };

  const rows = useMemo(
    () => requests.filter((request) => endpoint === "all" || (request.route ?? request.endpoint) === endpoint).map(toRow),
    [requests, endpoint],
  );

  const maxTotal = Math.max(...rows.map((row) => row.totalMs), 0);
  const avgTotal = average(rows.map((row) => row.totalMs));
  const avgUpload = average(rows.map((row) => row.upload));
  const dbRows = rows.filter((row) => row.db);
  const avgDb = average(dbRows.map((row) => row.db!.ms));
  const avgQueries = average(dbRows.map((row) => row.db!.count));
  const avgServer = average(rows.map((row) => row.server));
  const slowest = rows.reduce<Row | null>((max, row) => (!max || row.totalMs > max.totalMs ? row : max), null);
  const share = (value: number | null) => (avgTotal && value != null ? `${Math.round((value / avgTotal) * 100)}% of total` : undefined);

  return (
    <Box>
      <Stack gap={2} mb={3}>
        <Typography variant="body2" color="text.secondary">
          Where each request spends its time: upload, DB queries and server code. Source: {logFile || "-"}
        </Typography>
        <Stack direction="row" gap={1.5} alignItems="center" flexWrap="wrap">
          <TextField select size="small" label="Endpoint" value={endpoint} onChange={(e) => setEndpoint(e.target.value)} sx={{ minWidth: 260 }}>
            <MenuItem value="all">All endpoints</MenuItem>
            {endpoints.map((value) => (
              <MenuItem key={value} value={value}>
                {shortEndpoint(value)}
              </MenuItem>
            ))}
          </TextField>
          <TextField select size="small" label="Last" value={limit} onChange={(e) => setLimit(Number(e.target.value))} sx={{ width: 100 }}>
            {[50, 200, 500, 2000].map((value) => (
              <MenuItem key={value} value={value}>
                {value}
              </MenuItem>
            ))}
          </TextField>
          <FormControlLabel
            control={<Switch checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />}
            label="Auto refresh"
          />
          <Button variant="outlined" startIcon={<IconRefresh size={18} />} onClick={fetchLogs} disabled={loading}>
            Refresh
          </Button>
          <Button variant="outlined" color="error" startIcon={<IconTrash size={18} />} onClick={() => setConfirmClear(true)}>
            Clear
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Stack direction="row" gap={2} flexWrap="wrap" mb={3}>
        <StatTile label="Requests" value={String(rows.length)} />
        <StatTile label="Avg total" value={formatMs(avgTotal)} />
        <StatTile label="Avg upload" value={formatMs(avgUpload)} hint={share(avgUpload)} />
        <StatTile
          label="Avg DB"
          value={formatMs(avgDb)}
          hint={avgQueries != null ? `${Math.round(avgQueries)} queries/request` : undefined}
        />
        <StatTile label="Avg server" value={formatMs(avgServer)} hint={share(avgServer)} />
        <StatTile
          label="Slowest"
          value={formatMs(slowest?.totalMs)}
          hint={slowest ? shortEndpoint(slowest.endpoint) : undefined}
        />
      </Stack>

      <Stack direction="row" gap={2} mb={1} alignItems="center" flexWrap="wrap">
        {[
          ["Upload (client → server)", colors.upload],
          ["DB queries", colors.db],
          ["Server code (non-DB)", colors.code],
        ].map(([label, color]) => (
          <Stack key={label} direction="row" gap={0.75} alignItems="center">
            <Box sx={{ width: 12, height: 12, borderRadius: "3px", bgcolor: color }} />
            <Typography variant="body2" color="text.secondary">
              {label}
            </Typography>
          </Stack>
        ))}
      </Stack>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small" sx={{ "& th, & td": { px: 1 }, "& th": { whiteSpace: "nowrap" } }}>
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell>Time</TableCell>
              <TableCell>Endpoint</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Total</TableCell>
              <TableCell>Breakdown</TableCell>
              <TableCell>Upload</TableCell>
              <TableCell>DB (sum)</TableCell>
              <TableCell>Server</TableCell>
              <TableCell>Body MB</TableCell>
              <TableCell>Client</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">{loading ? "Loading…" : "No timing logs yet."}</Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => <TimingRow key={row.id} row={row} maxTotal={maxTotal} colors={colors} />)
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={confirmClear} onClose={() => setConfirmClear(false)}>
        <DialogTitle>Clear timing logs?</DialogTitle>
        <DialogContent>
          <Typography>This empties the log file on the server. It cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmClear(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleClear}>
            Clear
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

type SummaryRow = {
  key: string;
  method: string;
  route: string;
  calls: number;
  failures: number;
  failureRate: number;
  avgMs: number | null;
  p50Ms: number | null;
  p95Ms: number | null;
  maxMs: number | null;
  avgUploadMs: number | null;
  avgServerMs: number | null;
  avgDbMs: number | null;
  avgQueries: number | null;
  lastAt: string;
};

const SummaryTab = ({ range, onOpenRoute }: { range: DateRange; onOpenRoute: (route: string) => void }) => {
  const [rows, setRows] = useState<SummaryRow[]>([]);
  const [totals, setTotals] = useState({ calls: 0, failures: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`api-timing/summary?${toRangeParams(range).toString()}`);
      setRows(res.data?.info?.rows ?? []);
      setTotals({ calls: res.data?.info?.totalCalls ?? 0, failures: res.data?.info?.totalFailures ?? 0 });
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to load timing summary.");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const slowest = rows[0];

  return (
    <Box>
      <Stack direction="row" gap={1.5} alignItems="center" flexWrap="wrap" mb={3}>
        <Button variant="outlined" startIcon={<IconRefresh size={18} />} onClick={fetchSummary} disabled={loading}>
          Refresh
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Stack direction="row" gap={2} flexWrap="wrap" mb={3}>
        <StatTile label="APIs" value={String(rows.length)} />
        <StatTile label="Calls" value={String(totals.calls)} />
        <StatTile
          label="Failures"
          value={String(totals.failures)}
          hint={totals.calls ? `${Math.round((totals.failures / totals.calls) * 1000) / 10}% of calls` : undefined}
        />
        <StatTile label="Slowest avg" value={formatMs(slowest?.avgMs)} hint={slowest ? shortEndpoint(slowest.route) : undefined} />
      </Stack>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small" sx={{ "& th, & td": { px: 1.5 }, "& th": { whiteSpace: "nowrap" } }}>
          <TableHead>
            <TableRow>
              <TableCell>API URL</TableCell>
              <TableCell align="right">Calls</TableCell>
              <TableCell align="right">Failure</TableCell>
              <TableCell align="right">Average loading time</TableCell>
              <TableCell align="right">P95</TableCell>
              <TableCell align="right">Max</TableCell>
              <TableCell align="right">Avg upload</TableCell>
              <TableCell align="right">Avg server</TableCell>
              <TableCell align="right">Avg DB (sum)</TableCell>
              <TableCell>Last call</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">{loading ? "Loading…" : "No requests in this period."}</Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.key} hover sx={{ cursor: "pointer" }} onClick={() => onOpenRoute(row.route)}>
                  <TableCell>
                    <Tooltip title="Show requests in Details">
                      <Chip size="small" variant="outlined" label={`${row.method} ${shortEndpoint(row.route)}`} />
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right">{row.calls}</TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color={row.failures > 0 ? "error.main" : "text.secondary"}>
                      {row.failures}
                      {row.failures > 0 ? ` (${row.failureRate}%)` : ""}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>{formatMs(row.avgMs)}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>{formatMs(row.p95Ms)}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>{formatMs(row.maxMs)}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>{formatMs(row.avgUploadMs)}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>{formatMs(row.avgServerMs)}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                    {row.avgDbMs != null ? `${formatMs(row.avgDbMs)} / ${row.avgQueries}q` : "-"}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{dayjs(row.lastAt).format("DD/MM HH:mm")}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography variant="caption" color="text.secondary" display="block" mt={1}>
        Failure = HTTP status 400 or higher, or the API returned IsSuccess false. Times include the client upload.
      </Typography>
    </Box>
  );
};

const ApiTimingLogs = () => {
  const [tab, setTab] = useState<"summary" | "details">("summary");
  const [endpoint, setEndpoint] = useState("all");
  const [range, setRange] = useState<DateRange>(() => ({
    from: dayjs().subtract(6, "day").startOf("day").toDate(),
    to: dayjs().endOf("day").toDate(),
  }));
  const [payrollCycle, setPayrollCycle] = useState<string>("");

  // Same picker and payroll-cycle presets as the Bookkeeper screen.
  useEffect(() => {
    (async () => {
      try {
        const response = await api.get("/setting/get-payroll-settings");
        setPayrollCycle(response.data?.IsSuccess ? response.data.data?.payroll_cycle || "" : "");
      } catch {
        setPayrollCycle("");
      }
    })();
  }, []);

  const handleRangeChange = (value: DateRange) => {
    if (value.from && value.to) setRange(value);
  };

  return (
    <Box p={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2} flexWrap="wrap" mb={1}>
        <Typography variant="h5">API timing</Typography>
        <DateRangePickerBox
          from={range.from}
          to={range.to}
          onChange={handleRangeChange}
          payrollCycle={payrollCycle}
        />
      </Stack>
      <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}>
        <Tab value="summary" label="Summary" />
        <Tab value="details" label="Details" />
      </Tabs>
      {tab === "summary" ? (
        <SummaryTab
          range={range}
          onOpenRoute={(route) => {
            setEndpoint(route);
            setTab("details");
          }}
        />
      ) : (
        <DetailsTab endpoint={endpoint} setEndpoint={setEndpoint} range={range} />
      )}
    </Box>
  );
};

export default ApiTimingLogs;

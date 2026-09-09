"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Link,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  IconBriefcase,
  IconCalendarEvent,
  IconCircleCheck,
  IconClock,
  IconFilter,
  IconInfoCircle,
  IconLogin,
  IconUsers,
  IconUsersGroup,
  IconX,
} from "@tabler/icons-react";
import { ApexOptions } from "apexcharts";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import api from "@/utils/axios";
import DateRangePickerBox from "@/app/components/common/DateRangePickerBox";
import { useProjectDetailFilters } from "./ProjectDetailFiltersContext";
import GanttOverview from "./GanttOverview";
import OverviewRecordsDrawer, {
  AddressActivityTable,
  AddressRow,
  CaseStatusItem,
  LabourTeamRow,
  LabourTeamTable,
  LabourTotals,
  MonthlyFinancialTable,
  MonthlyRow,
  MonthlyTotals,
  OVERVIEW_PREVIEW_LIMIT,
  OverviewDrawerTab,
  CASE_STATUS_COLORS,
  FINANCIAL_TYPE_COLORS,
  OVERVIEW_COLORS,
  money,
  overviewTableSx,
  totalMoneyCellSx,
  totalRowSx,
} from "./OverviewRecordsDrawer";

dayjs.extend(customParseFormat);

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

type OverviewData = {
  currency?: string;
  project?: {
    id: number;
    name: string;
    start_date?: string | null;
    last_action?: string | null;
  };
  teams?: { id: number; name: string }[];
  kpis?: Record<string, { value: number; today_delta: number }>;
  financial_summary?: {
    rows: {
      type: string;
      approved: number;
      to_approve: number;
      total: number;
      percent: number;
      color: string;
    }[];
    total_approved: number;
    total_to_approve: number;
    chart_total: number;
  };
  on_site_by_address?: AddressRow[];
  labour_teams?: LabourTeamRow[];
  labour_totals?: LabourTotals;
  labour_risk?: {
    percent: number;
    high: number;
    medium: number;
    low: number;
    high_percent?: number;
    medium_percent?: number;
    low_percent?: number;
  };
  case_status?: {
    total: number;
    items: CaseStatusItem[];
  };
  monthly_financial?: MonthlyRow[];
  monthly_totals?: MonthlyTotals;
  gantt?: {
    id: number;
    name: string;
    start: string;
    end: string;
    progress: number;
    status: string;
  }[];
};

const KPI_META = [
  {
    key: "on_site",
    label: "On site",
    icon: IconUsers,
    bg: "#E8F1FF",
    color: OVERVIEW_COLORS.pricework,
  },
  {
    key: "teams",
    label: "Teams",
    icon: IconUsersGroup,
    bg: "#F1ECFF",
    color: OVERVIEW_COLORS.expenses,
  },
  {
    key: "case_open",
    label: "Case open",
    icon: IconBriefcase,
    bg: "#FFF8E8",
    color: OVERVIEW_COLORS.onHold,
  },
  {
    key: "case_close",
    label: "Case close",
    icon: IconCircleCheck,
    bg: "#E8F8F0",
    color: OVERVIEW_COLORS.closed,
  },
  {
    key: "check_in",
    label: "Check in",
    icon: IconLogin,
    bg: "#EEF2FF",
    color: OVERVIEW_COLORS.pricework,
  },
];

const compactMoney = (currency: string, value: number) => {
  const amount = Number(value || 0);
  if (Math.abs(amount) >= 1_000_000) {
    return `${currency}${(amount / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(amount) >= 10_000) {
    return `${currency}${(amount / 1_000).toFixed(1)}k`;
  }
  return money(currency, amount);
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const parsed = dayjs(value, ["DD/MM/YYYY", "YYYY-MM-DD", "DD-MM-YYYY"], true);
  if (parsed.isValid()) return parsed.format("DD/MM/YYYY");
  const fallback = dayjs(value);
  return fallback.isValid() ? fallback.format("DD/MM/YYYY") : String(value);
};

const Widget = ({
  title,
  children,
  action,
  sx,
}: {
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  sx?: object;
}) => (
  <Paper
    elevation={0}
    sx={{
      p: { xs: 1.5, md: 2 },
      minWidth: 0,
      width: "100%",
      border: "1px solid",
      borderColor: "divider",
      borderRadius: 2,
      bgcolor: "background.paper",
      overflow: "visible",
      position: "relative",
      "&:hover": { zIndex: 3 },
      ...sx,
    }}
  >
    {(title || action) && (
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        gap={1}
        flexWrap="wrap"
        mb={1.5}
      >
        {title ? (
          <Typography fontWeight={700} fontSize={13} letterSpacing={0.4}>
            {title}
          </Typography>
        ) : (
          <span />
        )}
        {action}
      </Stack>
    )}
    {children}
  </Paper>
);

const ViewAllLink = ({
  label,
  count,
  onClick,
}: {
  label: string;
  count: number;
  onClick: () => void;
}) => (
  <Link
    component="button"
    underline="hover"
    fontSize={12}
    fontWeight={600}
    onClick={onClick}
    sx={{
      whiteSpace: "nowrap",
      color: OVERVIEW_COLORS.pricework,
      fontSize: 13,
    }}
  >
    {count > OVERVIEW_PREVIEW_LIMIT ? `${label} (${count})` : label}
    {" →"}
  </Link>
);

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const chartBoxSx = {
  overflow: "visible",
  "& .apexcharts-inner, & .apexcharts-canvas, & .apexcharts-svg": {
    overflow: "visible !important",
  },
  "& .apexcharts-tooltip": {
    zIndex: 2000,
    overflow: "visible",
    whiteSpace: "nowrap",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)",
    border: "1px solid #E2E8F0",
    borderRadius: "8px",
  },
  "& .overview-chart-tooltip": {
    padding: "8px 10px",
    minWidth: 148,
  },
  "& .overview-chart-tooltip__row": {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginBottom: "4px",
    fontSize: 12,
  },
  "& .overview-chart-tooltip__dot": {
    width: 8,
    height: 8,
    borderRadius: "50%",
    flexShrink: 0,
  },
  "& .overview-chart-tooltip__value": {
    fontSize: 12,
    fontWeight: 700,
    color: "#0F172A",
  },
};

const donutTooltip = (
  formatValue: (value: number) => string,
): ApexOptions["tooltip"] => ({
  enabled: true,
  fillSeriesColor: false,
  followCursor: true,
  theme: "light",
  style: { fontSize: "12px" },
  custom({ series, seriesIndex, w }) {
    const label = String(w?.globals?.labels?.[seriesIndex] ?? "");
    const color = String(w?.globals?.colors?.[seriesIndex] ?? "#3B82F6");
    const value = Number(series?.[seriesIndex] ?? 0);
    const total = (series || []).reduce(
      (sum: number, item: number) => sum + Number(item || 0),
      0,
    );
    const percent = total ? ((value / total) * 100).toFixed(1) : "0.0";
    return `<div style="padding:8px 10px;min-width:148px;">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;font-size:12px;">
        <span style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0;"></span>
        <strong>${escapeHtml(label)}</strong>
      </div>
      <div style="font-size:12px;font-weight:700;color:#0F172A;">${percent}% · ${escapeHtml(
        formatValue(value),
      )}</div>
    </div>`;
  },
});

const ChartLegendPanel = ({ children }: { children: React.ReactNode }) => (
  <Box
    sx={{
      display: "flex",
      flexDirection: { xs: "column", sm: "row" },
      alignItems: { xs: "center", sm: "center" },
      gap: { xs: 1, sm: 1.5 },
      minWidth: 0,
      overflow: "visible",
    }}
  >
    {children}
  </Box>
);

const DateMetaCard = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) => (
  <Box
    sx={{
      p: 1.25,
      borderRadius: 1.5,
      bgcolor: "#F8FAFC",
      border: "1px solid",
      borderColor: "divider",
      minWidth: 0,
    }}
  >
    <Stack direction="row" spacing={0.75} alignItems="center" mb={0.5}>
      <Box color="text.secondary" display="flex">
        {icon}
      </Box>
      <Typography fontSize={11} color="text.secondary" noWrap>
        {label}
      </Typography>
    </Stack>
    <Typography fontSize={13} fontWeight={700}>
      {value}
    </Typography>
  </Box>
);

const Overview = ({
  projectId,
  onProjectName,
}: {
  projectId: number;
  onProjectName?: (name: string) => void;
  onNavigateTab?: (tab: string) => void;
}) => {
  const { data: session } = useSession();
  const user = session?.user as User & { company_id?: number | null };
  const sharedFilters = useProjectDetailFilters();
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<OverviewData | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [tempTeamId, setTempTeamId] = useState<string | number>("");
  const [tempTradeId, setTempTradeId] = useState<string | number>("");
  const [filterTeams, setFilterTeams] = useState<any[]>([]);
  const [filterTrades, setFilterTrades] = useState<any[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<OverviewDrawerTab>("addresses");
  const [labourPeriod, setLabourPeriod] = useState("all");

  const startDate = sharedFilters?.startDate ?? null;
  const endDate = sharedFilters?.endDate ?? null;
  const teamId = sharedFilters?.teamId ? String(sharedFilters.teamId) : "all";
  const tradeId = sharedFilters?.tradeId ?? "";

  const openDrawer = (tab: OverviewDrawerTab) => {
    setDrawerTab(tab);
    setDrawerOpen(true);
  };

  const applyLabourPeriod = (value: string) => {
    setLabourPeriod(value);
    if (value === "all") {
      sharedFilters?.setDateRange(null, null);
      return;
    }
    const days = value === "7" ? 6 : 29;
    sharedFilters?.setDateRange(
      dayjs().subtract(days, "day").startOf("day").toDate(),
      new Date(),
    );
  };

  const fetchOverview = async () => {
    if (!projectId || !user?.company_id) return;
    if (sharedFilters && !sharedFilters.hydrated) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        project_id: String(projectId),
        company_id: String(user.company_id),
      });
      if (startDate && endDate) {
        params.set("start_date", dayjs(startDate).format("DD/MM/YYYY"));
        params.set("end_date", dayjs(endDate).format("DD/MM/YYYY"));
      }
      if (teamId !== "all") params.set("team_id", teamId);
      if (tradeId) params.set("trade_id", String(tradeId));
      const res = await api.get(`project-analytics/web-overview?${params}`);
      if (res.data?.IsSuccess) {
        setInfo(res.data.info);
        if (res.data.info?.project?.name) {
          onProjectName?.(res.data.info.project.name);
        }
      }
    } catch (error) {
      console.error("Failed to load project overview", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    projectId,
    user?.company_id,
    teamId,
    tradeId,
    startDate,
    endDate,
    sharedFilters?.hydrated,
  ]);

  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const res = await api.get("expense/list-filters");
        const info = res.data?.info || {};
        setFilterTeams(info.teams || []);
        setFilterTrades(info.trades || []);
      } catch (error) {
        console.error("Failed to load overview filter options", error);
      }
    };
    loadFilterOptions();
  }, []);

  const openFilters = () => {
    setTempTeamId(sharedFilters?.teamId || "");
    setTempTradeId(sharedFilters?.tradeId || "");
    setFilterOpen(true);
  };

  const applyOverviewFilters = () => {
    sharedFilters?.applyFilters({
      team_id: tempTeamId || "",
      trade_id: tempTradeId || "",
    });
    setFilterOpen(false);
  };

  const clearOverviewFilters = () => {
    setTempTeamId("");
    setTempTradeId("");
    sharedFilters?.clearSharedFilters();
    setLabourPeriod("all");
    setFilterOpen(false);
  };

  const hasActiveOverviewFilters = Boolean(
    startDate || endDate || (teamId && teamId !== "all") || tradeId,
  );

  const handleClearOverviewToolbarFilters = (
    event: React.MouseEvent,
  ) => {
    event.stopPropagation();
    setTempTeamId("");
    setTempTradeId("");
    sharedFilters?.clearSharedFilters();
    setLabourPeriod("all");
  };

  const currency = info?.currency || "£";
  const addresses = info?.on_site_by_address || [];
  const labourTeams = info?.labour_teams || [];
  const monthlyRows = info?.monthly_financial || [];
  const ganttItems = info?.gantt || [];
  const financialRows = (info?.financial_summary?.rows || []).map((row) => ({
    ...row,
    color: FINANCIAL_TYPE_COLORS[row.type] || row.color,
  }));
  const caseItems = (info?.case_status?.items || []).map((row) => ({
    ...row,
    color: CASE_STATUS_COLORS[row.status] || row.color,
  }));
  const riskRows = [
    {
      label: "High Risk",
      value: info?.labour_risk?.high || 0,
      percent: info?.labour_risk?.high_percent,
      color: OVERVIEW_COLORS.highRisk,
    },
    {
      label: "Medium Risk",
      value: info?.labour_risk?.medium || 0,
      percent: info?.labour_risk?.medium_percent,
      color: OVERVIEW_COLORS.mediumRisk,
    },
    {
      label: "Low Risk",
      value: info?.labour_risk?.low || 0,
      percent: info?.labour_risk?.low_percent,
      color: OVERVIEW_COLORS.lowRisk,
    },
  ];
  const riskSeries = riskRows.map((row) => row.value);
  const hasRiskSlices = riskSeries.some((value) => value > 0);

  const donutOptions: ApexOptions = useMemo(
    () => ({
      chart: {
        type: "donut",
        fontFamily: "inherit",
        toolbar: { show: false },
      },
      labels: financialRows.map((row) => row.type),
      colors: financialRows.map((row) => row.color),
      legend: { show: false },
      dataLabels: { enabled: false },
      stroke: { width: 2, colors: ["#fff"] },
      tooltip: donutTooltip((value) => money(currency, value)),
      plotOptions: {
        pie: {
          donut: {
            size: "72%",
            labels: {
              show: true,
              name: { show: true, fontSize: "12px", color: "#64748B" },
              value: { show: false },
              total: {
                show: true,
                label: "Total",
                fontSize: "12px",
                fontWeight: 600,
                color: "#64748B",
                formatter: () =>
                  compactMoney(
                    currency,
                    info?.financial_summary?.chart_total || 0,
                  ),
              },
            },
          },
        },
      },
    }),
    [financialRows, info, currency],
  );

  const riskOptions: ApexOptions = useMemo(
    () => ({
      chart: {
        type: "donut",
        fontFamily: "inherit",
        toolbar: { show: false },
      },
      labels: hasRiskSlices ? riskRows.map((row) => row.label) : ["No data"],
      colors: hasRiskSlices ? riskRows.map((row) => row.color) : ["#E2E8F0"],
      legend: { show: false },
      dataLabels: { enabled: false },
      stroke: { width: 2, colors: ["#fff"] },
      tooltip: hasRiskSlices
        ? donutTooltip((value) => `${value} teams`)
        : { enabled: false },
      plotOptions: {
        pie: {
          donut: {
            size: "72%",
            labels: {
              show: true,
              name: { show: true, fontSize: "12px", color: "#64748B" },
              value: { show: false },
              total: {
                show: true,
                label: "Risk",
                fontSize: "12px",
                fontWeight: 600,
                color: "#64748B",
                formatter: () => `${info?.labour_risk?.percent || 0}%`,
              },
            },
          },
        },
      },
    }),
    [hasRiskSlices, info?.labour_risk?.percent, riskRows],
  );

  const caseOptions: ApexOptions = useMemo(
    () => ({
      chart: {
        type: "donut",
        fontFamily: "inherit",
        toolbar: { show: false },
      },
      labels: caseItems.map((row) => row.status),
      colors: caseItems.map((row) => row.color),
      legend: { show: false },
      dataLabels: { enabled: false },
      stroke: { width: 2, colors: ["#fff"] },
      tooltip: donutTooltip((value) => `${value} cases`),
      plotOptions: {
        pie: {
          donut: {
            size: "72%",
            labels: {
              show: true,
              name: { show: true, fontSize: "12px", color: "#64748B" },
              value: { show: false },
              total: {
                show: true,
                label: "Total Cases",
                fontSize: "12px",
                fontWeight: 600,
                color: "#64748B",
                formatter: () => String(info?.case_status?.total || 0),
              },
            },
          },
        },
      },
    }),
    [caseItems, info?.case_status?.total],
  );

  const monthlyTotals = useMemo(() => {
    if (info?.monthly_totals) return info.monthly_totals;
    return (info?.monthly_financial || []).reduce(
      (acc, row) => ({
        pricework: acc.pricework + Number(row.pricework || 0),
        expenses: acc.expenses + Number(row.expenses || 0),
        internal_order: acc.internal_order + Number(row.internal_order || 0),
        direct_labour: acc.direct_labour + Number(row.direct_labour || 0),
        summary: acc.summary + Number(row.summary || 0),
        payment: acc.payment + Number(row.payment || 0),
        profit: acc.profit + Number(row.profit || 0),
      }),
      {
        pricework: 0,
        expenses: 0,
        internal_order: 0,
        direct_labour: 0,
        summary: 0,
        payment: 0,
        profit: 0,
      },
    );
  }, [info]);

  if (loading && !info) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: { xs: 1.5, md: 2 },
        bgcolor: "#F4F7FB",
        minWidth: 0,
        overflow: "visible",
        "& .apexcharts-tooltip": {
          zIndex: 2000,
          overflow: "visible !important",
          whiteSpace: "nowrap",
        },
        "& .apexcharts-inner, & .apexcharts-canvas, & .apexcharts-svg": {
          overflow: "visible !important",
        },
      }}
    >
      <Box
        sx={{
          display: "grid",
          gap: 1.5,
          mb: { xs: 1.5, md: 2 },
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            md: "repeat(3, minmax(0, 1fr))",
            lg: "repeat(5, minmax(0, 1fr))",
          },
        }}
      >
        {KPI_META.map((kpi) => {
          const item = info?.kpis?.[kpi.key];
          const Icon = kpi.icon;
          const delta = item?.today_delta ?? 0;
          const deltaIsBad = kpi.key === "case_open" ? delta > 0 : delta < 0;
          return (
            <Paper
              key={kpi.key}
              elevation={0}
              sx={{
                p: { xs: 1.5, md: 1.75 },
                minWidth: 0,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                bgcolor: "background.paper",
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    flexShrink: 0,
                    borderRadius: "50%",
                    bgcolor: kpi.bg,
                    color: kpi.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon size={20} />
                </Box>
                <Box minWidth={0}>
                  <Typography color="text.secondary" fontSize={13} noWrap>
                    {kpi.label}
                  </Typography>
                  <Typography
                    fontSize={{ xs: 22, md: 26 }}
                    fontWeight={800}
                    lineHeight={1.15}
                  >
                    {item?.value ?? 0}
                  </Typography>
                  <Typography
                    color={
                      delta === 0
                        ? "text.secondary"
                        : deltaIsBad
                          ? "error.main"
                          : "success.main"
                    }
                    fontSize={12}
                    fontWeight={600}
                  >
                    {delta >= 0 ? "+" : ""}
                    {delta} today
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          );
        })}
      </Box>

      <Box
        sx={{
          display: "grid",
          gap: { xs: 1.5, md: 2 },
          alignItems: "start",
          gridTemplateColumns: {
            xs: "1fr",
            lg: "minmax(0, 1.7fr) minmax(280px, 0.85fr)",
          },
        }}
      >
        <Stack spacing={{ xs: 1.5, md: 2 }} minWidth={0}>
          <Widget title="FINANCIAL SUMMARY">
            <Box
              sx={{
                display: "grid",
                gap: 2,
                alignItems: "center",
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "minmax(0, 1.2fr) minmax(200px, 0.9fr)",
                  xl: "minmax(0, 1.15fr) minmax(200px, 240px) minmax(180px, 240px)",
                },
              }}
            >
              <TableContainer sx={{ overflowX: "auto" }}>
                <Table size="small" sx={{ ...overviewTableSx, minWidth: 320 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>TYPE</TableCell>
                      <TableCell align="right">APPROVED</TableCell>
                      <TableCell align="right">TO APPROVE</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {financialRows.map((row) => (
                      <TableRow key={row.type}>
                        <TableCell>
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            <Box
                              width={8}
                              height={8}
                              flexShrink={0}
                              borderRadius="50%"
                              bgcolor={row.color}
                            />
                            <Typography fontSize={13}>{row.type}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell align="right">
                          {money(currency, row.approved)}
                        </TableCell>
                        <TableCell align="right">
                          {money(currency, row.to_approve)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {financialRows.length > 0 && (
                      <TableRow sx={totalRowSx}>
                        <TableCell>TOTAL</TableCell>
                        <TableCell align="right" sx={totalMoneyCellSx}>
                          {money(
                            currency,
                            info?.financial_summary?.total_approved || 0,
                          )}
                        </TableCell>
                        <TableCell align="right" sx={totalMoneyCellSx}>
                          {money(
                            currency,
                            info?.financial_summary?.total_to_approve || 0,
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                    {financialRows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3}>No financial data</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <Box minWidth={0} sx={chartBoxSx}>
                {financialRows.length > 0 && (
                  <Chart
                    options={donutOptions}
                    series={financialRows.map((row) => row.total)}
                    type="donut"
                    width="100%"
                    height={220}
                  />
                )}
                <Stack
                  spacing={0.5}
                  mt={0.5}
                  sx={{ display: { xs: "flex", xl: "none" } }}
                >
                  {financialRows.map((row) => (
                    <Stack
                      key={row.type}
                      direction="row"
                      justifyContent="space-between"
                      gap={1}
                    >
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        minWidth={0}
                      >
                        <Box
                          width={8}
                          height={8}
                          flexShrink={0}
                          borderRadius="50%"
                          bgcolor={row.color}
                        />
                        <Typography fontSize={12} noWrap>
                          {row.type}
                        </Typography>
                      </Stack>
                      <Typography fontSize={12} whiteSpace="nowrap">
                        {row.percent}% · {money(currency, row.total)}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>
              <Stack
                spacing={0.75}
                sx={{ display: { xs: "none", xl: "flex" } }}
              >
                {financialRows.map((row) => (
                  <Stack
                    key={row.type}
                    direction="row"
                    justifyContent="space-between"
                    gap={1}
                  >
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      minWidth={0}
                    >
                      <Box
                        width={8}
                        height={8}
                        flexShrink={0}
                        borderRadius="50%"
                        bgcolor={row.color}
                      />
                      <Typography fontSize={12} noWrap>
                        {row.type}
                      </Typography>
                    </Stack>
                    <Typography fontSize={12} whiteSpace="nowrap">
                      {row.percent}% · {money(currency, row.total)}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
          </Widget>

          <Widget
            title="DIRECT LABOUR TEAM SUMMARY"
            action={
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                flexWrap="wrap"
                useFlexGap
              >
                <TextField
                  select
                  size="small"
                  value={teamId}
                  onChange={(e) =>
                    sharedFilters?.applyFilters({
                      team_id: e.target.value === "all" ? "" : e.target.value,
                    })
                  }
                  sx={{ minWidth: { xs: 120, sm: 140 } }}
                >
                  <MenuItem value="all">All Teams</MenuItem>
                  {(info?.teams || []).map((team) => (
                    <MenuItem key={team.id} value={String(team.id)}>
                      {team.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  size="small"
                  value={labourPeriod}
                  onChange={(e) => applyLabourPeriod(e.target.value)}
                  sx={{ minWidth: { xs: 120, sm: 140 } }}
                >
                  <MenuItem value="all">All dates</MenuItem>
                  <MenuItem value="7">Last 7 days</MenuItem>
                  <MenuItem value="30">Last 30 days</MenuItem>
                </TextField>
                {/* <Box display="flex" justifyContent="flex-end"> */}
                <ViewAllLink
                  label="View all"
                  count={labourTeams.length}
                  onClick={() => openDrawer("labour")}
                />
                {/* </Box> */}
              </Stack>
            }
          >
            <LabourTeamTable
              rows={labourTeams}
              totals={info?.labour_totals}
              limit={OVERVIEW_PREVIEW_LIMIT}
            />
          </Widget>

          <Widget
            title="MONTHLY FINANCIAL SUMMARY"
            action={
              // <Typography fontSize={13} color="text.secondary">
              //   {currency}
              // </Typography>
              <Box display="flex" justifyContent="flex-end">
                <ViewAllLink
                  label="View all"
                  count={monthlyRows.length}
                  onClick={() => openDrawer("monthly")}
                />
              </Box>
            }
          >
            <MonthlyFinancialTable
              rows={monthlyRows}
              totals={monthlyTotals}
              currency={currency}
              limit={OVERVIEW_PREVIEW_LIMIT}
            />
          </Widget>

          <Widget
            title="PROJECT GANTT OVERVIEW"
            action={
              <Box display="flex" justifyContent="flex-end">
                <ViewAllLink
                  label="View all"
                  count={ganttItems.length}
                  onClick={() => openDrawer("cases")}
                />
              </Box>
            }
          >
            <GanttOverview
              items={ganttItems.slice(0, OVERVIEW_PREVIEW_LIMIT)}
            />
          </Widget>
        </Stack>

        <Stack spacing={{ xs: 1.5, md: 2 }} minWidth={0}>
          <Widget>
            <Stack spacing={1.5}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <Box flex={1} minWidth={0}>
                  <DateRangePickerBox
                    from={startDate}
                    to={endDate}
                    onChange={({ from, to }) => {
                      sharedFilters?.setDateRange(from, to);
                      setLabourPeriod("all");
                    }}
                    buttonMinWidth="100%"
                    buttonLabelAlign="left"
                  />
                </Box>
                <Button
                  variant="outlined"
                  startIcon={<IconFilter size={16} />}
                  onClick={openFilters}
                  sx={{ whiteSpace: "nowrap", minHeight: 40 }}
                >
                  Filters
                </Button>
                {hasActiveOverviewFilters && (
                  <Button
                    color="error"
                    variant="outlined"
                    onClick={handleClearOverviewToolbarFilters}
                    sx={{
                      whiteSpace: "nowrap",
                      minHeight: 40,
                      minWidth: 40,
                      px: 1.5,
                    }}
                    aria-label="Clear filters"
                  >
                    <IconX size={18} />
                  </Button>
                )}
              </Stack>
              <Box
                sx={{
                  display: "grid",
                  gap: 1,
                  gridTemplateColumns: "1fr 1fr",
                }}
              >
                <DateMetaCard
                  icon={<IconCalendarEvent size={15} />}
                  label="Project Start"
                  value={formatDate(info?.project?.start_date)}
                />
                <DateMetaCard
                  icon={<IconClock size={15} />}
                  label="Last action"
                  value={formatDate(info?.project?.last_action)}
                />
              </Box>
            </Stack>
          </Widget>

          <Widget
            title="ON SITE BY ADDRESS"
            action={
              <Box display="flex" justifyContent="flex-end">
                <ViewAllLink
                  label="View all addresses"
                  count={addresses.length}
                  onClick={() => openDrawer("addresses")}
                />
              </Box>
            }
          >
            <AddressActivityTable
              rows={addresses}
              limit={OVERVIEW_PREVIEW_LIMIT}
            />
          </Widget>

          <Widget title="LABOUR RISK">
            <ChartLegendPanel>
              <Box
                sx={{
                  width: { xs: "100%", sm: 160 },
                  maxWidth: 200,
                  mx: { xs: "auto", sm: 0 },
                  flexShrink: 0,
                  ...chartBoxSx,
                }}
              >
                <Chart
                  options={riskOptions}
                  series={hasRiskSlices ? riskSeries : [1]}
                  type="donut"
                  width="100%"
                  height={150}
                />
              </Box>
              <Stack spacing={0.75} flex={1} minWidth={0} width="100%">
                {riskRows.map((row) => (
                  <Stack
                    key={row.label}
                    direction="row"
                    justifyContent="space-between"
                    gap={1}
                  >
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      minWidth={0}
                    >
                      <Box
                        width={8}
                        height={8}
                        flexShrink={0}
                        borderRadius="50%"
                        bgcolor={row.color}
                      />
                      <Typography fontSize={12} noWrap>
                        {row.label}
                      </Typography>
                    </Stack>
                    <Typography
                      fontSize={12}
                      fontWeight={700}
                      whiteSpace="nowrap"
                    >
                      {row.value ?? 0}
                      {row.percent != null ? ` / ${row.percent}%` : ""}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </ChartLegendPanel>
          </Widget>

          <Widget
            title="CASE STATUS"
            action={
              <Box display="flex" justifyContent="flex-end">
                <ViewAllLink
                  label="View all cases"
                  count={ganttItems.length || info?.case_status?.total || 0}
                  onClick={() => openDrawer("cases")}
                />
              </Box>
            }
          >
            {caseItems.length === 0 ? (
              <Typography fontSize={13} color="text.secondary" py={2}>
                No related case records
              </Typography>
            ) : (
              <ChartLegendPanel>
                <Box
                  sx={{
                    width: { xs: "100%", sm: 160 },
                    maxWidth: 200,
                    mx: { xs: "auto", sm: 0 },
                    flexShrink: 0,
                    ...chartBoxSx,
                  }}
                >
                  <Chart
                    options={caseOptions}
                    series={caseItems.map((row) => row.count)}
                    type="donut"
                    width="100%"
                    height={150}
                  />
                </Box>
                <Stack spacing={0.75} flex={1} minWidth={0} width="100%">
                  {caseItems.map((row) => (
                    <Stack
                      key={row.status}
                      direction="row"
                      justifyContent="space-between"
                      gap={1}
                    >
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        minWidth={0}
                      >
                        <Box
                          width={8}
                          height={8}
                          flexShrink={0}
                          borderRadius="50%"
                          bgcolor={row.color}
                        />
                        <Typography fontSize={12} noWrap>
                          {row.status}
                        </Typography>
                      </Stack>
                      <Typography fontSize={12} whiteSpace="nowrap">
                        {row.count} / {row.percent}%
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </ChartLegendPanel>
            )}
          </Widget>
        </Stack>
      </Box>

      <OverviewRecordsDrawer
        open={drawerOpen}
        tab={drawerTab}
        onTabChange={setDrawerTab}
        onClose={() => setDrawerOpen(false)}
        currency={currency}
        addresses={addresses}
        labourTeams={labourTeams}
        labourTotals={info?.labour_totals}
        monthlyRows={monthlyRows}
        monthlyTotals={monthlyTotals}
        gantt={ganttItems}
        caseStatus={
          info?.case_status
            ? { ...info.case_status, items: caseItems }
            : info?.case_status
        }
      />

      <Dialog
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ m: 0, position: "relative" }}>
          Filters
          <IconButton
            aria-label="close"
            onClick={() => setFilterOpen(false)}
            sx={{ position: "absolute", right: 12, top: 8 }}
          >
            <IconX size={24} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <Autocomplete
              options={filterTeams}
              getOptionLabel={(option) =>
                option.title || option.name || ""
              }
              getOptionKey={(option) => String(option.id)}
              isOptionEqualToValue={(option, value) =>
                String(option.id) === String(value?.id)
              }
              value={
                filterTeams.find(
                  (t) => String(t.id) === String(tempTeamId),
                ) || null
              }
              onChange={(_, value) =>
                setTempTeamId(value ? value.id : "")
              }
              renderInput={(params) => (
                <TextField {...params} label="Team" fullWidth />
              )}
            />
            <Autocomplete
              options={filterTrades}
              getOptionLabel={(option) => option.name || ""}
              getOptionKey={(option) => String(option.id)}
              isOptionEqualToValue={(option, value) =>
                String(option.id) === String(value?.id)
              }
              value={
                filterTrades.find(
                  (t) => String(t.id) === String(tempTradeId),
                ) || null
              }
              onChange={(_, value) =>
                setTempTradeId(value ? value.id : "")
              }
              renderInput={(params) => (
                <TextField {...params} label="Trade" fullWidth />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="inherit" onClick={clearOverviewFilters}>
            Clear
          </Button>
          <Button variant="contained" onClick={applyOverviewFilters}>
            Apply
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Overview;

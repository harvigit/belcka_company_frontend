"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Drawer,
  IconButton,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  Typography,
} from "@mui/material";
import { IconArrowLeft, IconX } from "@tabler/icons-react";
import GanttOverview, { GanttItem } from "./GanttOverview";

export const OVERVIEW_PREVIEW_LIMIT = 2;

export type OverviewDrawerTab = "addresses" | "labour" | "monthly" | "cases";

export type AddressRow = {
  address_id?: number;
  address: string;
  trade_count: number;
  check_in: number;
};

export type LabourTeamRow = {
  team_id: number;
  team: string;
  on_site: number;
  limit: number;
  avg_7_days: number;
  avg_30_days: number;
  total_hours: number;
  check_in: number;
  check_in_hours: number;
  unallocated_hours: number;
  risk: number;
};

export type LabourTotals = {
  on_site?: number;
  limit?: number;
  avg_7_days?: number;
  avg_30_days?: number;
  total_hours?: number;
  check_in?: number;
  check_in_hours?: number;
  unallocated_hours?: number;
  risk?: number;
};

export type MonthlyRow = {
  month_key: string;
  month?: string;
  month_label?: string;
  pricework: number;
  expenses: number;
  internal_order: number;
  direct_labour: number;
  summary: number;
  payment: number;
  profit: number;
};

export type MonthlyTotals = {
  pricework: number;
  expenses: number;
  internal_order: number;
  direct_labour: number;
  summary: number;
  payment: number;
  profit: number;
};

export type CaseStatusItem = {
  status: string;
  count: number;
  percent: number;
  color: string;
};

export const OVERVIEW_COLORS = {
  pricework: "#3B82F6",
  expenses: "#7B61FF",
  internalOrder: "#F4C430",
  directLabour: "#22C55E",
  open: "#3B82F6",
  inProgress: "#7B61FF",
  onHold: "#F4C430",
  closed: "#22C55E",
  highRisk: "#EF4444",
  mediumRisk: "#F4C430",
  lowRisk: "#22C55E",
  total: "#3B82F6",
};

export const FINANCIAL_TYPE_COLORS: Record<string, string> = {
  Pricework: OVERVIEW_COLORS.pricework,
  Expenses: OVERVIEW_COLORS.expenses,
  "Internal Order": OVERVIEW_COLORS.internalOrder,
  "Direct Labour": OVERVIEW_COLORS.directLabour,
};

export const CASE_STATUS_COLORS: Record<string, string> = {
  Open: OVERVIEW_COLORS.open,
  "In Progress": OVERVIEW_COLORS.inProgress,
  "On Hold": OVERVIEW_COLORS.onHold,
  Closed: OVERVIEW_COLORS.closed,
};

export const overviewTableSx = {
  "& .MuiTableCell-root": {
    fontSize: 12,
    py: 0.75,
    px: { xs: 1, md: 1.25 },
    whiteSpace: "nowrap",
    borderColor: "#EEF2F7",
  },
  "& .MuiTableCell-head": {
    fontWeight: 700,
    color: "text.secondary",
    fontSize: 11,
    letterSpacing: 0.3,
    bgcolor: "#F8FAFC",
  },
};

export const totalRowSx = {
  "& td": {
    fontWeight: 700,
    borderTop: "2px solid #D9E4F1",
    bgcolor: "#F8FBFF",
  },
};

export const totalMoneyCellSx = {
  fontWeight: 800,
  color: OVERVIEW_COLORS.total,
};

export const money = (currency: string, value: number) =>
  `${currency}${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const EmptyState = ({ message }: { message: string }) => (
  <Box py={6} px={2} textAlign="center">
    <Typography fontSize={14} color="text.secondary">
      {message}
    </Typography>
  </Box>
);

const previewRows = <T,>(rows: T[], limit?: number) =>
  typeof limit === "number" ? rows.slice(0, limit) : rows;

function PagedList<T>({
  rows,
  limit,
  paginate,
  children,
}: {
  rows: T[];
  limit?: number;
  paginate?: boolean;
  children: (visible: T[]) => React.ReactNode;
}) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const source = previewRows(rows, limit);
  const maxPage = Math.max(0, Math.ceil(source.length / rowsPerPage) - 1);
  const currentPage = Math.min(page, maxPage);
  const visible = paginate
    ? source.slice(
        currentPage * rowsPerPage,
        currentPage * rowsPerPage + rowsPerPage,
      )
    : source;

  useEffect(() => {
    setPage(0);
  }, [source.length, rowsPerPage, paginate, limit]);

  return (
    <Box>
      {children(visible)}
      {paginate && source.length > 0 && (
        <TablePagination
          component="div"
          count={source.length}
          page={currentPage}
          onPageChange={(_, next) => setPage(next)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 20, 50]}
          sx={{
            overflow: "visible",
            ".MuiTablePagination-toolbar": {
              flexWrap: "wrap",
              minHeight: 52,
            },
          }}
        />
      )}
    </Box>
  );
}

export const AddressActivityTable = ({
  rows,
  limit,
  paginate,
}: {
  rows: AddressRow[];
  limit?: number;
  paginate?: boolean;
}) => {
  return (
    <PagedList rows={rows} limit={limit} paginate={paginate}>
      {(visible) => (
        <TableContainer sx={{ overflowX: "auto" }}>
          <Table size="small" sx={{ ...overviewTableSx, minWidth: 280 }}>
            <TableHead>
              <TableRow>
                <TableCell>Address</TableCell>
                <TableCell align="right">Trade</TableCell>
                <TableCell align="right">Check in</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visible.map((row, index) => (
                <TableRow key={row.address_id ?? `${row.address}-${index}`}>
                  <TableCell
                    sx={{
                      maxWidth: { xs: 100, md: 200 },
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {row.address}
                  </TableCell>
                  <TableCell align="right">{row.trade_count}</TableCell>
                  <TableCell align="right">{row.check_in}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3}>No address activity</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </PagedList>
  );
};

const LABOUR_COLUMNS = [
  "Team",
  "On site",
  "Limit",
  "Avg 7 days",
  "Avg 30 days",
  "Total Hours",
  "Check in",
  "Check in Hours",
  "Unallocated Hours",
  "Risk",
] as const;

export const LabourTeamTable = ({
  rows,
  totals,
  limit,
  paginate,
}: {
  rows: LabourTeamRow[];
  totals?: LabourTotals | null;
  limit?: number;
  paginate?: boolean;
}) => {
  return (
    <PagedList rows={rows} limit={limit} paginate={paginate}>
      {(visible) => (
        <TableContainer sx={{ overflowX: "auto" }}>
          <Table size="small" sx={{ ...overviewTableSx, minWidth: 820 }}>
            <TableHead>
              <TableRow>
                {LABOUR_COLUMNS.map((label) => (
                  <TableCell
                    key={label}
                    align={label === "Team" ? "left" : "right"}
                  >
                    {label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {visible.map((row) => (
                <TableRow key={row.team_id}>
                  <TableCell>{row.team}</TableCell>
                  <TableCell align="right">{row.on_site}</TableCell>
                  <TableCell align="right">{row.limit}</TableCell>
                  <TableCell align="right">{row.avg_7_days}</TableCell>
                  <TableCell align="right">{row.avg_30_days}</TableCell>
                  <TableCell align="right">{row.total_hours}</TableCell>
                  <TableCell align="right">{row.check_in}</TableCell>
                  <TableCell align="right">{row.check_in_hours}</TableCell>
                  <TableCell align="right">{row.unallocated_hours}</TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      color:
                        row.risk >= 50
                          ? "error.main"
                          : row.risk >= 20
                            ? "warning.main"
                            : "success.main",
                      fontWeight: 700,
                    }}
                  >
                    +{row.risk}%
                  </TableCell>
                </TableRow>
              ))}
              {rows.length > 0 && (
                <TableRow sx={totalRowSx}>
                  <TableCell>TOTAL</TableCell>
                  <TableCell align="right">{totals?.on_site || 0}</TableCell>
                  <TableCell align="right">{totals?.limit || 0}</TableCell>
                  <TableCell align="right">{totals?.avg_7_days || 0}</TableCell>
                  <TableCell align="right">
                    {totals?.avg_30_days || 0}
                  </TableCell>
                  <TableCell align="right">
                    {Number(totals?.total_hours || 0).toFixed(2)}
                  </TableCell>
                  <TableCell align="right">{totals?.check_in || 0}</TableCell>
                  <TableCell align="right">
                    {Number(totals?.check_in_hours || 0).toFixed(2)}
                  </TableCell>
                  <TableCell align="right">
                    {Number(totals?.unallocated_hours || 0).toFixed(2)}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      color:
                        Number(totals?.risk || 0) >= 50
                          ? "error.main"
                          : Number(totals?.risk || 0) >= 20
                            ? "warning.main"
                            : "success.main",
                    }}
                  >
                    +{totals?.risk || 0}%
                  </TableCell>
                </TableRow>
              )}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10}>No labour team data</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </PagedList>
  );
};

const MONTHLY_COLUMNS = [
  "Month",
  "Pricework",
  "Expenses",
  "Internal Order",
  "Direct Labour",
  "Summary",
  "Payment",
  "Profit",
] as const;

const MONTHLY_TOTAL_KEYS = [
  "pricework",
  "expenses",
  "internal_order",
  "direct_labour",
  "summary",
  "payment",
  "profit",
] as const;

export const MonthlyFinancialTable = ({
  rows,
  totals,
  currency,
  limit,
  paginate,
}: {
  rows: MonthlyRow[];
  totals: MonthlyTotals;
  currency: string;
  limit?: number;
  paginate?: boolean;
}) => {
  return (
    <PagedList rows={rows} limit={limit} paginate={paginate}>
      {(visible) => (
        <TableContainer sx={{ overflowX: "auto" }}>
          <Table size="small" sx={{ ...overviewTableSx, minWidth: 720 }}>
            <TableHead>
              <TableRow>
                {MONTHLY_COLUMNS.map((label) => (
                  <TableCell
                    key={label}
                    align={label === "Month" ? "left" : "right"}
                  >
                    {label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {visible.map((row) => (
                <TableRow key={row.month_key}>
                  <TableCell>{row.month_label || row.month}</TableCell>
                  <TableCell align="right">
                    {money(currency, row.pricework)}
                  </TableCell>
                  <TableCell align="right">
                    {money(currency, row.expenses)}
                  </TableCell>
                  <TableCell align="right">
                    {money(currency, row.internal_order)}
                  </TableCell>
                  <TableCell align="right">
                    {money(currency, row.direct_labour)}
                  </TableCell>
                  <TableCell align="right">
                    {money(currency, row.summary)}
                  </TableCell>
                  <TableCell align="right">
                    {money(currency, row.payment)}
                  </TableCell>
                  <TableCell align="right">
                    {money(currency, row.profit)}
                  </TableCell>
                </TableRow>
              ))}
              {rows.length > 0 && (
                <TableRow sx={totalRowSx}>
                  <TableCell>TOTAL</TableCell>
                  {MONTHLY_TOTAL_KEYS.map((key) => (
                    <TableCell
                      key={key}
                      align="right"
                      sx={totalMoneyCellSx}
                    >
                      {money(currency, totals[key] || 0)}
                    </TableCell>
                  ))}
                </TableRow>
              )}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8}>No monthly data</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </PagedList>
  );
};

const DRAWER_TABS: { key: OverviewDrawerTab; label: string }[] = [
  { key: "addresses", label: "Addresses" },
  { key: "labour", label: "Labour" },
  { key: "monthly", label: "Monthly" },
  { key: "cases", label: "Cases" },
];

const OverviewRecordsDrawer = ({
  open,
  tab,
  onTabChange,
  onClose,
  currency,
  addresses,
  labourTeams,
  labourTotals,
  monthlyRows,
  monthlyTotals,
  gantt,
  caseStatus,
}: {
  open: boolean;
  tab: OverviewDrawerTab;
  onTabChange: (tab: OverviewDrawerTab) => void;
  onClose: () => void;
  currency: string;
  addresses: AddressRow[];
  labourTeams: LabourTeamRow[];
  labourTotals?: LabourTotals | null;
  monthlyRows: MonthlyRow[];
  monthlyTotals: MonthlyTotals;
  gantt: GanttItem[];
  caseStatus?: { total: number; items: CaseStatusItem[] } | null;
}) => {
  const counts: Record<OverviewDrawerTab, number> = {
    addresses: addresses.length,
    labour: labourTeams.length,
    monthly: monthlyRows.length,
    cases: gantt.length || caseStatus?.total || 0,
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: "100%", sm: 720, md: 920 },
          maxWidth: "100%",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        px={2}
        py={1.5}
        borderBottom="1px solid"
        borderColor="divider"
      >
        <Box display={"flex"} alignItems={"center"}>
          <IconButton onClick={onClose} size="small">
            <IconArrowLeft size={18} />
          </IconButton>
          <Typography fontWeight={700} fontSize={16}>
            Project records
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <IconX size={18} />
        </IconButton>
      </Stack>

      <Tabs
        value={tab}
        onChange={(_, value: OverviewDrawerTab) => onTabChange(value)}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{
          px: 1,
          borderBottom: "1px solid",
          borderColor: "divider",
          minHeight: 48,
          "& .MuiTab-root": {
            textTransform: "none",
            minHeight: 48,
            fontWeight: 600,
            fontSize: 13,
          },
        }}
      >
        {DRAWER_TABS.map((item) => (
          <Tab
            key={item.key}
            value={item.key}
            label={`${item.label} (${counts[item.key]})`}
          />
        ))}
      </Tabs>

      <Box
        sx={{ flex: 1, minHeight: 0, overflow: "auto", p: { xs: 1.5, md: 2 } }}
      >
        {tab === "addresses" &&
          (addresses.length ? (
            <AddressActivityTable rows={addresses} paginate />
          ) : (
            <EmptyState message="No related address records for this project." />
          ))}

        {tab === "labour" &&
          (labourTeams.length ? (
            <LabourTeamTable
              rows={labourTeams}
              totals={labourTotals}
              paginate
            />
          ) : (
            <EmptyState message="No related labour team records for this project." />
          ))}

        {tab === "monthly" &&
          (monthlyRows.length ? (
            <MonthlyFinancialTable
              rows={monthlyRows}
              totals={monthlyTotals}
              currency={currency}
              paginate
            />
          ) : (
            <EmptyState message="No related monthly financial records for this project." />
          ))}

        {tab === "cases" &&
          (gantt.length || (caseStatus?.total || 0) > 0 ? (
            <Stack spacing={2}>
              {(caseStatus?.items || []).length > 0 && (
                <Stack spacing={0.75}>
                  {(caseStatus?.items || []).map((row) => (
                    <Stack
                      key={row.status}
                      direction="row"
                      justifyContent="space-between"
                      gap={1}
                    >
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box
                          width={8}
                          height={8}
                          borderRadius="50%"
                          bgcolor={
                            CASE_STATUS_COLORS[row.status] || row.color
                          }
                        />
                        <Typography fontSize={13}>{row.status}</Typography>
                      </Stack>
                      <Typography fontSize={13} whiteSpace="nowrap">
                        {row.count} / {row.percent}%
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              )}
              {gantt.length ? (
                <PagedList rows={gantt} paginate>
                  {(visible) => <GanttOverview items={visible} />}
                </PagedList>
              ) : (
                <EmptyState message="No related case timeline for this project." />
              )}
            </Stack>
          ) : (
            <EmptyState message="No related case records for this project." />
          ))}
      </Box>
    </Drawer>
  );
};

export default OverviewRecordsDrawer;

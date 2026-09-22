"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Drawer,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from "@mui/material";
import { IconArrowLeft } from "@tabler/icons-react";

export const OVERVIEW_PREVIEW_LIMIT = 5;

export type OverviewFullListKey = "labour" | "monthly" | "addresses" | "people";

export type AddressRow = {
  address_id?: number;
  address: string;
  trade_count: number;
  check_in: number;
};

export type PeopleRow = {
  user_id?: number;
  user: string;
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
    zIndex: 3,
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

export const EmptyState = ({ message }: { message: string }) => (
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
  const [rowsPerPage, setRowsPerPage] = useState(50);
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
    <Box
      sx={
        paginate
          ? {
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
            }
          : undefined
      }
    >
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
          rowsPerPageOptions={[50, 100, 250, 500]}
          sx={{
            flexShrink: 0,
            borderTop: "1px solid",
            borderColor: "divider",
            overflow: "visible",
            bgcolor: "background.paper",
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
        <TableContainer
          sx={{
            overflowX: "auto",
            ...(paginate && {
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
            }),
          }}
        >
          <Table
            stickyHeader={!!paginate}
            size="small"
            aria-label={paginate ? "sticky table" : undefined}
            sx={{ ...overviewTableSx, minWidth: 280 }}
          >
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

export const PeopleActivityTable = ({
  rows,
  limit,
  paginate,
}: {
  rows: PeopleRow[];
  limit?: number;
  paginate?: boolean;
}) => {
  return (
    <PagedList rows={rows} limit={limit} paginate={paginate}>
      {(visible) => (
        <TableContainer
          sx={{
            overflowX: "auto",
            ...(paginate && {
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
            }),
          }}
        >
          <Table
            stickyHeader={!!paginate}
            size="small"
            aria-label={paginate ? "sticky table" : undefined}
            sx={{ ...overviewTableSx, minWidth: 280 }}
          >
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell align="right">Trade</TableCell>
                <TableCell align="right">Check in</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visible.map((row, index) => (
                <TableRow key={row.user_id ?? `${row.user}-${index}`}>
                  <TableCell
                    sx={{
                      maxWidth: { xs: 100, md: 200 },
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {row.user}
                  </TableCell>
                  <TableCell align="right">{row.trade_count}</TableCell>
                  <TableCell align="right">{row.check_in}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3}>No people on site</TableCell>
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
  // "Limit",
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
        <TableContainer
          sx={{
            overflowX: "auto",
            ...(paginate && {
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
            }),
          }}
        >
          <Table
            stickyHeader={!!paginate}
            size="small"
            aria-label={paginate ? "sticky table" : undefined}
            sx={{ ...overviewTableSx, minWidth: 820 }}
          >
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
                  <TableCell align="right">
                    {row.on_site}
                  </TableCell>
                  {/* <TableCell align="right">{row.limit}</TableCell> */}
                  <TableCell align="right">{row.avg_7_days}</TableCell>
                  <TableCell align="right">{row.avg_30_days}</TableCell>
                  <TableCell align="right">
                    {Math.round(Number(row.total_hours || 0))}
                  </TableCell>
                  <TableCell align="right">
                    {Math.round(Number(row.check_in || 0))}
                  </TableCell>
                  <TableCell align="right">
                    {Math.round(Number(row.check_in_hours || 0))}
                  </TableCell>
                  <TableCell align="right">
                    {Math.round(Number(row.unallocated_hours || 0))}
                  </TableCell>
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
                  <TableCell align="right">
                    {totals?.on_site || 0}
                  </TableCell>
                  {/* <TableCell align="right">{totals?.limit || 0}</TableCell> */}
                  <TableCell align="right">{totals?.avg_7_days || 0}</TableCell>
                  <TableCell align="right">
                    {totals?.avg_30_days || 0}
                  </TableCell>
                  <TableCell align="right">
                    {Math.round(Number(totals?.total_hours || 0))}
                  </TableCell>
                  <TableCell align="right">
                    {Math.round(Number(totals?.check_in || 0))}
                  </TableCell>
                  <TableCell align="right">
                    {Math.round(Number(totals?.check_in_hours || 0))}
                  </TableCell>
                  <TableCell align="right">
                    {Math.round(Number(totals?.unallocated_hours || 0))}
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
        <TableContainer
          sx={{
            overflowX: "auto",
            ...(paginate && {
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
            }),
          }}
        >
          <Table
            stickyHeader={!!paginate}
            size="small"
            aria-label={paginate ? "sticky table" : undefined}
            sx={{ ...overviewTableSx, minWidth: 720 }}
          >
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
                    <TableCell key={key} align="right" sx={totalMoneyCellSx}>
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

export const OverviewFullListView = ({
  open,
  title,
  onClose,
  action,
  toolbar,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  action?: React.ReactNode;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <Drawer
    anchor="bottom"
    open={open}
    onClose={onClose}
    ModalProps={{ keepMounted: false }}
    PaperProps={{
      sx: {
        height: "95vh",
        boxShadow: "none",
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      },
    }}
  >
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      gap={1}
      px={2}
      py={1.25}
      borderBottom="1px solid"
      borderColor="divider"
      sx={{ flexShrink: 0 }}
    >
      <Box display="flex" alignItems="center" minWidth={0}>
        <IconButton onClick={onClose} size="small" aria-label="Back">
          <IconArrowLeft size={18} />
        </IconButton>
        <Typography fontWeight={700} fontSize={16} noWrap>
          {title}
        </Typography>
      </Box>
      {action}
    </Stack>
    {toolbar ? (
      <Box
        px={2}
        pt={2}
        pb={1.25}
        borderBottom="1px solid"
        borderColor="divider"
        sx={{ flexShrink: 0, bgcolor: "background.paper", overflow: "visible" }}
      >
        {toolbar}
      </Box>
    ) : null}
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        p: { xs: 1.5, md: 2 },
      }}
    >
      {children}
    </Box>
  </Drawer>
);


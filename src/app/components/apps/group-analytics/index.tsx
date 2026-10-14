'use client';

import React, { Fragment, useEffect, useMemo, useState } from "react";
import {
  Autocomplete,
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  Drawer,
  Grid,
  IconButton,
  InputAdornment,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { IconChevronDown, IconChevronRight, IconInfoCircle, IconSearch, IconX } from "@tabler/icons-react";
import { format } from "date-fns";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import Image from "next/image";
import api from "@/utils/axios";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import DateRangePickerBox from "@/app/components/common/DateRangePickerBox";

interface Amounts {
  net_amount: number;
  gross_amount: number;
  daywork: number;
  pricework: number;
  expense: number;
  adjustment: number;
  paid_leave: number;
}

interface ProjectSpend extends Amounts {
  project_id: number | null;
  project_name: string;
}

interface UserSpend extends Amounts {
  user_id: number;
  user_name: string;
  user_image: string | null;
  projects: ProjectSpend[];
}

interface GroupSpend extends Amounts {
  group_id: number | null;
  group_name: string;
  users_count: number;
  projects: ProjectSpend[];
  users: UserSpend[];
}

interface AnalyticsData {
  currency: string;
  totals: Amounts;
  groups: GroupSpend[];
}

interface GroupOption {
  id: number;
  name: string;
}

interface ProjectOption {
  id: number | null;
  name: string;
}

// Labour amounts are shown net; gross adds CIS on labour (expenses have no CIS).
const amountColumns: { key: keyof Amounts; label: string }[] = [
  { key: "daywork", label: "Daywork" },
  { key: "pricework", label: "Pricework" },
  { key: "paid_leave", label: "Paid leave" },
  { key: "adjustment", label: "Adjustments" },
  { key: "expense", label: "Expenses" },
  { key: "net_amount", label: "Net total" },
  { key: "gross_amount", label: "Gross total" },
];

const emptyAmounts = (): Amounts => ({
  net_amount: 0,
  gross_amount: 0,
  daywork: 0,
  pricework: 0,
  expense: 0,
  adjustment: 0,
  paid_leave: 0,
});

// Sums amounts of rows, rounded to pence like the API does.
const sumAmounts = (rows: Amounts[]): Amounts => {
  const total = emptyAmounts();
  for (const row of rows) {
    for (const key of Object.keys(total) as (keyof Amounts)[]) total[key] += row[key] ?? 0;
  }
  for (const key of Object.keys(total) as (keyof Amounts)[]) {
    total[key] = Math.round(total[key] * 100) / 100;
  }
  return total;
};

const byGross = (a: Amounts, b: Amounts) => b.gross_amount - a.gross_amount;

// embedded: shown inside the Bookkeeper drawer, which already has its own title.
export default function GroupAnalytics({ embedded = false }: { embedded?: boolean }) {
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };

  // No dates = all time.
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [groupOptions, setGroupOptions] = useState<GroupOption[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<GroupOption[]>([]);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number | null>>(new Set());
  // undefined = drawer closed; group_id can itself be null ("Unknown group").
  const [usersGroupId, setUsersGroupId] = useState<number | null | undefined>(undefined);
  const [expandedUsers, setExpandedUsers] = useState<Set<number>>(new Set());
  const [userSearch, setUserSearch] = useState("");
  const [search, setSearch] = useState("");
  const [selectedProjects, setSelectedProjects] = useState<ProjectOption[]>([]);

  const money = (value: number) =>
    `${data?.currency ?? ""}${(value ?? 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  // Table cells show "-" for zero amounts so the real values stand out.
  const cellMoney = (value: number) => (value ? money(value) : "-");

  useEffect(() => {
    if (!user?.company_id) return;
    api
      .get(`user-groups/list?company_id=${user.company_id}`)
      .then((res) => {
        const groups = (res.data?.info ?? []).map((g: any) => ({ id: g.id, name: g.name }));
        setGroupOptions(groups);
      })
      .catch((err) => console.error("Failed to fetch groups", err));
  }, [user?.company_id]);

  useEffect(() => {
    if (!user?.company_id) return;
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ company_id: String(user.company_id) });
        if (startDate) params.set("start_date", format(startDate, "yyyy-MM-dd"));
        if (endDate) params.set("end_date", format(endDate, "yyyy-MM-dd"));
        if (selectedGroups.length) {
          params.set("group_ids", selectedGroups.map((g) => g.id).join(","));
        }
        const res = await api.get(`user-groups/analytics?${params.toString()}`);
        if (res.data?.info) setData(res.data.info);
      } catch (err) {
        console.error("Failed to fetch group analytics", err);
      }
      setLoading(false);
    };
    fetchAnalytics();
  }, [user?.company_id, startDate, endDate, selectedGroups]);

  // Projects that have paid amounts in the loaded period.
  const projectOptions = useMemo(() => {
    const map = new Map<number | null, ProjectOption>();
    for (const group of data?.groups ?? []) {
      for (const project of group.projects) {
        map.set(project.project_id, { id: project.project_id, name: project.project_name });
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  // Drop selected projects that are not in the newly loaded period.
  useEffect(() => {
    setSelectedProjects((prev) => prev.filter((p) => projectOptions.some((o) => o.id === p.id)));
  }, [projectOptions]);

  // Groups, users and totals recomputed from per-user project rows for the user/project filters.
  const view = useMemo(() => {
    if (!data) return null;
    const query = search.trim().toLowerCase();
    if (!query && !selectedProjects.length) return { totals: data.totals, groups: data.groups };

    const projectIds = new Set(selectedProjects.map((p) => p.id));
    const groups: GroupSpend[] = [];
    for (const group of data.groups) {
      const users: UserSpend[] = [];
      for (const u of group.users) {
        if (query && !(u.user_name ?? "").toLowerCase().includes(query)) continue;
        const projects = projectIds.size
          ? u.projects.filter((p) => projectIds.has(p.project_id))
          : u.projects;
        if (!projects.length) continue;
        users.push({ ...u, ...sumAmounts(projects), projects });
      }
      if (!users.length) continue;

      const projectRows = new Map<number | null, ProjectSpend[]>();
      for (const u of users) {
        for (const p of u.projects) {
          if (!projectRows.has(p.project_id)) projectRows.set(p.project_id, []);
          projectRows.get(p.project_id)!.push(p);
        }
      }
      const projects = [...projectRows.values()]
        .map((rows) => ({
          project_id: rows[0].project_id,
          project_name: rows[0].project_name,
          ...sumAmounts(rows),
        }))
        .sort(byGross);

      groups.push({
        ...group,
        ...sumAmounts(users),
        users_count: users.length,
        users: users.sort(byGross),
        projects,
      });
    }
    groups.sort(byGross);
    return { totals: sumAmounts(groups), groups };
  }, [data, search, selectedProjects]);

  const usersGroup =
    usersGroupId === undefined
      ? null
      : view?.groups.find((g) => g.group_id === usersGroupId) ?? null;

  // Drawer project filter lists the projects of the open group (before filtering).
  const drawerProjectOptions = useMemo(() => {
    const group = data?.groups.find((g) => g.group_id === usersGroupId);
    return (group?.projects ?? [])
      .map((p) => ({ id: p.project_id, name: p.project_name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data, usersGroupId]);

  const userQuery = userSearch.trim().toLowerCase();
  const filteredUsers = (usersGroup?.users ?? []).filter((u) =>
    (u.user_name ?? "").toLowerCase().includes(userQuery)
  );

  const openUsers = (group: GroupSpend) => {
    setExpandedUsers(new Set());
    setUserSearch("");
    setUsersGroupId(group.group_id);
  };

  const toggleUser = (userId: number) => {
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const toggleGroup = (groupId: number | null) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const totals = view?.totals;
  const cards = totals
    ? [
        { label: "Gross spend", value: totals.gross_amount, hint: "Net labour + CIS, plus expenses" },
        { label: "Net spend", value: totals.net_amount, hint: "Paid to users before CIS" },
        { label: "Daywork", value: totals.daywork },
        { label: "Pricework", value: totals.pricework },
        { label: "Expenses", value: totals.expense },
        { label: "Leave & adjustments", value: totals.paid_leave + totals.adjustment },
      ]
    : [];

  return (
    <Box>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        alignItems={{ xs: "stretch", md: "center" }}
        justifyContent="space-between"
        mb={2}
      >
        <Box>
          {!embedded && (
            <Typography variant="h5" fontWeight={700}>
              Group Report
            </Typography>
          )}
          <Typography variant="body2" color="textSecondary">
            Paid amounts per group and project. The group is the one the user was in when
            marked as paid.
          </Typography>
        </Box>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
          <CustomTextField
            size="small"
            placeholder="Search user..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <IconSearch size={16} />
                </InputAdornment>
              ),
            }}
            sx={{ width: 200 }}
          />
          <Autocomplete
            multiple
            size="small"
            options={projectOptions}
            value={selectedProjects}
            onChange={(_, value) => setSelectedProjects(value)}
            getOptionLabel={(option) => option.name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            limitTags={2}
            sx={{ minWidth: 240 }}
            renderInput={(params) => (
              <CustomTextField
                {...params}
                placeholder={selectedProjects.length ? "" : "All projects"}
              />
            )}
          />
          <Autocomplete
            multiple
            size="small"
            options={groupOptions}
            value={selectedGroups}
            onChange={(_, value) => setSelectedGroups(value)}
            getOptionLabel={(option) => option.name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            limitTags={2}
            sx={{ minWidth: 260 }}
            renderInput={(params) => (
              <CustomTextField
                {...params}
                placeholder={selectedGroups.length ? "" : "All groups"}
              />
            )}
          />
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <DateRangePickerBox
              from={startDate}
              to={endDate}
              placeholder="All time"
              onChange={({ from, to }) => {
                setStartDate(from);
                setEndDate(to);
              }}
            />
            {(startDate || endDate) && (
              <Tooltip title="Show all time" arrow>
                <IconButton
                  size="small"
                  onClick={() => {
                    setStartDate(null);
                    setEndDate(null);
                  }}
                >
                  <IconX size={16} />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Stack>
      </Stack>

      {loading ? (
        <Stack spacing={2}>
          <Skeleton variant="rounded" height={88} />
          <Skeleton variant="rounded" height={240} />
        </Stack>
      ) : (
        <>
          <Grid container spacing={2} mb={3}>
            {cards.map((card) => (
              <Grid key={card.label} size={{ xs: 6, sm: 4, md: 2 }}>
                <Card variant="outlined" sx={{ height: "100%" }}>
                  <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Typography variant="body2" color="textSecondary">
                        {card.label}
                      </Typography>
                      {card.hint && (
                        <Tooltip title={card.hint} arrow>
                          <Box component="span" display="flex">
                            <IconInfoCircle size={14} />
                          </Box>
                        </Tooltip>
                      )}
                    </Stack>
                    <Typography variant="h5" fontWeight={700} mt={0.5}>
                      {money(card.value)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {!view?.groups.length ? (
            <Box textAlign="center" py={6}>
              <Image src="/images/no-data.png" alt="No data" width={120} height={120} />
              <Typography variant="body1" color="textSecondary" mt={1}>
                {data?.groups.length
                  ? "No results match the filters"
                  : "No paid amounts in this period"}
              </Typography>
            </Box>
          ) : (
            <TableContainer sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 40 }} />
                    <TableCell>Group / Project</TableCell>
                    <TableCell align="right">Users</TableCell>
                    {amountColumns.map((col) => (
                      <TableCell key={col.key} align="right" sx={{ whiteSpace: "nowrap" }}>
                        {col.label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {view.groups.map((group) => {
                    const isOpen = expanded.has(group.group_id);
                    return (
                      <Fragment key={group.group_id ?? "none"}>
                        <TableRow
                          hover
                          onClick={() => toggleGroup(group.group_id)}
                          sx={{ cursor: "pointer", "& td": { fontWeight: 600 } }}
                        >
                          <TableCell>
                            <IconButton size="small">
                              {isOpen ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                            </IconButton>
                          </TableCell>
                          <TableCell>
                            {group.group_name}{" "}
                            <Chip
                              size="small"
                              label={`${group.projects.length} project${group.projects.length === 1 ? "" : "s"}`}
                              sx={{ ml: 1, fontWeight: 400 }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="View users" arrow>
                              <Box
                                component="span"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openUsers(group);
                                }}
                                sx={{
                                  color: "primary.main",
                                  textDecoration: "underline",
                                  cursor: "pointer",
                                }}
                              >
                                {group.users_count}
                              </Box>
                            </Tooltip>
                          </TableCell>
                          {amountColumns.map((col) => (
                            <TableCell key={col.key} align="right" sx={{ whiteSpace: "nowrap" }}>
                              {cellMoney(group[col.key])}
                            </TableCell>
                          ))}
                        </TableRow>
                        {isOpen &&
                          group.projects.map((project) => (
                            <TableRow key={`${group.group_id}-${project.project_id ?? "none"}`}>
                              <TableCell />
                              <TableCell sx={{ pl: 4, color: "text.secondary" }}>
                                {project.project_name}
                              </TableCell>
                              <TableCell />
                              {amountColumns.map((col) => (
                                <TableCell
                                  key={col.key}
                                  align="right"
                                  sx={{ whiteSpace: "nowrap", color: "text.secondary" }}
                                >
                                  {cellMoney(project[col.key])}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      <Drawer
        anchor="right"
        open={Boolean(usersGroup)}
        onClose={() => setUsersGroupId(undefined)}
        PaperProps={{ sx: { width: { xs: "100%", md: "70vw" }, maxWidth: 1100 } }}
      >
        {usersGroup && (
          <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ px: 2, py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}
            >
              <Box>
                <Typography fontWeight={700}>{usersGroup.group_name}</Typography>
                <Typography variant="body2" color="textSecondary">
                  {usersGroup.users_count} user{usersGroup.users_count === 1 ? "" : "s"} ·{" "}
                  {money(usersGroup.gross_amount)} gross
                </Typography>
              </Box>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Autocomplete
                  multiple
                  size="small"
                  options={drawerProjectOptions}
                  value={selectedProjects}
                  onChange={(_, value) => setSelectedProjects(value)}
                  getOptionLabel={(option) => option.name}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  limitTags={1}
                  sx={{ minWidth: 220 }}
                  renderInput={(params) => (
                    <CustomTextField
                      {...params}
                      placeholder={selectedProjects.length ? "" : "All projects"}
                    />
                  )}
                />
                <CustomTextField
                  size="small"
                  placeholder="Search user..."
                  value={userSearch}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUserSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <IconSearch size={16} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ width: 220 }}
                />
                <IconButton size="small" onClick={() => setUsersGroupId(undefined)}>
                  <IconX size={18} />
                </IconButton>
              </Stack>
            </Stack>
            <TableContainer sx={{ flex: 1, overflow: "auto" }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 40 }} />
                    <TableCell>User / Project</TableCell>
                    {amountColumns.map((col) => (
                      <TableCell key={col.key} align="right" sx={{ whiteSpace: "nowrap" }}>
                        {col.label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={amountColumns.length + 2} align="center" sx={{ py: 4, color: "text.secondary" }}>
                        No users found
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredUsers.map((u) => {
                    const isOpen = expandedUsers.has(u.user_id);
                    return (
                      <Fragment key={u.user_id}>
                        <TableRow
                          hover
                          onClick={() => toggleUser(u.user_id)}
                          sx={{ cursor: "pointer", "& td": { fontWeight: 600 } }}
                        >
                          <TableCell>
                            <IconButton size="small">
                              {isOpen ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                            </IconButton>
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Avatar
                                src={u.user_image ?? ""}
                                alt={u.user_name}
                                sx={{ width: 28, height: 28 }}
                              />
                              <span>{u.user_name}</span>
                            </Stack>
                          </TableCell>
                          {amountColumns.map((col) => (
                            <TableCell key={col.key} align="right" sx={{ whiteSpace: "nowrap" }}>
                              {cellMoney(u[col.key])}
                            </TableCell>
                          ))}
                        </TableRow>
                        {isOpen &&
                          u.projects.map((project) => (
                            <TableRow key={`${u.user_id}-${project.project_id ?? "none"}`}>
                              <TableCell />
                              <TableCell sx={{ pl: 6, color: "text.secondary" }}>
                                {project.project_name}
                              </TableCell>
                              {amountColumns.map((col) => (
                                <TableCell
                                  key={col.key}
                                  align="right"
                                  sx={{ whiteSpace: "nowrap", color: "text.secondary" }}
                                >
                                  {cellMoney(project[col.key])}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Drawer>
    </Box>
  );
}

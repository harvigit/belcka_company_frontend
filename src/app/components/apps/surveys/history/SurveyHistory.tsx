"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Autocomplete, Avatar, Box, Button, CircularProgress, InputAdornment, MenuItem, Stack, Tooltip, Typography } from "@mui/material";
import Link from "next/link";
import { alpha, darken, useTheme } from "@mui/material/styles";
import {
  IconAlertTriangle,
  IconArrowRight,
  IconCalendar,
  IconBriefcase,
  IconCalculator,
  IconCamera,
  IconCheck,
  IconClipboardList,
  IconDeviceMobile,
  IconHistory,
  IconSearch,
  IconWorld,
  IconX,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import api from "@/utils/axios";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";

type Category = "survey" | "inspection" | "qs" | "work_order";
type Person = { id: number; name: string };
type SurveyRef = { id: number; reference: string; title: string | null; status: string | null; property: string | null; deleted: boolean };

type HistoryItem = {
  id: number;
  category: Category;
  action: string;
  message: string;
  changes: { field: string; from: string | null; to: string | null }[];
  meta: Record<string, unknown> | null;
  source: "web" | "app";
  is_failure: boolean;
  user: Person | null;
  /** Only in the all-surveys history. */
  survey?: SurveyRef;
  created_at: string;
  updated_at: string;
};

type Step = { key: string; label: string; done: boolean; current: boolean; at: string | null; by: Person | null };

type HistoryData = {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  // One survey only
  steps?: Step[];
  rework_requested?: boolean;
  earlier?: { message: string; at: string; user: Person | null }[];
  // All surveys only
  surveys?: SurveyRef[];
  today?: number;
  people: Person[];
  failures: number;
};

const CATEGORIES: { key: Category | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "survey", label: "Survey" },
  { key: "inspection", label: "Inspection" },
  { key: "qs", label: "QS" },
  { key: "work_order", label: "Work order" },
];

const CATEGORY_META: Record<Category, { icon: React.ReactNode; tone: "primary" | "info" | "secondary" | "success" }> = {
  survey: { icon: <IconClipboardList size={16} />, tone: "primary" },
  inspection: { icon: <IconCamera size={16} />, tone: "info" },
  qs: { icon: <IconCalculator size={16} />, tone: "secondary" },
  work_order: { icon: <IconBriefcase size={16} />, tone: "success" },
};

type DatePreset = "any" | "today" | "7d" | "30d" | "custom";
const DATE_PRESETS: { key: DatePreset; label: string }[] = [
  { key: "any", label: "Any time" },
  { key: "today", label: "Today" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "custom", label: "Custom range" },
];

/** From / To (YYYY-MM-DD, both included) for a date preset. */
const dateRange = (preset: DatePreset, from: string, to: string): { from: string; to: string } => {
  const today = dayjs().format("YYYY-MM-DD");
  if (preset === "today") return { from: today, to: today };
  if (preset === "7d") return { from: dayjs().subtract(6, "day").format("YYYY-MM-DD"), to: today };
  if (preset === "30d") return { from: dayjs().subtract(29, "day").format("YYYY-MM-DD"), to: today };
  if (preset === "custom") return { from, to };
  return { from: "", to: "" };
};

const initials = (name?: string | null) =>
  (name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";

const dayLabel = (value: string) => {
  const day = dayjs(value);
  if (day.isSame(dayjs(), "day")) return "Today";
  if (day.isSame(dayjs().subtract(1, "day"), "day")) return "Yesterday";
  return day.format("ddd, DD MMM YYYY");
};

/** Lifecycle steps of the survey with when and by whom each was reached. */
function StepsStrip({ steps, reworkRequested }: { steps: Step[]; reworkRequested: boolean }) {
  const theme = useTheme();
  return (
    <Box sx={{ px: { xs: 2, sm: 2.5 }, py: 2, borderBottom: "1px solid", borderColor: "divider" }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5} gap={1} flexWrap="wrap">
        <Typography fontWeight={700} fontSize={14}>
          Progress
        </Typography>
        {reworkRequested && (
          <Box
            sx={{
              px: 1,
              py: 0.25,
              borderRadius: "6px",
              fontSize: 12,
              fontWeight: 600,
              bgcolor: alpha(theme.palette.warning.main, 0.14),
              color: darken(theme.palette.warning.main, 0.45),
            }}
          >
            Rework requested by the QS
          </Box>
        )}
      </Stack>
      <Box sx={{ overflowX: "auto", pb: 0.5 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: `repeat(${steps.length}, minmax(110px, 1fr))`, minWidth: steps.length * 110 }}>
          {steps.map((step, index) => {
            const color = step.done ? theme.palette.primary.main : theme.palette.divider;
            return (
              <Box key={step.key} sx={{ position: "relative", textAlign: "center", px: 0.5 }}>
                {index > 0 && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: 13,
                      right: "50%",
                      width: "100%",
                      height: 2,
                      bgcolor: step.done ? "primary.main" : "divider",
                      borderRadius: 0,
                    }}
                  />
                )}
                <Box
                  sx={{
                    position: "relative",
                    mx: "auto",
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 700,
                    bgcolor: step.done ? "primary.main" : "background.paper",
                    color: step.done ? "primary.contrastText" : "text.secondary",
                    border: `2px solid ${color}`,
                    boxShadow: step.current ? `0 0 0 4px ${alpha(theme.palette.primary.main, 0.18)}` : "none",
                  }}
                >
                  {step.done ? <IconCheck size={15} stroke={3} /> : index + 1}
                </Box>
                <Typography fontSize={12.5} fontWeight={step.current ? 700 : 600} mt={0.75} color={step.done ? "text.primary" : "text.secondary"}>
                  {step.label}
                </Typography>
                {step.at && (
                  <Typography fontSize={11.5} color="text.secondary" lineHeight={1.4}>
                    {dayjs(step.at).format("DD MMM YYYY, HH:mm")}
                  </Typography>
                )}
                {step.by && (
                  <Typography fontSize={11.5} color="text.secondary" noWrap lineHeight={1.4}>
                    {step.by.name}
                  </Typography>
                )}
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}

/**
 * Who did what, from the web and the app, as a day-by-day timeline with filters. With a surveyId it is
 * one survey's history (with its lifecycle steps): the survey page's History tab and the list's row
 * drawer. Without one it is every survey's history, newest first (the list's History button), with
 * survey, date and text filters and the survey shown on each entry.
 */
export default function SurveyHistory({ surveyId, refreshKey = 0 }: { surveyId?: number | string; refreshKey?: number }) {
  const allSurveys = !surveyId;
  const theme = useTheme();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [data, setData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");
  const [userId, setUserId] = useState<string>("all");
  const [failuresOnly, setFailuresOnly] = useState(false);
  // All-surveys filters
  const [surveyFilter, setSurveyFilter] = useState<SurveyRef | null>(null);
  // Date: a preset, or a custom From–To range
  const [datePreset, setDatePreset] = useState<DatePreset>("any");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const range = useMemo(() => dateRange(datePreset, from, to), [datePreset, from, to]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  // The list of surveys for the filter comes with the first, unfiltered load and is kept.
  const [surveyOptions, setSurveyOptions] = useState<SurveyRef[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(
    async (page: number) => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(allSurveys ? "surveys/history" : `surveys/${surveyId}/history`, {
          params: {
            page,
            limit: 50,
            ...(category !== "all" && { category }),
            ...(userId !== "all" && { user_id: userId }),
            ...(failuresOnly && { failures: true }),
            ...(allSurveys && surveyFilter && { survey_id: surveyFilter.id }),
            ...(allSurveys && range.from && { from: range.from }),
            ...(allSurveys && range.to && { to: range.to }),
            ...(allSurveys && search && { search }),
          },
          skipToast: true,
        } as any);
        const rows: HistoryItem[] = res.data?.info || [];
        setItems((current) => (page === 1 ? rows : [...current, ...rows]));
        setData(res.data?.data || null);
        if (res.data?.data?.surveys?.length) setSurveyOptions(res.data.data.surveys);
      } catch (err: any) {
        setError(err?.response?.data?.message || "Couldn't load the history. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [allSurveys, surveyId, category, userId, failuresOnly, surveyFilter, range.from, range.to, search],
  );

  useEffect(() => {
    void load(1);
  }, [load, refreshKey]);

  const groups = useMemo(() => {
    const result: { label: string; items: HistoryItem[] }[] = [];
    for (const item of items) {
      const label = dayLabel(item.updated_at);
      const last = result[result.length - 1];
      if (last && last.label === label) last.items.push(item);
      else result.push({ label, items: [item] });
    }
    return result;
  }, [items]);

  const filtered =
    category !== "all" || userId !== "all" || failuresOnly || Boolean(surveyFilter) || datePreset !== "any" || Boolean(search);
  const clearFilters = () => {
    setCategory("all");
    setUserId("all");
    setFailuresOnly(false);
    setSurveyFilter(null);
    setDatePreset("any");
    setFrom("");
    setTo("");
    setSearchInput("");
    setSearch("");
  };
  const page = data?.currentPage ?? 1;
  const totalPages = data?.totalPages ?? 1;

  const chipSx = (active: boolean, tone: string = theme.palette.primary.main) => ({
    px: 1.25,
    height: 30,
    borderRadius: "8px",
    border: "1px solid",
    borderColor: active ? tone : "divider",
    bgcolor: active ? alpha(tone, 0.1) : "background.paper",
    color: active ? tone : "text.secondary",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
    display: "inline-flex",
    alignItems: "center",
    gap: 0.5,
    "&:hover": { borderColor: tone },
  });

  const renderEntry = (item: HistoryItem, isLast: boolean) => {
    const meta = CATEGORY_META[item.category] || CATEGORY_META.survey;
    const tone = item.is_failure ? theme.palette.error.main : theme.palette[meta.tone].main;
    const saves = Number(item.meta?.saves || 0);
    const progress = typeof item.meta?.progress === "string" ? item.meta.progress : null;
    return (
      <Box key={item.id} display="flex" gap={1.5}>
        {/* Timeline rail */}
        <Box display="flex" flexDirection="column" alignItems="center" sx={{ width: 32, flexShrink: 0 }}>
          <Box
            sx={{
              mt: 1.25,
              width: 32,
              height: 32,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: tone,
              bgcolor: alpha(tone, 0.12),
            }}
          >
            {item.is_failure ? <IconAlertTriangle size={16} /> : meta.icon}
          </Box>
          {!isLast && <Box sx={{ flex: 1, width: "2px", bgcolor: "divider", mt: 0.75, borderRadius: 0 }} />}
        </Box>

        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            mb: 1.5,
            px: 1.75,
            py: 1.25,
            borderRadius: "10px",
            border: "1px solid",
            borderColor: item.is_failure ? alpha(theme.palette.error.main, 0.4) : "divider",
            bgcolor: item.is_failure ? alpha(theme.palette.error.main, 0.04) : "background.paper",
          }}
        >
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1.5}>
            <Typography fontSize={14} lineHeight={1.5} sx={{ minWidth: 0, wordBreak: "break-word" }}>
              <Box component="span" fontWeight={700}>
                {item.user?.name || "System"}
              </Box>{" "}
              <Box component="span" color={item.is_failure ? "error.main" : "text.primary"}>
                {item.message}
              </Box>
            </Typography>
            <Tooltip title={dayjs(item.updated_at).format("DD MMM YYYY, HH:mm:ss")}>
              <Typography fontSize={12.5} color="text.secondary" sx={{ flexShrink: 0, whiteSpace: "nowrap" }}>
                {dayjs(item.updated_at).format("HH:mm")}
              </Typography>
            </Tooltip>
          </Stack>

          <Stack direction="row" alignItems="center" gap={1} mt={0.5} flexWrap="wrap">
            {item.survey && (
              <Tooltip title={item.survey.deleted ? "This survey was deleted" : "Open survey"}>
                <Box
                  component={item.survey.deleted ? "span" : Link}
                  href={item.survey.deleted ? undefined : `/apps/surveys/view/${item.survey.id}`}
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.75,
                    maxWidth: "100%",
                    minWidth: 0,
                    px: 0.75,
                    height: 20,
                    borderRadius: "6px",
                    fontSize: 11.5,
                    textDecoration: item.survey.deleted ? "line-through" : "none",
                    color: "primary.main",
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.14) },
                  }}
                >
                  <Box component="span" fontWeight={700} sx={{ flexShrink: 0 }}>
                    {item.survey.reference}
                  </Box>
                  {item.survey.property && (
                    <Box component="span" sx={{ color: "text.secondary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 260 }}>
                      {item.survey.property}
                    </Box>
                  )}
                </Box>
              </Tooltip>
            )}
            <Box
              component="span"
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
                px: 0.75,
                height: 20,
                borderRadius: "6px",
                fontSize: 11.5,
                fontWeight: 600,
                color: "text.secondary",
                bgcolor: alpha(theme.palette.grey[500], 0.12),
              }}
            >
              {item.source === "app" ? <IconDeviceMobile size={13} /> : <IconWorld size={13} />}
              {item.source === "app" ? "App" : "Web"}
            </Box>
            {saves > 1 && (
              <Tooltip title={`Saved ${saves} times between ${dayjs(item.created_at).format("HH:mm")} and ${dayjs(item.updated_at).format("HH:mm")}`}>
                <Typography component="span" fontSize={12} color="text.secondary">
                  {saves} saves
                </Typography>
              </Tooltip>
            )}
            {progress && (
              <Typography component="span" fontSize={12} color="text.secondary">
                {progress} elements inspected
              </Typography>
            )}
          </Stack>

          {item.changes.length > 0 && (
            <Stack spacing={0.5} mt={1} pt={1} sx={{ borderTop: "1px dashed", borderColor: "divider", borderRadius: 0 }}>
              {item.changes.map((change) => (
                <Stack key={change.field} direction="row" alignItems="baseline" gap={1} flexWrap="wrap" fontSize={13}>
                  <Typography component="span" fontSize={13} color="text.secondary" sx={{ minWidth: 96 }}>
                    {change.field}
                  </Typography>
                  {change.from !== null && (
                    <>
                      <Typography component="span" fontSize={13} color="text.secondary" sx={{ textDecoration: "line-through", wordBreak: "break-word" }}>
                        {change.from}
                      </Typography>
                      <Box component="span" sx={{ color: "text.disabled", display: "inline-flex", alignSelf: "center" }}>
                        <IconArrowRight size={13} />
                      </Box>
                    </>
                  )}
                  <Typography component="span" fontSize={13} fontWeight={600} sx={{ wordBreak: "break-word" }}>
                    {change.to ?? "Cleared"}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          )}
        </Box>
      </Box>
    );
  };

  const userSelect = (
    <CustomTextField
      select
      size="small"
      value={userId}
      onChange={(event: any) => setUserId(event.target.value)}
      sx={{ minWidth: allSurveys ? 0 : 180 }}
    >
      <MenuItem value="all">Everyone</MenuItem>
      {(data?.people || []).map((person) => (
        <MenuItem key={person.id} value={String(person.id)}>
          <Stack direction="row" alignItems="center" gap={1}>
            <Avatar sx={{ width: 22, height: 22, fontSize: 10, bgcolor: alpha(theme.palette.primary.main, 0.12), color: "primary.main" }}>
              {initials(person.name)}
            </Avatar>
            {person.name}
          </Stack>
        </MenuItem>
      ))}
    </CustomTextField>
  );

  return (
    <Box>
      {data?.steps?.length ? <StepsStrip steps={data.steps} reworkRequested={Boolean(data.rework_requested)} /> : null}

      {/* Filters */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        alignItems={{ xs: "stretch", md: "center" }}
        justifyContent="space-between"
        gap={1.5}
        sx={{ px: { xs: 2, sm: 2.5 }, py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}
      >
        <Stack direction="row" gap={0.75} flexWrap="wrap">
          {CATEGORIES.map((option) => (
            <Box
              key={option.key}
              component="button"
              type="button"
              aria-pressed={category === option.key}
              onClick={() => setCategory(option.key)}
              sx={chipSx(category === option.key)}
            >
              {option.label}
            </Box>
          ))}
          {(data?.failures || 0) > 0 && (
            <Tooltip title="Blocked or failed attempts, e.g. a submit with required fields missing">
              <Box
                component="button"
                type="button"
                aria-pressed={failuresOnly}
                onClick={() => setFailuresOnly((value) => !value)}
                sx={chipSx(failuresOnly, theme.palette.error.main)}
              >
                <IconAlertTriangle size={14} />
                Issues ({data?.failures})
              </Box>
            </Tooltip>
          )}
        </Stack>
        {!allSurveys && userSelect}
        {allSurveys && filtered && (
          <Button
            size="small"
            color="inherit"
            startIcon={<IconX size={16} />}
            onClick={clearFilters}
            sx={{ color: "text.secondary", whiteSpace: "nowrap", alignSelf: { xs: "flex-start", md: "center" } }}
          >
            Clear filters
          </Button>
        )}
      </Stack>

      {allSurveys && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              sm: "repeat(2, minmax(0, 1fr))",
              md: "minmax(0, 1.4fr) repeat(3, minmax(0, 1fr))",
            },
            gap: 1.25,
            alignItems: "center",
            px: { xs: 2, sm: 2.5 },
            py: 1.5,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <CustomTextField
            size="small"
            placeholder="Search history"
            value={searchInput}
            onChange={(event: any) => setSearchInput(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <IconSearch size={16} />
                </InputAdornment>
              ),
            }}
          />
          <Autocomplete
            size="small"
            options={surveyOptions}
            value={surveyFilter}
            onChange={(_, value) => setSurveyFilter(value)}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            getOptionLabel={(option) => option.reference}
            // Typing an address also finds the survey.
            filterOptions={(options, state) => {
              const query = state.inputValue.trim().toLowerCase();
              return query
                ? options.filter((option) => `${option.reference} ${option.property || ""} ${option.title || ""}`.toLowerCase().includes(query))
                : options;
            }}
            renderOption={(props, option) => {
              const { key, ...rest } = props as any;
              return (
                <li key={key} {...rest}>
                  <Box minWidth={0}>
                    <Typography fontSize={13.5} fontWeight={600} sx={{ textDecoration: option.deleted ? "line-through" : "none" }}>
                      {option.reference}
                    </Typography>
                    <Typography fontSize={12} color="text.secondary" noWrap>
                      {option.property || option.title || "—"}
                    </Typography>
                  </Box>
                </li>
              );
            }}
            renderInput={(params) => <CustomTextField {...params} placeholder="All surveys" />}
          />
          {userSelect}
          <CustomTextField
            select
            size="small"
            value={datePreset}
            onChange={(event: any) => setDatePreset(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <IconCalendar size={16} />
                </InputAdornment>
              ),
            }}
          >
            {DATE_PRESETS.map((option) => (
              <MenuItem key={option.key} value={option.key}>
                {option.label}
              </MenuItem>
            ))}
          </CustomTextField>
          {datePreset === "custom" && (
            <Stack
              direction={{ xs: "column", sm: "row" }}
              alignItems={{ xs: "stretch", sm: "center" }}
              gap={1.25}
              sx={{ gridColumn: "1 / -1" }}
            >
              <CustomTextField
                size="small"
                type="date"
                label="From"
                value={from}
                onChange={(event: any) => setFrom(event.target.value)}
                InputLabelProps={{ shrink: true }}
                inputProps={{ max: to || undefined }}
                sx={{ width: { xs: "100%", sm: 200 } }}
              />
              <CustomTextField
                size="small"
                type="date"
                label="To"
                value={to}
                onChange={(event: any) => setTo(event.target.value)}
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: from || undefined }}
                sx={{ width: { xs: "100%", sm: 200 } }}
              />
              <Typography fontSize={12.5} color="text.secondary">
                {from || to ? "Both dates are included." : "Pick a start date, an end date, or both."}
              </Typography>
            </Stack>
          )}
        </Box>
      )}

      {/* Timeline */}
      <Box sx={{ px: { xs: 2, sm: 2.5 }, py: 2 }}>
        {error ? (
          <Typography color="error.main" textAlign="center" py={4}>
            {error}
          </Typography>
        ) : loading && items.length === 0 ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress size={28} />
          </Box>
        ) : items.length === 0 && !data?.earlier?.length ? (
          <Stack alignItems="center" spacing={1} py={6} color="text.secondary">
            <IconHistory size={36} />
            <Typography fontWeight={600} color="text.primary">
              {filtered ? "Nothing matches these filters" : "No history yet"}
            </Typography>
            <Typography fontSize={13}>
              {filtered
                ? "Try another filter."
                : allSurveys
                  ? "Actions on surveys will show here as they happen."
                  : "Actions on this survey will show here as they happen."}
            </Typography>
          </Stack>
        ) : (
          <Box maxWidth={980}>
            {groups.map((group) => (
              <Box key={group.label} mb={1}>
                <Typography fontSize={12} fontWeight={700} color="text.secondary" textTransform="uppercase" letterSpacing={0.6} sx={{ mb: 1 }}>
                  {group.label}
                </Typography>
                {group.items.map((item, index) => renderEntry(item, index === group.items.length - 1))}
              </Box>
            ))}

            {page < totalPages && (
              <Box display="flex" justifyContent="center" pt={1} pb={2}>
                <Button
                  variant="outlined"
                  onClick={() => void load(page + 1)}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={14} /> : undefined}
                >
                  {loading ? "Loading..." : "Load more"}
                </Button>
              </Box>
            )}

            {page >= totalPages && (data?.earlier?.length || 0) > 0 && (
              <Box mt={1}>
                <Typography fontSize={12} fontWeight={700} color="text.secondary" textTransform="uppercase" letterSpacing={0.6} sx={{ mb: 0.5 }}>
                  Before history was recorded
                </Typography>
                <Typography fontSize={12.5} color="text.secondary" mb={1.25}>
                  This survey started before the history was added, so only these key dates are known.
                </Typography>
                {(data?.earlier || []).map((entry, index) => (
                  <Stack
                    key={`${entry.message}-${index}`}
                    direction="row"
                    justifyContent="space-between"
                    gap={1.5}
                    sx={{ py: 1, px: 1.75, mb: 1, borderRadius: "10px", border: "1px dashed", borderColor: "divider" }}
                  >
                    <Typography fontSize={13.5} color="text.secondary">
                      {entry.user && (
                        <Box component="span" fontWeight={700} color="text.primary">
                          {entry.user.name}{" "}
                        </Box>
                      )}
                      {entry.message}
                    </Typography>
                    <Typography fontSize={12.5} color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                      {dayjs(entry.at).format("DD MMM YYYY, HH:mm")}
                    </Typography>
                  </Stack>
                ))}
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}

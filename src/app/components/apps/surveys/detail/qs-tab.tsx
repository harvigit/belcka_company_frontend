"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, Grid, LinearProgress, Paper, Stack, Typography } from "@mui/material";
import { IconChevronRight } from "@tabler/icons-react";
import api from "@/utils/axios";
import { Column, RecordTable, StatTile } from "@/app/components/apps/vehicles/detail/common";
import { uomLabel } from "../settings/nhf-rates/types";
import { dateTime } from "../list/types";
import { LINE_META, QsDetail, QsLine, RATE_SOURCE, gbp } from "../qs/types";
import Chip from "@/app/components/apps/surveys/shared/SurveyChip";

// Survey page › QS pricing: what the QS priced (read only here; pricing happens in QS review).
const QsPricingTab: React.FC<{ surveyId: number }> = ({ surveyId }) => {
  const router = useRouter();
  const [d, setD] = useState<QsDetail | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    api
      .get(`survey-qs/${surveyId}`)
      .then((res) => setD(res.data.data))
      .catch(() => setFailed(true));
  }, [surveyId]);

  if (failed) return <Typography color="textSecondary">Could not load the QS pricing.</Typography>;
  if (!d) return <LinearProgress />;
  const s = d.survey;
  const started = ["qs_review", "completed", "frozen"].includes(s.status) || d.totals.approved + d.totals.excluded > 0;
  if (!started)
    return (
      <Paper variant="outlined" sx={{ p: 4, borderRadius: 2, borderStyle: "dashed", textAlign: "center" }}>
        <Typography fontWeight={600}>Not priced yet.</Typography>
        <Typography color="textSecondary" className="f-14" mb={s.status === "submitted" ? 2 : 0}>
          {s.status === "submitted" ? "The survey is waiting for the QS." : "The QS prices the works after the surveyor submits the survey."}
        </Typography>
        {s.status === "submitted" && (
          <Button variant="contained" endIcon={<IconChevronRight size={16} />} onClick={() => router.push(`/apps/surveys/qs/${surveyId}`)}>
            Open in QS review
          </Button>
        )}
      </Paper>
    );
  const t = d.totals;
  const cols: Column<QsLine & { id: number }>[] = [
    {
      header: "Area / element",
      render: (l) => (
        <Box>
          <Typography className="f-14" fontWeight={600}>
            {l.room}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {[...(l.path.length ? l.path : ["In the area"]), l.element].join(" › ")}
          </Typography>
        </Box>
      ),
    },
    { header: "Work", render: (l) => <Typography className="f-14">{l.work_name}</Typography> },
    { header: "Code", render: (l) => <Typography className="f-14">{l.code ?? "–"}</Typography> },
    { header: "Qty", align: "right", render: (l) => <Typography className="f-14" noWrap>{l.qty === null ? "–" : `${l.qty} ${uomLabel(l.unit)}`}</Typography> },
    {
      header: "Rate",
      align: "right",
      render: (l) => (
        <Box>
          <Typography className="f-14">{gbp(l.rate)}</Typography>
          <Typography variant="caption" color="textSecondary">
            {l.rate === null ? "" : RATE_SOURCE[l.rate_source]}
          </Typography>
        </Box>
      ),
    },
    { header: "Amount", align: "right", render: (l) => <Typography className="f-14" fontWeight={700}>{l.status === "excluded" ? "–" : gbp(l.amount)}</Typography> },
    {
      header: "Status",
      render: (l) => (
        <Box>
          <Chip size="small" color={LINE_META[l.status].color} variant={l.status === "pending" ? "outlined" : "filled"} label={LINE_META[l.status].label} />
          {l.reason && (
            <Typography variant="caption" color="textSecondary" display="block">
              {l.reason}
            </Typography>
          )}
        </Box>
      ),
    },
  ];
  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} spacing={1}>
        <Chip
          color={s.status === "completed" ? "success" : s.status === "qs_review" ? "primary" : "default"}
          label={s.status === "completed" ? "Review completed · prices locked" : s.status === "qs_review" ? "QS review in progress" : s.status_label}
        />
        <Typography variant="body2" color="textSecondary">
          {s.qs_completed_at ? `Completed ${dateTime(s.qs_completed_at)}${s.qs_completed_by ? ` by ${s.qs_completed_by}` : ""}` : s.qs_started_by ? `Started by ${s.qs_started_by}` : ""} · uplift {d.uplift_percent}% · read only here
        </Typography>
        <Button variant="outlined" size="small" endIcon={<IconChevronRight size={16} />} sx={{ ml: { sm: "auto" } }} onClick={() => router.push(`/apps/surveys/qs/${surveyId}`)}>
          Open in QS review
        </Button>
      </Stack>
      <Grid container spacing={2}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatTile label="Lines reviewed" value={`${t.approved + t.excluded} / ${t.lines}`} sub={`${t.approved} approved · ${t.excluded} excluded`} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatTile label="Net" value={gbp(t.net)} sub={`+ uplift ${gbp(t.uplift)}`} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatTile label="Total ex VAT" value={gbp(t.total)} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatTile label="Grand total" value={gbp(t.grand_total)} sub={t.vat_on ? `inc VAT ${gbp(t.vat)}` : "VAT not added"} />
        </Grid>
      </Grid>
      <RecordTable columns={cols} rows={d.lines.map((l) => ({ ...l, id: l.item_id }))} empty="No works to price." />
    </Stack>
  );
};

export default QsPricingTab;

"use client";

import React from "react";
import { Box, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { IconArrowBackUp, IconCheck } from "@tabler/icons-react";
import { STATUS_META, SurveyDetail, SurveyStatus } from "../list/types";
import { WARN_BORDER, WARN_TEXT } from "../shared/colors";

const ORDER: SurveyStatus[] = ["draft", "assigned", "in_progress", "submitted", "qs_review", "completed"];

const when = (d?: string | null) =>
  d ? new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : null;

/** Survey progress: done steps (green tick + date), the current step (highlighted) and the steps still to come. */
const StatusStepper: React.FC<{ survey: SurveyDetail }> = ({ survey: s }) => {
  const theme = useTheme();
  const at = Math.max(0, ORDER.indexOf(s.status === "frozen" ? "completed" : s.status));
  const rework = !!s.rework_notes && s.status === "in_progress";
  const dates: Partial<Record<SurveyStatus, string | null | undefined>> = {
    draft: s.created_at,
    assigned: s.assigned_at,
    in_progress: s.started_at,
    submitted: s.submitted_at,
    qs_review: s.qs_started_at,
    completed: s.qs_completed_at,
  };
  const grey = theme.palette.grey[300];
  const green = theme.palette.success.main;
  const blue = theme.palette.primary.main;
  const finished = s.status === "completed" || s.status === "frozen";

  return (
    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, px: 1, py: 1.75, overflowX: "auto" }}>
      <Box sx={{ display: "grid", gridTemplateColumns: `repeat(${ORDER.length}, minmax(112px, 1fr))` }}>
        {ORDER.map((k, i) => {
          const done = i < at || (finished && i === at);
          const current = i === at && !finished;
          const warn = current && rework;
          const color = done ? green : current ? (warn ? WARN_BORDER : blue) : grey;
          const date = when(dates[k]);
          return (
            <Box key={k} sx={{ position: "relative", textAlign: "center", px: 0.5 }}>
              {/* line to the previous / next step */}
              {i > 0 && <Box sx={{ position: "absolute", top: 14, left: 0, right: "50%", height: 2, bgcolor: i <= at ? green : grey }} />}
              {i < ORDER.length - 1 && <Box sx={{ position: "absolute", top: 14, left: "50%", right: 0, height: 2, bgcolor: i < at ? green : grey }} />}
              <Box
                sx={{
                  position: "relative",
                  mx: "auto",
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 700,
                  bgcolor: done || current ? color : "background.paper",
                  color: done || current ? "#fff" : "text.secondary",
                  border: done || current ? "none" : `2px solid ${grey}`,
                  boxShadow: current ? `0 0 0 4px ${alpha(color, 0.2)}` : "none",
                }}
              >
                {done ? <IconCheck size={17} stroke={3} /> : warn ? <IconArrowBackUp size={17} stroke={2.5} /> : i + 1}
              </Box>
              <Typography className="f-14" mt={0.75} lineHeight={1.4} fontWeight={current ? 700 : done ? 600 : 500} color={done || current ? "textPrimary" : "textSecondary"} noWrap>
                {STATUS_META[k].label}
              </Typography>
              <Typography variant="caption" display="block" noWrap lineHeight={1.4} sx={{ color: warn ? WARN_TEXT : current ? blue : "text.secondary", fontWeight: current ? 600 : 400 }}>
                {warn ? "Rework requested" : current ? (date ? `Now · ${date}` : "Now") : done ? date ?? "Done" : " "}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default StatusStepper;

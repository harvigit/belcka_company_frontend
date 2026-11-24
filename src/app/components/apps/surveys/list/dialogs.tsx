"use client";

import React, { useEffect, useState } from "react";
import { Avatar, Button, Dialog, DialogActions, DialogContent, DialogTitle, Radio, Stack, TextField, InputAdornment, Typography } from "@mui/material";
import { IconSearch } from "@tabler/icons-react";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import { apiMessage } from "../settings/nhf-rates/types";
import { SurveyOptions, SurveyRow } from "./types";

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase())
    .join("");

// ---------- assign a surveyor ----------
export const AssignDialog: React.FC<{
  survey: SurveyRow | null;
  surveyors: SurveyOptions["surveyors"];
  onClose: () => void;
  onAssigned: () => void;
}> = ({ survey, surveyors, onClose, onAssigned }) => {
  const [pick, setPick] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setPick(survey?.surveyor?.id ?? null);
    setQ("");
  }, [survey]);
  const list = surveyors.filter((u) => u.name.toLowerCase().includes(q.trim().toLowerCase()));
  const assign = async () => {
    if (!survey || !pick) return;
    setBusy(true);
    try {
      const res = await api.post(`surveys/${survey.id}/assign`, { surveyor_id: pick });
      toast.success(res.data.message);
      onAssigned();
    } catch (e) {
      toast.error(apiMessage(e, "Could not assign the survey."));
    }
    setBusy(false);
  };
  return (
    <Dialog open={!!survey} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Assign survey · {survey?.reference}</DialogTitle>
      <DialogContent>
        <Typography color="textSecondary" className="f-14" mb={1.5}>
          {survey?.title} · {survey?.address?.name ?? ""}
        </Typography>
        <TextField
          size="small"
          fullWidth
          placeholder="Search..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          slotProps={{ input: { endAdornment: <InputAdornment position="end"><IconSearch size={16} /></InputAdornment> } }}
        />
        <Stack spacing={1} mt={1.5} sx={{ maxHeight: 320, overflowY: "auto" }}>
          {list.map((u) => (
            <Stack
              key={u.id}
              direction="row"
              spacing={1.5}
              alignItems="center"
              onClick={() => setPick(u.id)}
              sx={{
                p: 1,
                borderRadius: 2,
                cursor: "pointer",
                border: "1px solid",
                borderColor: pick === u.id ? "primary.main" : "grey.200",
                backgroundColor: pick === u.id ? "primary.light" : "background.paper",
              }}
            >
              <Radio size="small" checked={pick === u.id} sx={{ p: 0.5 }} />
              <Avatar src={u.image ?? undefined} sx={{ width: 32, height: 32, fontSize: 13 }}>{initials(u.name)}</Avatar>
              <Typography className="f-14" fontWeight={600} flex={1}>
                {u.name}
              </Typography>
              <Typography variant="caption" color="textSecondary" noWrap>
                {u.open_surveys} open {u.open_surveys === 1 ? "survey" : "surveys"}
              </Typography>
            </Stack>
          ))}
          {!list.length && (
            <Typography color="textSecondary" className="f-14" textAlign="center" py={2}>
              {surveyors.length ? "No surveyor matches the search." : "No surveyors. A surveyor needs the Surveys permission in the app."}
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="contained" disabled={!pick || busy} onClick={assign}>
          Assign
        </Button>
      </DialogActions>
    </Dialog>
  );
};

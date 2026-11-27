"use client";

import React, { useEffect, useState } from "react";
import { Box, Button, CircularProgress, MenuItem, Stack, Typography } from "@mui/material";
import Alert from "@/app/components/apps/surveys/shared/SurveyAlert";
import { IconCheck, IconMapPin, IconSearch } from "@tabler/icons-react";
import { useJsApiLoader } from "@react-google-maps/api";
import api from "@/utils/axios";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import { GOOGLE_MAPS_SHARED_LOADER_OPTIONS } from "@/utils/googleMaps";
import { Prediction, resolvePrediction, searchPlaces } from "@/app/components/apps/addresses/list/address-workspace";
import { apiMessage } from "../settings/nhf-rates/types";

const Label: React.FC<{ children: React.ReactNode; req?: boolean }> = ({ children, req }) => (
  <Typography fontSize={13} fontWeight={600} mb={0.5}>
    {children}
    {req && (
      <Box component="span" color="error.main">
        {" "}
        *
      </Box>
    )}
  </Typography>
);

// Adds a new address straight to the project (same as Addresses › Add address with a project):
// find it by address or postcode, check the line and postcode, save. It is then selected for the survey.
const NewAddressPanel: React.FC<{
  project: { id: number; name: string };
  companyId?: number | null;
  onCancel: () => void;
  onSaved: () => void;
}> = ({ project, companyId, onCancel, onSaved }) => {
  const { isLoaded } = useJsApiLoader({ ...GOOGLE_MAPS_SHARED_LOADER_OPTIONS, googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY! });
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Prediction[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [place, setPlace] = useState<{ street: string; postcode: string; lat: number | null; lng: number | null } | null>(null);
  const [err, setErr] = useState<{ street?: string; postcode?: string; form?: string }>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setQuery("");
    setResults(null);
    setPlace(null);
    setErr({});
  }, [project.id]);

  const search = async () => {
    if (query.trim().length < 3) return setErr({ form: "Type at least 3 letters of the address or postcode." });
    setErr({});
    setSearching(true);
    try {
      setResults(await searchPlaces(query, isLoaded));
    } finally {
      setSearching(false);
    }
  };

  const pick = async (item: Prediction) => {
    setResults(null);
    setSearching(true);
    const p = await resolvePrediction(item);
    setSearching(false);
    setPlace(p);
    setQuery("");
  };

  const save = async () => {
    const e: typeof err = {};
    if (!place?.street.trim()) e.street = "Enter the address";
    if (!place?.postcode.trim()) e.postcode = "Enter the postcode";
    if (place && (place.lat == null || place.lng == null)) e.form = "We could not find this address on the map. Please pick it from the search results.";
    setErr(e);
    if (Object.keys(e).length || !place) return;
    setSaving(true);
    try {
      const res = await api.post("address/parent-create", {
        company_id: companyId,
        project_id: project.id,
        addresses: [
          {
            name: place.street.trim(),
            pin_code: place.postcode.trim(),
            type: "address",
            latitude: place.lat,
            longitude: place.lng,
            boundary: JSON.stringify({ lat: place.lat, lng: place.lng, radius: 100 }),
          },
        ],
      });
      if (res.data?.IsSuccess === false) {
        setErr({ form: res.data.message || "Could not save the address." });
      } else onSaved();
    } catch (error) {
      setErr({ form: apiMessage(error, "Could not save the address.") });
    }
    setSaving(false);
  };

  return (
    <Box sx={{ p: 2, borderRadius: 2, border: "1px solid", borderColor: "primary.main", backgroundColor: "primary.light" }}>
      <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
        <IconMapPin size={18} />
        <Typography fontWeight={700} className="f-14">
          New address in {project.name}
        </Typography>
        <Typography variant="caption" color="textSecondary">
          It is saved to the project and selected for this survey.
        </Typography>
      </Stack>

      {!place ? (
        <Box>
          <Label req>Find the address</Label>
          <Stack direction="row" spacing={1}>
            <CustomTextField
              fullWidth
              autoFocus
              value={query}
              placeholder="Type the address or postcode, e.g. NW5 2HT"
              onChange={(e: any) => setQuery(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  search();
                }
              }}
              sx={{ "& .MuiInputBase-root": { backgroundColor: "background.paper" } }}
            />
            <Button
              variant="contained"
              onClick={search}
              disabled={searching}
              startIcon={searching ? <CircularProgress size={14} color="inherit" /> : <IconSearch size={16} />}
              sx={{ flexShrink: 0 }}
            >
              Search
            </Button>
          </Stack>
          {results && (
            <Box sx={{ mt: 1, border: "1px solid", borderColor: "grey.200", borderRadius: 1.5, backgroundColor: "background.paper", maxHeight: 220, overflowY: "auto" }}>
              {results.length ? (
                results.map((r) => (
                  <MenuItem key={r.id} onClick={() => pick(r)} sx={{ whiteSpace: "normal", py: 1, gap: 1 }}>
                    <IconMapPin size={16} style={{ flexShrink: 0, opacity: 0.6 }} />
                    <Typography className="f-14">{r.label}</Typography>
                  </MenuItem>
                ))
              ) : (
                <Typography className="f-14" color="textSecondary" p={1.5}>
                  No address found. Try the postcode, or the house number and street.
                </Typography>
              )}
            </Box>
          )}
        </Box>
      ) : (
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <Box flex={2}>
            <Label req>Address</Label>
            <CustomTextField
              fullWidth
              value={place.street}
              onChange={(e: any) => setPlace({ ...place, street: e.target.value })}
              error={!!err.street}
              helperText={err.street}
              sx={{ "& .MuiInputBase-root": { backgroundColor: "background.paper" } }}
            />
          </Box>
          <Box flex={1}>
            <Label req>Postcode</Label>
            <CustomTextField
              fullWidth
              value={place.postcode}
              onChange={(e: any) => setPlace({ ...place, postcode: e.target.value.toUpperCase() })}
              error={!!err.postcode}
              helperText={err.postcode}
              sx={{ "& .MuiInputBase-root": { backgroundColor: "background.paper" } }}
            />
          </Box>
        </Stack>
      )}

      {err.form && (
        <Alert severity="error" sx={{ mt: 1.5, py: 0 }}>
          {err.form}
        </Alert>
      )}

      <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center" mt={1.5}>
        {place && (
          <Button size="small" color="inherit" onClick={() => setPlace(null)} sx={{ mr: "auto" }}>
            Search again
          </Button>
        )}
        <Button size="small" variant="outlined" color="inherit" onClick={onCancel} sx={{ backgroundColor: "background.paper" }}>
          Cancel
        </Button>
        <Button
          size="small"
          variant="contained"
          disabled={!place || saving}
          onClick={save}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <IconCheck size={16} />}
        >
          Save address
        </Button>
      </Stack>
    </Box>
  );
};

export default NewAddressPanel;

"use client";

import React from "react";
import {
  Box,
  Typography,
  Stack,
  Card,
  CardContent,
  Grid,
  Divider,
  Chip,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import {
  IconBuilding,
  IconMapPin,
  IconUser,
  IconCalendar,
  IconTemplate,
  IconLayersIntersect,
  IconChevronDown,
  IconCheck,
} from "@tabler/icons-react";
import { SurveyRoom, SurveyCreationMethod } from "../../types";
import BlankCard from "@/app/components/shared/BlankCard";

interface Step4ReviewProps {
  formData: {
    reference: string;
    title: string;
    projectId: number | null;
    projectName?: string;
    addressId: number | null;
    propertyName?: string;
    surveyorId: number | null;
    surveyorName?: string;
    surveyDate: string;
    notes: string;
  };
  method: SurveyCreationMethod;
  templateName?: string;
  rooms: SurveyRoom[];
}

export default function Step4Review({
  formData,
  method,
  templateName,
  rooms,
}: Step4ReviewProps) {
  const totalElements = rooms.reduce((acc, r) => acc + r.items.length, 0);

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} mb={0.5}>
        Step 4: Review Survey Specification
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Verify survey properties, scheduled surveyor, and inspection rooms before creating the survey scope.
      </Typography>

      <Grid container spacing={3}>
        {/* Survey Details Summary Card */}
        <Grid size={{ xs: 12, md: 6 }}>
          <BlankCard sx={{ height: "100%" }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="subtitle1" fontWeight={700} mb={2}>
                General Information
              </Typography>

              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Survey Reference
                  </Typography>
                  <Typography variant="body1" fontWeight={700} color="primary.main">
                    {formData.reference}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Survey Title / Purpose
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {formData.title}
                  </Typography>
                </Box>

                <Divider />

                <Stack direction="row" spacing={1.5} alignItems="center">
                  <IconBuilding size={18} color="#64748b" />
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      Project
                    </Typography>
                    <Typography variant="body2">
                      {formData.projectName || `Project #${formData.projectId}`}
                    </Typography>
                  </Box>
                </Stack>

                <Stack direction="row" spacing={1.5} alignItems="center">
                  <IconMapPin size={18} color="#64748b" />
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      Property Address
                    </Typography>
                    <Typography variant="body2">
                      {formData.propertyName || `Address #${formData.addressId}`}
                    </Typography>
                  </Box>
                </Stack>

                <Stack direction="row" spacing={1.5} alignItems="center">
                  <IconUser size={18} color="#64748b" />
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      Assigned Surveyor
                    </Typography>
                    <Typography variant="body2">
                      {formData.surveyorName || `Surveyor #${formData.surveyorId}`}
                    </Typography>
                  </Box>
                </Stack>

                <Stack direction="row" spacing={1.5} alignItems="center">
                  <IconCalendar size={18} color="#64748b" />
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      Scheduled Inspection Date
                    </Typography>
                    <Typography variant="body2">
                      {formData.surveyDate || "Not scheduled"}
                    </Typography>
                  </Box>
                </Stack>

                {formData.notes && (
                  <Box mt={1}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      Instructions / Notes
                    </Typography>
                    <Typography variant="body2" bgcolor="#f8fafc" p={1.5} borderRadius={1} mt={0.5}>
                      {formData.notes}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </BlankCard>
        </Grid>

        {/* Structure & Scope Summary Card */}
        <Grid size={{ xs: 12, md: 6 }}>
          <BlankCard sx={{ height: "100%" }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="subtitle1" fontWeight={700} mb={2}>
                Creation Method & Scope
              </Typography>

              <Stack spacing={2} mb={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Creation Mode
                  </Typography>
                  <Box mt={0.5}>
                    {method === "template" ? (
                      <Chip
                        icon={<IconTemplate size={16} />}
                        label={`Template: ${templateName || "Standard"}`}
                        color="primary"
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    ) : (
                      <Chip label="Blank Survey Scope" variant="outlined" size="small" />
                    )}
                  </Box>
                </Box>

                <Stack direction="row" spacing={2} pt={1}>
                  <Box p={1.5} bgcolor="#f8fafc" borderRadius={1} flex={1} textAlign="center">
                    <Typography variant="h5" fontWeight={700} color="primary.main">
                      {rooms.length}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      Total Rooms / Areas
                    </Typography>
                  </Box>
                  <Box p={1.5} bgcolor="#f8fafc" borderRadius={1} flex={1} textAlign="center">
                    <Typography variant="h5" fontWeight={700} color="secondary.main">
                      {totalElements}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      Total Elements
                    </Typography>
                  </Box>
                </Stack>
              </Stack>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
                Configured Rooms Breakdown:
              </Typography>

              <Stack spacing={1} maxHeight={280} sx={{ overflowY: "auto", pr: 0.5 }}>
                {rooms.map((room, idx) => (
                  <Accordion
                    key={room.id}
                    variant="outlined"
                    sx={{
                      "&:before": { display: "none" },
                      borderRadius: "6px !important",
                    }}
                  >
                    <AccordionSummary
                      component="div"
                      expandIcon={<IconChevronDown size={18} />}
                      sx={{ minHeight: 40, py: 0.5, bgcolor: "#fafafa" }}
                    >
                      <Stack direction="row" justifyContent="space-between" width="100%" pr={1} alignItems="center">
                        <Typography variant="body2" fontWeight={600}>
                          {idx + 1}. {room.name}
                        </Typography>
                        <Chip
                          label={`${room.items.length} elements`}
                          size="small"
                          sx={{ height: 20, fontSize: "0.7rem" }}
                        />
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails sx={{ py: 1, px: 2 }}>
                      <Stack spacing={0.5}>
                        {room.items.map((it, i) => (
                          <Typography key={it.id} variant="caption" color="text.secondary">
                            • {it.name} {it.output_unit ? `(${it.output_unit})` : ""}
                          </Typography>
                        ))}
                      </Stack>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Stack>
            </CardContent>
          </BlankCard>
        </Grid>
      </Grid>

      {/* Backend Integration Status Banner */}
      <Alert severity="success" icon={<IconCheck size={20} />} sx={{ mt: 3, borderRadius: "8px" }}>
        <Typography variant="body2">
          <strong>Review Quality Checked:</strong> All required fields are validated. Clicking <strong>Save Draft</strong> or <strong>Create & Assign</strong> will persist this survey, its rooms, and inspection elements directly into the database.
        </Typography>
      </Alert>
    </Box>
  );
}

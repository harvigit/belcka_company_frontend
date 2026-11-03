"use client";

import React, { useMemo } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Stack,
  Chip,
  Radio,
  CircularProgress,
  Divider,
} from "@mui/material";
import {
  IconTemplate,
  IconFilePlus,
  IconCheck,
  IconFolder,
  IconLayersIntersect,
} from "@tabler/icons-react";
import {
  SurveyCreationMethod,
  SurveyTemplateOption,
  SurveyGroupOption,
} from "../../types";

interface Step2TemplateProps {
  method: SurveyCreationMethod;
  setMethod: (method: SurveyCreationMethod) => void;
  selectedTemplateId: number | null;
  onSelectTemplate: (templateId: number | null) => void;
  templates: SurveyTemplateOption[];
  groups: SurveyGroupOption[];
  loadingTemplates: boolean;
}

export default function Step2Template({
  method,
  setMethod,
  selectedTemplateId,
  onSelectTemplate,
  templates,
  groups,
  loadingTemplates,
}: Step2TemplateProps) {
  // Create a map of groupId -> element count for quick count calculation
  const groupElementsMap = useMemo(() => {
    const map = new Map<number, number>();
    groups.forEach((g) => {
      map.set(g.id, g.elements ? g.elements.length : 0);
    });
    return map;
  }, [groups]);

  // Calculate total elements in a template
  const getTemplateTotalElements = (template: SurveyTemplateOption) => {
    if (!template.groups || !template.groups.length) return 0;
    return template.groups.reduce((acc, g) => {
      const count = groupElementsMap.get(g.id) || 0;
      return acc + count;
    }, 0);
  };

  if (loadingTemplates) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" py={8}>
        <Stack spacing={2} alignItems="center">
          <CircularProgress size={36} />
          <Typography variant="body2" color="text.secondary">
            Loading survey templates from settings library...
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} mb={0.5}>
        Step 2: Choose Survey Creation Method
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Pick an existing Survey Template from your settings library or start with a blank property scope.
      </Typography>

      <Grid container spacing={3}>
        {/* Method Selection: Option A vs Option B Header Cards */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            variant="outlined"
            sx={{
              borderWidth: 2,
              borderColor: method === "template" ? "primary.main" : "divider",
              bgcolor: method === "template" ? "primary.lighter" : "background.paper",
              transition: "all 0.2s ease-in-out",
            }}
          >
            <CardActionArea
              onClick={() => {
                setMethod("template");
                if (!selectedTemplateId && templates.length > 0) {
                  onSelectTemplate(templates[0].id);
                }
              }}
              sx={{ p: 2.5 }}
            >
              <Stack direction="row" alignItems="center" spacing={2}>
                <Radio
                  checked={method === "template"}
                  value="template"
                  name="creation-method"
                />
                <Box>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <IconTemplate size={20} color="#5D87FF" />
                    <Typography variant="subtitle1" fontWeight={700}>
                      Option A: Choose Template
                    </Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary" mt={0.5}>
                    Preload standard rooms, areas, and element scopes configured in Survey Settings.
                  </Typography>
                </Box>
              </Stack>
            </CardActionArea>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            variant="outlined"
            sx={{
              borderWidth: 2,
              borderColor: method === "blank" ? "primary.main" : "divider",
              bgcolor: method === "blank" ? "primary.lighter" : "background.paper",
              transition: "all 0.2s ease-in-out",
            }}
          >
            <CardActionArea
              onClick={() => {
                setMethod("blank");
                onSelectTemplate(null);
              }}
              sx={{ p: 2.5 }}
            >
              <Stack direction="row" alignItems="center" spacing={2}>
                <Radio
                  checked={method === "blank"}
                  value="blank"
                  name="creation-method"
                />
                <Box>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <IconFilePlus size={20} color="#5D87FF" />
                    <Typography variant="subtitle1" fontWeight={700}>
                      Option B: Blank Survey
                    </Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary" mt={0.5}>
                    Start from an empty scope. Build rooms/areas and add elements manually.
                  </Typography>
                </Box>
              </Stack>
            </CardActionArea>
          </Card>
        </Grid>
      </Grid>

      {/* When Option A is selected: display template cards */}
      {method === "template" && (
        <Box mt={4}>
          <Typography variant="subtitle1" fontWeight={700} mb={1}>
            Available Templates ({templates.length})
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2.5}>
            Select a template below to automatically populate rooms and elements in Step 3.
          </Typography>

          <Grid container spacing={2.5}>
            {templates.map((tpl) => {
              const isSelected = selectedTemplateId === tpl.id;
              const totalElements = getTemplateTotalElements(tpl);

              return (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={tpl.id}>
                  <Card
                    variant="outlined"
                    sx={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      borderWidth: isSelected ? 2 : 1,
                      borderColor: isSelected ? "primary.main" : "divider",
                      boxShadow: isSelected ? "0 4px 14px rgba(93, 135, 255, 0.15)" : "none",
                      transition: "all 0.2s ease-in-out",
                      "&:hover": {
                        borderColor: "primary.main",
                      },
                    }}
                  >
                    <CardActionArea
                      onClick={() => onSelectTemplate(tpl.id)}
                      sx={{ p: 2.5, height: "100%", display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "space-between" }}
                    >
                      <Box width="100%">
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                          <Typography variant="subtitle1" fontWeight={700} color={isSelected ? "primary.main" : "text.primary"}>
                            {tpl.name}
                          </Typography>
                          {isSelected && (
                            <Chip
                              icon={<IconCheck size={14} />}
                              label="Selected"
                              color="primary"
                              size="small"
                              sx={{ fontWeight: 600 }}
                            />
                          )}
                        </Stack>

                        <Stack direction="row" spacing={2} my={1.5}>
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            <IconFolder size={16} color="#666" />
                            <Typography variant="caption" color="text.secondary" fontWeight={600}>
                              {tpl.groups?.length || 0} Areas
                            </Typography>
                          </Stack>
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            <IconLayersIntersect size={16} color="#666" />
                            <Typography variant="caption" color="text.secondary" fontWeight={600}>
                              {totalElements} Elements
                            </Typography>
                          </Stack>
                        </Stack>

                        <Divider sx={{ my: 1.5 }} />

                        <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.75}>
                          Included Groups:
                        </Typography>
                        <Stack direction="row" flexWrap="wrap" gap={0.75}>
                          {tpl.groups && tpl.groups.length > 0 ? (
                            tpl.groups.map((g) => (
                              <Chip
                                key={g.id}
                                label={g.name}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: "0.72rem" }}
                              />
                            ))
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              No groups linked
                            </Typography>
                          )}
                        </Stack>
                      </Box>
                    </CardActionArea>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      {/* When Option B is selected: informative banner */}
      {method === "blank" && (
        <Box mt={3} p={3} bgcolor="#f8fafc" borderRadius={2} border="1px dashed #cbd5e1">
          <Typography variant="subtitle2" fontWeight={600} color="text.primary" mb={0.5}>
            Blank Survey Mode Active
          </Typography>
          <Typography variant="body2" color="text.secondary">
            In the next step (Configure Rooms & Elements), you can freely add custom rooms or choose from standard survey groups, and add any elements from the library.
          </Typography>
        </Box>
      )}
    </Box>
  );
}

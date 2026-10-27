"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Button,
  IconButton,
  Stack,
  Card,
  CardContent,
  CircularProgress,
} from "@mui/material";
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconDeviceFloppy,
} from "@tabler/icons-react";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import useSurveyAccess from "../useSurveyAccess";
import {
  Survey,
  SurveyCreationMethod,
  SurveyProjectOption,
  SurveyAddressOption,
  SurveyorOption,
  SurveyTemplateOption,
  SurveyGroupOption,
  SurveyElementOption,
  SurveyRoom,
} from "../types";
import Step1Details from "./steps/Step1Details";
import Step2Template from "./steps/Step2Template";
import Step3Configure from "./steps/Step3Configure";
import Step4Review from "./steps/Step4Review";

const steps = [
  "Survey Details",
  "Creation Method",
  "Configure Rooms & Elements",
  "Review & Finish",
];

export default function CreateSurveyWizard() {
  const router = useRouter();
  const access = useSurveyAccess();

  const [activeStep, setActiveStep] = useState(0);

  // Resources state from APIs
  const [loadingResources, setLoadingResources] = useState(true);
  const [projects, setProjects] = useState<SurveyProjectOption[]>([]);
  const [addresses, setAddresses] = useState<SurveyAddressOption[]>([]);
  const [surveyors, setSurveyors] = useState<SurveyorOption[]>([]);
  const [templates, setTemplates] = useState<SurveyTemplateOption[]>([]);
  const [groups, setGroups] = useState<SurveyGroupOption[]>([]);
  const [elements, setElements] = useState<SurveyElementOption[]>([]);

  // Step 1 Form Data
  const [formData, setFormData] = useState({
    reference: "",
    title: "",
    projectId: null as number | null,
    addressId: null as number | null,
    surveyorId: null as number | null,
    surveyDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  // Step 2 Creation Method Data
  const [method, setMethod] = useState<SurveyCreationMethod>("template");
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);

  // Step 3 Rooms & Elements Data
  const [rooms, setRooms] = useState<SurveyRoom[]>([]);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Load all required API data on mount
  useEffect(() => {
    const fetchAllData = async () => {
      setLoadingResources(true);
      try {
        const [resExpense, resUsers, resTemplates, resGroups, resElements] =
          await Promise.allSettled([
            api.get("/expense/get-resources"),
            api.get("surveys/assignable-users"),
            api.get("/survey-templates/get"),
            api.get("/survey-groups/get"),
            api.get("/survey-elements/get"),
          ]);

        // Projects & Addresses
        if (resExpense.status === "fulfilled" && resExpense.value.data) {
          const rawProjects = resExpense.value.data.projects || [];
          const rawAddresses = resExpense.value.data.addresses || [];
          setProjects(rawProjects.map((p: any) => ({ id: p.id, name: p.name })));
          setAddresses(
            rawAddresses.map((a: any) => ({
              id: a.id,
              project_id: a.project_id,
              name: a.name,
              parentAddress: a.parentAddress,
            })),
          );
        }

        // Surveyors / Users
        if (resUsers.status === "fulfilled" && resUsers.value.data) {
          const rawUsers = resUsers.value.data.info || [];
          setSurveyors(
            rawUsers.map((u: any) => ({
              id: u.id,
              name: `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email || `User #${u.id}`,
              email: u.email,
            })),
          );
        }

        // Survey Templates
        let loadedTemplates: SurveyTemplateOption[] = [];
        if (resTemplates.status === "fulfilled" && resTemplates.value.data) {
          const rawTemplates = Array.isArray(resTemplates.value.data.info)
            ? resTemplates.value.data.info
            : [];
          loadedTemplates = rawTemplates.filter((t: any) => t.status);
          setTemplates(loadedTemplates);
          if (loadedTemplates.length > 0) {
            setSelectedTemplateId(loadedTemplates[0].id);
          }
        }

        // Survey Groups (with nested elements)
        let loadedGroups: SurveyGroupOption[] = [];
        if (resGroups.status === "fulfilled" && resGroups.value.data) {
          const rawGroups = Array.isArray(resGroups.value.data.info)
            ? resGroups.value.data.info
            : [];
          loadedGroups = rawGroups.filter((g: any) => g.status);
          setGroups(loadedGroups);
        }

        // Survey Elements
        if (resElements.status === "fulfilled" && resElements.value.data) {
          const rawElements = Array.isArray(resElements.value.data.info)
            ? resElements.value.data.info
            : [];
          setElements(rawElements);
        }

        // If templates and groups exist, populate default rooms from first template
        if (loadedTemplates.length > 0 && loadedGroups.length > 0) {
          const firstTpl = loadedTemplates[0];
          instantiateRoomsFromTemplate(firstTpl, loadedGroups);
        }
      } catch (err) {
        console.error("Failed to fetch wizard data", err);
        toast.error("Failed to load survey resources");
      } finally {
        setLoadingResources(false);
      }
    };

    void fetchAllData();
  }, []);

  // Instantiate rooms from a template and groups library
  const instantiateRoomsFromTemplate = (
    template: SurveyTemplateOption,
    groupsList: SurveyGroupOption[],
  ) => {
    if (!template.groups || template.groups.length === 0) {
      setRooms([]);
      return;
    }

    const instantiated: SurveyRoom[] = template.groups.map((g, idx) => {
      const fullGroup = groupsList.find((grp) => grp.id === g.id);
      return {
        id: `room-${Date.now()}-${idx}`,
        name: g.name,
        group_id: g.id,
        sort_order: idx,
        items: (fullGroup?.elements || []).map((el, elIdx) => ({
          id: `item-${Date.now()}-${idx}-${elIdx}`,
          element_id: el.id,
          name: el.name,
          output_unit: el.output_unit,
        })),
      };
    });

    setRooms(instantiated);
  };

  // When a user selects a template in Step 2
  const handleSelectTemplate = (templateId: number | null) => {
    setSelectedTemplateId(templateId);
    if (!templateId) {
      setRooms([]);
      return;
    }
    const tpl = templates.find((t) => t.id === templateId);
    if (tpl) {
      instantiateRoomsFromTemplate(tpl, groups);
    }
  };

  // Step validation
  const validateStep = (step: number): boolean => {
    const errs: Record<string, string> = {};

    if (step === 0) {
      if (!formData.title.trim()) errs.title = "Survey title is required";
      if (!formData.projectId) errs.projectId = "Project is required";
      if (!formData.addressId) errs.addressId = "Property address is required";
      if (!formData.surveyorId) errs.surveyorId = "Surveyor is required";
      if (!formData.surveyDate) errs.surveyDate = "Survey date is required";
    } else if (step === 1) {
      if (method === "template" && !selectedTemplateId) {
        toast.error("Please select a template to continue");
        return false;
      }
    } else if (step === 2) {
      if (rooms.length === 0) {
        toast.error("Please add at least one room or area to the survey");
        return false;
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (!validateStep(activeStep)) return;
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  // Create & Save Survey
  const handleSaveSurvey = async (status: "draft" | "assigned" = "draft") => {
    setSubmitting(true);
    try {
      const payload = {
        reference: formData.reference.trim() || undefined,
        title: formData.title.trim(),
        project_id: formData.projectId,
        address_id: formData.addressId,
        surveyor_id: formData.surveyorId,
        survey_date: formData.surveyDate,
        creation_method: method,
        template_id: method === "template" ? selectedTemplateId : null,
        status: status,
        notes: formData.notes.trim() || undefined,
        rooms: rooms.map((r, rIdx) => ({
          group_id: r.group_id,
          name: r.name,
          sort_order: rIdx,
          notes: r.notes,
          items: (r.items || []).map((i, iIdx) => ({
            element_id: i.element_id,
            name: i.name,
            output_unit: i.output_unit,
            dimension_1_name: i.dimension_1_name,
            dimension_1_unit: i.dimension_1_unit,
            dimension_1_value: i.dimension_1_value,
            dimension_2_name: i.dimension_2_name,
            dimension_2_unit: i.dimension_2_unit,
            dimension_2_value: i.dimension_2_value,
            dimension_3_name: i.dimension_3_name,
            dimension_3_unit: i.dimension_3_unit,
            dimension_3_value: i.dimension_3_value,
            dimension_4_name: i.dimension_4_name,
            dimension_4_unit: i.dimension_4_unit,
            dimension_4_value: i.dimension_4_value,
            calculated_qty: i.calculated_qty,
            condition_score: i.condition_score,
            repair_action: i.repair_action,
            notes: i.notes,
            sort_order: iIdx,
          })),
        })),
      };

      const res = await api.post("surveys/create", payload);
      if (res.data?.IsSuccess) {
        toast.success(
          status === "assigned"
            ? "Survey created and assigned to surveyor!"
            : "Survey draft created successfully!",
        );
        const createdId = res.data.data?.id || res.data.info?.id;
        router.push(`/apps/surveys/view/${createdId}`);
      } else {
        toast.error(res.data?.message || "Failed to create survey");
      }
    } catch (err: any) {
      console.error("Failed to save survey", err);
      toast.error(err?.response?.data?.message || "Failed to save survey");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  const selectedProject = projects.find((p) => p.id === formData.projectId);
  const selectedAddress = addresses.find((a) => a.id === formData.addressId);
  const selectedSurveyor = surveyors.find((s) => s.id === formData.surveyorId);

  if (!access.loaded) {
    return (
      <Box sx={{ p: 6, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!access.is_admin) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Alert severity={access.failed ? "warning" : "info"} sx={{ mb: 2 }}>
          {access.failed ? "Couldn't verify your survey permissions. Refresh the page to try again." : "Only company administrators can create surveys."}
        </Alert>
        <Button variant="contained" onClick={() => router.push("/apps/surveys/list")}>
          Back to Surveys
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
        <IconButton
          onClick={() => router.push("/apps/surveys/list")}
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: "8px",
          }}
          aria-label="Back to surveys"
        >
          <IconArrowLeft size={20} />
        </IconButton>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Create Survey
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure inspection details, load reusable templates, and prepare the site survey scope.
          </Typography>
        </Box>
      </Stack>

      {/* Stepper */}
      <Card variant="outlined" sx={{ mb: 4 }}>
        <CardContent sx={{ py: 3 }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      {/* Step Content */}
      <Card variant="outlined" sx={{ mb: 4 }}>
        <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
          {activeStep === 0 && (
            <Step1Details
              formData={formData}
              setFormData={setFormData}
              projects={projects}
              addresses={addresses}
              surveyors={surveyors}
              loadingResources={loadingResources}
              errors={errors}
            />
          )}

          {activeStep === 1 && (
            <Step2Template
              method={method}
              setMethod={setMethod}
              selectedTemplateId={selectedTemplateId}
              onSelectTemplate={handleSelectTemplate}
              templates={templates}
              groups={groups}
              loadingTemplates={loadingResources}
            />
          )}

          {activeStep === 2 && (
            <Step3Configure
              rooms={rooms}
              setRooms={setRooms}
              availableGroups={groups}
              availableElements={elements}
              templateName={selectedTemplate?.name}
              isTemplateMode={method === "template"}
            />
          )}

          {activeStep === 3 && (
            <Step4Review
              formData={{
                ...formData,
                projectName: selectedProject?.name,
                propertyName: selectedAddress?.name,
                surveyorName: selectedSurveyor?.name,
              }}
              method={method}
              templateName={selectedTemplate?.name}
              rooms={rooms}
            />
          )}
        </CardContent>
      </Card>

      {/* Bottom Step Actions */}
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Button
          variant="outlined"
          startIcon={<IconArrowLeft size={18} />}
          disabled={activeStep === 0 || submitting}
          onClick={handleBack}
        >
          Previous
        </Button>

        <Stack direction="row" spacing={1.5}>
          {activeStep === 3 && (
            <Button
              variant="outlined"
              color="primary"
              startIcon={<IconDeviceFloppy size={18} />}
              disabled={submitting}
              onClick={() => handleSaveSurvey("draft")}
            >
              Save as Draft
            </Button>
          )}

          {activeStep < 3 ? (
            <Button
              variant="contained"
              color="primary"
              endIcon={<IconArrowRight size={18} />}
              onClick={handleNext}
            >
              Continue
            </Button>
          ) : (
            <Button
              variant="contained"
              color="primary"
              startIcon={<IconCheck size={18} />}
              disabled={submitting}
              onClick={() => handleSaveSurvey("assigned")}
            >
              {submitting ? "Creating Survey..." : "Create Survey"}
            </Button>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}

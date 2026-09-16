"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Box, IconButton, Stack, Tab, Tabs, Typography } from "@mui/material";
import {
  IconArrowLeft,
  IconBriefcase,
  IconChartPie,
  IconCoinRupee,
  IconPackage,
  IconReceipt,
  IconReorder,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import api from "@/utils/axios";
import Overview from "./Overview";
import Materials from "./Materials";
import Labour from "./Labour";
import InternalOrders from "./InternalOrders";
import ExpenseList from "@/app/components/apps/expenses/list";
import PriceworkList from "@/app/components/apps/priceworks/list";
import CasesList from "@/app/components/apps/cases/list";
import ProjectSettingsTab from "./Settings";
import { ProjectDetailFiltersProvider } from "./ProjectDetailFiltersContext";
import MapGantt from "../../projects/zone-map/MapGantt";
import { IconMapPin } from "@tabler/icons-react";

const TABS = [
  { key: "overview", label: "Overview", icon: IconChartPie },
  { key: "cases", label: "Cases", icon: IconBriefcase },
  { key: "expenses", label: "Expenses", icon: IconReceipt },
  { key: "pricework", label: "Pricework", icon: IconCoinRupee },
  { key: "materials", label: "Materials", icon: IconPackage },
  { key: "labour", label: "Labour", icon: IconUsers },
  { key: "internal-orders", label: "Internal Orders", icon: IconReorder },
  // {
  //   key: "assigned-materials",
  //   label: "Assigned Materials",
  //   icon: IconUsers,
  // },
  // { key: "client-invoice", label: "Client Invoice", icon: IconFileInvoice },
  // { key: "subcon-inv", label: "Subcon Inv", icon: IconFileInvoice },
  // { key: "supplier-inv", label: "Supplier Inv", icon: IconTruck },
  { key: "map", label: "Map", icon: IconMapPin },
  { key: "settings", label: "Settings", icon: IconSettings },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const ProjectDetail = () => {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const session = useSession();
  const user = session.data?.user as User & {
    company_id?: number | null;
    user_role_id?: number | null;
  };
  const projectId = Number(params?.id || 0);
  const requestedTab = (searchParams?.get("tab") as TabKey) || "overview";
  const [tab, setTab] = useState<TabKey>(
    TABS.some((item) => item.key === requestedTab) ? requestedTab : "overview",
  );
  const [projectName, setProjectName] = useState("Project");
  const [canViewSettings, setCanViewSettings] = useState(
    Number(user?.user_role_id) === 1,
  );
  const [settingsAccessLoaded, setSettingsAccessLoaded] = useState(false);

  useEffect(() => {
    const loadSettingsAccess = async () => {
      if (!projectId || !user?.company_id) return;
      try {
        const res = await api.get(
          `project/get?company_id=${user.company_id}&project_id=${projectId}`,
        );
        const projectRow = Array.isArray(res.data?.info)
          ? res.data.info[0]
          : res.data?.info;
        const isAdmin = Number(user.user_role_id) === 1;
        const assigned = (projectRow?.setting_users || []).some(
          (item: { id: number }) => Number(item.id) === Number(user.id),
        );
        setCanViewSettings(
          Boolean(projectRow?.can_view_settings) || isAdmin || assigned,
        );
      } catch (error) {
        console.error("Failed to load project settings access", error);
        setCanViewSettings(Number(user.user_role_id) === 1);
      } finally {
        setSettingsAccessLoaded(true);
      }
    };
    loadSettingsAccess();
  }, [projectId, user?.company_id, user?.id, user?.user_role_id]);

  const visibleTabs = useMemo(
    () =>
      TABS.filter((item) => item.key !== "settings" || canViewSettings),
    [canViewSettings],
  );

  useEffect(() => {
    if (!settingsAccessLoaded) return;
    if (tab === "settings" && !canViewSettings) {
      setTab("overview");
    }
  }, [tab, canViewSettings, settingsAccessLoaded]);

  const content = useMemo(() => {
    if (!projectId) return null;
    switch (tab) {
      case "overview":
        return (
          <Overview
            projectId={projectId}
            onProjectName={setProjectName}
            onNavigateTab={(next) => setTab(next as TabKey)}
          />
        );
      case "cases":
        return <CasesList projectId={projectId} />;
      case "expenses":
        return <ExpenseList projectId={projectId} />;
      case "pricework":
        return <PriceworkList projectId={projectId} />;
      case "materials":
        return <Materials projectId={projectId} />;
      case "labour":
        return <Labour projectId={projectId} />;
      case "internal-orders":
        return <InternalOrders projectId={projectId} />;
      case "map":
        return (
          <MapGantt
            open
            hideClose
            projectId={projectId}
            companyId={user?.company_id ?? null}
            projectScopeOnly
            hideAddZone
          />
        );
      case "settings":
        return canViewSettings ? (
          <ProjectSettingsTab
            projectId={projectId}
            onProjectName={setProjectName}
          />
        ) : null;
      default:
        return null;
    }
  }, [tab, projectId, canViewSettings, user?.company_id]);

  const isTableTab =
    tab === "cases" ||
    tab === "expenses" ||
    tab === "pricework" ||
    tab === "materials" ||
    tab === "labour" ||
    tab === "internal-orders";

  const tabValue = visibleTabs.some((item) => item.key === tab)
    ? tab
    : "overview";

  return (
    <ProjectDetailFiltersProvider projectId={projectId}>
    <Box
      sx={{
        height: "calc(100vh - 100px)",
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        overflow: "hidden",
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        px={{ xs: 1.5, md: 2 }}
        pt={1.5}
        pb={0.5}
        sx={{ flexShrink: 0 }}
      >
        <IconButton onClick={() => router.push("/apps/project/list")}>
          <IconArrowLeft size={20} />
        </IconButton>
        <Typography fontWeight={700} noWrap>
          {projectName}
        </Typography>
      </Stack>

      <Box
        sx={{
          borderBottom: "1px solid",
          borderColor: "divider",
          px: { xs: 0.5, md: 1 },
          flexShrink: 0,
        }}
      >
        <Tabs
          value={tabValue}
          onChange={(_, value: TabKey) => {
            setTab(value);
          }}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            minHeight: { xs: 56, md: 64 },
            "& .MuiTabs-flexContainer": { gap: { xs: 0, md: 0.5 } },
            "& .MuiTabs-indicator": { height: 3, bgcolor: "primary.main" },
            "& .MuiTab-root": {
              minHeight: { xs: 56, md: 64 },
              minWidth: { xs: 72, sm: 88 },
              px: { xs: 1, sm: 1.5 },
              textTransform: "none",
              fontSize: { xs: 11, sm: 12 },
              fontWeight: 500,
              color: "text.secondary",
              "&.Mui-selected": { color: "primary.main", fontWeight: 700 },
            },
          }}
        >
          {visibleTabs.map((item) => {
            const Icon = item.icon;
            return (
              <Tab
                key={item.key}
                value={item.key}
                icon={<Icon size={18} />}
                iconPosition="top"
                label={item.label}
                disableRipple
              />
            );
          })}
        </Tabs>
      </Box>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          overflow: isTableTab ? "hidden" : "auto",
          display: "flex",
          flexDirection: "column",
          ...(isTableTab
            ? {
                "& > *": {
                  flex: 1,
                  minHeight: 0,
                  height: "100%",
                },
              }
            : {}),
        }}
      >
        {content}
      </Box>
    </Box>
    </ProjectDetailFiltersProvider>
  );
};

export default ProjectDetail;

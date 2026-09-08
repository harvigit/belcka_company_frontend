"use client";
import React, { useMemo, useState } from "react";
import { Box, IconButton, Stack, Tab, Tabs, Typography } from "@mui/material";
import {
  IconArrowLeft,
  IconBriefcase,
  IconChartPie,
  IconCoinRupee,
  IconFileInvoice,
  IconPackage,
  IconReceipt,
  IconReorder,
  IconSettings,
  IconTruck,
  IconUsers,
} from "@tabler/icons-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Overview from "./Overview";
import Materials from "./Materials";
import InternalOrders from "./InternalOrders";
import ExpenseList from "@/app/components/apps/expenses/list";
import PriceworkList from "@/app/components/apps/priceworks/list";
import CasesList from "@/app/components/apps/cases/list";

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
  { key: "settings", label: "Settings", icon: IconSettings },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const ProjectDetail = () => {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = Number(params?.id || 0);
  const requestedTab = (searchParams?.get("tab") as TabKey) || "overview";
  const initialTab =
    requestedTab === "settings" ||
    !TABS.some((item) => item.key === requestedTab)
      ? "overview"
      : requestedTab;
  const [tab, setTab] = useState<TabKey>(initialTab);
  const [projectName, setProjectName] = useState("Project");
  const [settingOpen, setSettingOpen] = useState(false);

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
        case "internal-orders":
          return <InternalOrders projectId={projectId} />;
      case "labour":
      // case "assigned-materials":
      // case "client-invoice":
      // case "subcon-inv":
      // case "supplier-inv":
      // case "settings":
      // return (
      //   <Box p={2}>
      //     <Typography color="text.secondary" mb={2}>
      //       Project settings
      //     </Typography>
      //   </Box>
      // );
      default:
        return null;
    }
  }, [tab, projectId]);

  const isTableTab =
    tab === "cases" ||
    tab === "expenses" ||
    tab === "pricework" ||
    tab === "materials" ||
    tab === "internal-orders";

  return (
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
          value={tab}
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
          {TABS.map((item) => {
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
  );
};

export default ProjectDetail;

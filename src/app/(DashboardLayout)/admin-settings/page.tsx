"use client";

import * as React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import Breadcrumb from "@/app/(DashboardLayout)/layout/shared/breadcrumb/Breadcrumb";
import {
  Grid,
  Tabs,
  Tab,
  Box,
  CardContent,
  Divider,
  Stack,
} from "@mui/material";

import ArchiveTeams from "@/app/components/apps/teams/archive/index";
import { IconUserCircle, IconUsersMinus } from "@tabler/icons-react";
import BlankCard from "@/app/components/shared/BlankCard";

const BCrumb = [
  {
    to: "/",
    title: "Home",
  },
  {
    title: "Account Setting",
  },
];

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`vertical-tabpanel-${index}`}
      aria-labelledby={`vertical-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `vertical-tab-${index}`,
    "aria-controls": `vertical-tabpanel-${index}`,
  };
}

const AdminSetting = () => {
  const [value, setValue] = React.useState(0);

  const handleChange = (_: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <PageContainer
      title="Account Setting"
      description="This is Account Setting"
    >
      {/* <Breadcrumb title="Account Setting" items={BCrumb} /> */}

      <Grid container spacing={3}>
        {/* <Grid item xs={12}> */}
        <BlankCard>
          <Stack direction="row">
            {/* Left Tabs */}
            {/* <Tabs
              orientation="vertical"
              variant="scrollable"
              value={value}
              onChange={handleChange}
            >
              <Tab
                iconPosition="start"
                icon={<IconUsersMinus size="20" />}
                label="Archived teams"
                {...a11yProps(0)}
              />
            </Tabs> */}

            {/* <CardContent sx={{ flex: 1 }}>
              <TabPanel value={value} index={0}>
                <ArchiveTeams />
              </TabPanel>
            </CardContent> */}
          </Stack>
        </BlankCard>
        {/* </Grid> */}
      </Grid>
    </PageContainer>
  );
};

export default AdminSetting;

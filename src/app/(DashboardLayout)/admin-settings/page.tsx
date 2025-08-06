"use client";

import * as React from "react";
import PageContainer from "@/app/components/container/PageContainer";
import { Grid, Tabs, Tab, Box, Stack } from "@mui/material";

import CreateWork from "@/app/components/apps/settings/tasks/list";
import LocationList from "@/app/components/apps/settings/locations/list";
import { IconPlus } from "@tabler/icons-react";
import BlankCard from "@/app/components/shared/BlankCard";

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
      <Grid container spacing={1}>
        <Grid
          container
          display={"flex"}
          size={{
            xs: 12,
            lg: 12,
          }}
        >
          <Grid
            size={{
              xs: 12,
              lg: 2,
            }}
          >
            <BlankCard className="tab-balnkcard">
              <Stack direction="row" mt={3} ml={2} mb={3}>
                <Tabs
                  className="admin-settings-tabs"
                  orientation="vertical"
                  variant="scrollable"
                  value={value}
                  onChange={handleChange}
                >
                  <Tab
                    className="admin-settings"
                    color="textSecondary"
                    iconPosition="start"
                    icon={<IconPlus size="20" />}
                    label="Templates"
                    {...a11yProps(0)}
                  />
                  <Tab
                    className="admin-settings"
                    iconPosition="start"
                    icon={<IconPlus size="20" />}
                    label="Locations"
                    {...a11yProps(1)}
                  />
                </Tabs>
              </Stack>
            </BlankCard>
          </Grid>
          <Grid
            display={"flex"}
            size={{
              xs: 12,
              lg: 10,
            }}
          >
            <BlankCard>
              <TabPanel value={value} index={0}>
                <CreateWork />
              </TabPanel>
              <TabPanel value={value} index={1}>
                <LocationList />
              </TabPanel>
            </BlankCard>
          </Grid>
        </Grid>
      </Grid>
    </PageContainer>
  );
};

export default AdminSetting;

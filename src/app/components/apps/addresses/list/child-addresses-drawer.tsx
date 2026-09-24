"use client";
import React from "react";
import { Box, Drawer } from "@mui/material";
import AddressesList from "./addresses-list";

type ChildAddressesDrawerProps = {
  open: boolean;
  onClose: () => void;
  projectId: number | null;
  parentAddressId: number | null;
  projects: any[];
};

const ChildAddressesDrawer: React.FC<ChildAddressesDrawerProps> = ({
  open,
  onClose,
  projectId,
  parentAddressId,
  projects,
}) => (
  <Drawer
    anchor="bottom"
    open={open}
    onClose={onClose}
    PaperProps={{
      sx: {
        height: "90vh",
        backgroundColor: "#fff",
        borderRadius: "20px 20px 0 0",
      },
    }}
  >
    <Box p={3} sx={{ height: "100%", overflowY: "auto" }}>
      {projectId && parentAddressId && (
        <AddressesList
          projectId={projectId}
          onSelectionChange={() => {}}
          processedIds={[]}
          shouldRefresh={false}
          onTableReady={() => {}}
          parentAddressId={parentAddressId}
          projects={projects}
          onClose={onClose}
        />
      )}
    </Box>
  </Drawer>
);

export default ChildAddressesDrawer;

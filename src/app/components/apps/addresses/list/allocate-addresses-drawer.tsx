import React, { useEffect, useState } from "react";
import {
  Drawer,
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Autocomplete,
  Paper,
  IconButton,
} from "@mui/material";
import api from "@/utils/axios";
import toast from "react-hot-toast";
import { IconArrowLeft } from "@tabler/icons-react";

interface AllocateAddressesDrawerProps {
  open: boolean;
  onClose: () => void;
  selectedAddresses: any[];
  projects: any[];
  companyId: number | null | undefined;
  onSuccess?: () => void;
}

const AllocateAddressesDrawer: React.FC<AllocateAddressesDrawerProps> = ({
  open,
  onClose,
  selectedAddresses,
  projects,
  companyId,
  onSuccess,
}) => {
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [addressData, setAddressData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setAddressData((prev) =>
        selectedAddresses.map((addr) => {
          const existing = prev.find((item) => item.address_id === addr.id);

          const projStr = selectedProject?.name || "";
          const projPrefix = projStr
            ? projStr.substring(0, 3).toUpperCase() + "-"
            : "";
          const addrPrefix = addr.name
            ? addr.name.substring(0, 3).toUpperCase() + "-"
            : "";

          let generatedCaseId = existing?.generatedCaseId;
          if (
            !generatedCaseId ||
            existing?.lastProject !== selectedProject?.id
          ) {
            const randomSuffix = Math.random()
              .toString(36)
              .substring(2, 7)
              .toUpperCase();
            generatedCaseId = `${projPrefix}${addrPrefix}${randomSuffix}`;
          }

          return {
            address_id: addr.id,
            name: addr.name,
            case_id: existing?.isManual ? existing.case_id : generatedCaseId,
            reference: existing?.reference || "",
            isManual: existing?.isManual || false,
            generatedCaseId,
            lastProject: selectedProject?.id,
          };
        }),
      );
    } else {
      setAddressData([]);
      setSelectedProject(null);
    }
  }, [open, selectedAddresses, selectedProject]);

  const handleInputChange = (id: number, field: string, value: string) => {
    setAddressData((prev) =>
      prev.map((item) =>
        item.address_id === id
          ? {
              ...item,
              [field]: value,
              ...(field === "case_id" ? { isManual: true } : {}),
            }
          : item,
      ),
    );
  };

  const handleSave = async () => {
    setLoading(true);
    if (!selectedProject) {
      toast.error("Please select a project.");
      return;
    }

    const payload = {
      company_id: companyId,
      project_id: selectedProject.id,
      address_data: addressData.map((item) => ({
        case_id: item.case_id,
        reference: item.reference,
        address_id: item.address_id,
      })),
    };

    try {
      const res = await api.post("address/allocate", payload);
      if (res.data.IsSuccess) {
        toast.success(res.data.message || "Cases allocated successfully");
        onSuccess?.();
        onClose();
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
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
      <Box
        p={4}
        pb={1}
        pt={2}
        sx={{ height: "100%", display: "flex", flexDirection: "column" }}
      >
        <Box display="flex" alignItems="center" flexWrap="wrap" mb={2}>
          <IconButton onClick={onClose}>
            <IconArrowLeft />
          </IconButton>
          <Typography variant="h6" color="inherit" fontWeight={700}>
            Allocate Cases
          </Typography>
        </Box>
        <Box mb={2} width={"20%"}>
          <Autocomplete
            options={projects}
            getOptionLabel={(option) => option.name || ""}
            value={selectedProject}
            onChange={(e, newValue) => setSelectedProject(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select Project"
                variant="outlined"
              />
            )}
          />
        </Box>

        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{ flexGrow: 1, overflowY: "auto" }}
        >
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: "bold" }}>Case Id</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Address</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Ref</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {addressData.map((row) => (
                <TableRow key={row.address_id}>
                  {/* <TableCell>
                    <TextField
                      size="small"
                      placeholder="Case Id"
                      disabled
                      value={row.case_id}
                      onChange={(e) =>
                        handleInputChange(
                          row.address_id,
                          "case_id",
                          e.target.value,
                        )
                      }
                      fullWidth
                    />
                  </TableCell> */}
                  <TableCell>{row.case_id}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      placeholder="Reference"
                      inputProps={{ style: { textAlign: "left" } }}
                      value={row.reference}
                      onChange={(e) =>
                        handleInputChange(
                          row.address_id,
                          "reference",
                          e.target.value,
                        )
                      }
                      fullWidth
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box mt={2} display="flex" justifyContent="start" gap={2}>
          <Button
            color="primary"
            variant="contained"
            size="large"
            disabled={loading}
            onClick={handleSave}
            sx={{ borderRadius: 3, width: "10% !important" }}
            className="drawer_buttons"
          >
            Save
          </Button>
          <Button
            color="inherit"
            onClick={onClose}
            variant="contained"
            size="large"
            sx={{
              backgroundColor: "transparent",
              borderRadius: 3,
              color: "GrayText",
            }}
          >
            Cancel
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};

export default AllocateAddressesDrawer;

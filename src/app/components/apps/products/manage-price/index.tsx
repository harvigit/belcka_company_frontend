import {
  Drawer,
  Box,
  Typography,
  Button,
  IconButton,
  TextField,
  MenuItem,
  Paper,
  Divider,
} from "@mui/material";

import { IconArrowLeft } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import { User } from "next-auth";
import { useSession } from "next-auth/react";

export default function ManagePriceDrawer({ open, onClose, product }: any) {
  const [users, setUsers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  const session = useSession();

  const user = session.data?.user as User & { first_name?: string | null } & {
    last_name?: string | null;
  } & { company_id: number };

  const [rows, setRows] = useState<any>({
    users: [],
    teams: [],
    projects: [],
  });

  useEffect(() => {
    if (open) {
      loadOptions();
      loadEdit();
    }
  }, [open]);

  const loadOptions = async () => {
    const res = await api.get(`get-modules?company_id=${user.company_id}`);

    setUsers(res.data.users || []);
    setTeams(res.data.teams || []);
    setProjects(res.data.projects || []);
  };

  const loadEdit = async () => {
    const res = await api.get(
      `products/get-product-prices?product_id=${product.id}`,
    );

    if (res.data.info) {
      setRows(res.data.info);
    }
  };

  const addRow = (type: string) => {
    setRows((prev: any) => ({
      ...prev,
      [type]: [...prev[type], { id: "", amount: "" }],
    }));
  };

  const removeRow = (type: string, index: number) => {
    const arr = [...rows[type]];
    arr.splice(index, 1);

    setRows((prev: any) => ({
      ...prev,
      [type]: arr,
    }));
  };

  const updateRow = (type: string, index: number, key: string, value: any) => {
    const arr = [...rows[type]];
    arr[index][key] = value;

    setRows((prev: any) => ({
      ...prev,
      [type]: arr,
    }));
  };

  // already selected ids except current row
  const getUsedIds = (type: string, currentIndex: number) => {
    return rows[type]
      .filter((_: any, i: number) => i !== currentIndex)
      .map((x: any) => Number(x.id))
      .filter(Boolean);
  };

  const renderRows = (type: string, options: any[], labelKey: string) => (
    <Paper
      elevation={0}
      sx={{
        border: "1px solid #e5e7eb",
        borderRadius: 3,
        p: 2,
        mb: 3,
        backgroundColor: "#fff",
      }}
    >
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={1.5}
      >
        <Typography fontWeight={700} fontSize={16}>
          {type.charAt(0).toUpperCase() + type.slice(1)}
        </Typography>

        <Button
          size="small"
          variant="outlined"
          onClick={() => addRow(type)}
          sx={{
            borderRadius: 2,
            textTransform: "none",
            minWidth: "auto",
            px: 1.5,
          }}
        >
          + Add
        </Button>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {rows[type].length === 0 && (
        <Typography fontSize={13} color="text.secondary">
          No {type} price rows added.
        </Typography>
      )}

      {rows[type].map((row: any, index: number) => {
        const usedIds = getUsedIds(type, index);

        return (
          <Box
            key={index}
            sx={{
              display: "grid",
              gridTemplateColumns: "1.6fr 1fr auto",
              gap: 1,
              mb: 1.5,
            }}
          >
            <TextField
              select
              fullWidth
              size="small"
              value={row.id}
              onChange={(e) => updateRow(type, index, "id", e.target.value)}
            >
              {options.map((x) => {
                const disabled =
                  usedIds.includes(Number(x.id)) &&
                  Number(row.id) !== Number(x.id);

                return (
                  <MenuItem key={x.id} value={x.id} disabled={disabled}>
                    {x[labelKey]}
                  </MenuItem>
                );
              })}
            </TextField>

            <TextField
              fullWidth
              size="small"
              placeholder="Amount"
              value={row.amount}
              onChange={(e) => {
                const value = e.target.value;

                if (!/^\d*\.?\d{0,2}$/.test(value)) return;

                if (Number(value) > 1000) return;

                updateRow(type, index, "amount", value);
              }}
            />

            <Button
              color="error"
              variant="outlined"
              onClick={() => removeRow(type, index)}
              sx={{
                minWidth: 42,
                borderRadius: 2,
                px: 0,
              }}
            >
              X
            </Button>
          </Box>
        );
      })}
    </Paper>
  );

  const handleSave = async () => {
    const cleanUsers = rows.users.filter(
      (item: any) =>
        item.id !== "" &&
        item.id !== null &&
        item.amount !== "" &&
        item.amount !== null,
    );

    const cleanTeams = rows.teams.filter(
      (item: any) =>
        item.id !== "" &&
        item.id !== null &&
        item.amount !== "" &&
        item.amount !== null,
    );

    const cleanProjects = rows.projects.filter(
      (item: any) =>
        item.id !== "" &&
        item.id !== null &&
        item.amount !== "" &&
        item.amount !== null,
    );

    if (!cleanUsers.length && !cleanTeams.length && !cleanProjects.length) {
      toast.error("Please add at least one valid price row");
      return;
    }

    const payload = {
      product_id: product.id,
      users: cleanUsers,
      teams: cleanTeams,
      projects: cleanProjects,
    };

    const res = await api.post("products/manage-product-prices", payload);

    if (res.data.IsSuccess) {
      toast.success(res.data.message);
      onClose();
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        width: 500,
        "& .MuiDrawer-paper": {
          width: 500,
          backgroundColor: "#f9f9f9",
        },
      }}
    >
      <Box display="flex" flexDirection="column" height="100%">
        <Box
          display="flex"
          alignItems="center"
          px={2}
          py={1.5}
          sx={{
            borderBottom: "1px solid #ececec",
            backgroundColor: "#ffffff",
          }}
        >
          <IconButton onClick={onClose}>
            <IconArrowLeft />
          </IconButton>

          <Typography variant="h6" fontWeight={600}>
            Manage Product Price
          </Typography>
        </Box>

        <Box
          p={3}
          sx={{
            flex: 1,
            overflowY: "auto",
          }}
        >
          {renderRows("users", users, "name")}
          {renderRows("teams", teams, "title")}
          {renderRows("projects", projects, "name")}
        </Box>
      </Box>

      <Box
        sx={{
          display: "flex",
          justifyContent: "start",
          gap: 2,
          mt: "auto",
          p: 2,
          pl: 4,
        }}
      >
        <Button
          color="primary"
          variant="contained"
          size="large"
          type="submit"
          onClick={handleSave}
          sx={{ borderRadius: 3 }}
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
          Close
        </Button>
      </Box>
    </Drawer>
  );
}

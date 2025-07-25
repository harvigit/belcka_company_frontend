"use client";
import React, { useEffect, useState, ChangeEvent } from "react";
import {
  Box,
  Button,
  Grid,
  Stack,
  Typography,
  Autocomplete,
} from "@mui/material";
import CustomFormLabel from "@/app/components/forms/theme-elements/CustomFormLabel";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import { useSession } from "next-auth/react";
import { User } from "next-auth";

type TradeList = {
  trade_id: number;
  name: string;
};

type EditWorkProps = {
  id: number;
  name: string;
  trade_id: number;
  onCloseDialog?: () => void;
};

const EditWork = ({ id, name, trade_id, onCloseDialog }: EditWorkProps) => {
  const [data, setData] = useState<TradeList[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };

  const [formData, setFormData] = useState({
    id: id,
    name: name || "",
    trade_id: trade_id || "",
    company_id: user?.company_id,
  });

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const res = await api.get(
          `trade/get-trades?company_id=${user?.company_id}`
        );
        if (res.data) {
          setData(res.data.info);
        }
      } catch (err) {
        console.error("Failed to fetch trades", err);
      }
    };
    fetchTrades();
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await api.put(`type-works/update`, formData);
      if (res.data.IsSuccess) {
        toast.success(res.data.message);
        onCloseDialog?.();
      } else {
        toast.error(res.data.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Box>
        <Stack
          direction="row"
          spacing={2}
          justifyContent="space-between"
          mb={3}
        >
          <Typography variant="h5">#Edit Type of Work</Typography>
        </Stack>

        <Grid container spacing={3}>
          <Grid
            size={{
              xs: 12,
              sm: 3,
            }}
          >
            <CustomFormLabel>Name</CustomFormLabel>
          </Grid>
          <Grid
            size={{
              xs: 12,
              sm: 9,
            }}
          >
            <CustomTextField
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter name"
              fullWidth
            />
          </Grid>

          <Grid
            size={{
              xs: 12,
              sm: 3,
            }}
          >
            <CustomFormLabel>Trade</CustomFormLabel>
          </Grid>
          <Grid
            size={{
              xs: 12,
              sm: 9,
            }}
          >
            <Autocomplete
              options={data}
              fullWidth
              getOptionLabel={(option) => option.name}
              value={data.find((d) => d.trade_id === formData.trade_id) ?? null}
              onChange={(event, newValue) => {
                setFormData((prev) => ({
                  ...prev,
                  trade_id: newValue?.trade_id ?? "",
                }));
              }}
              isOptionEqualToValue={(option, value) =>
                option.trade_id === value.trade_id
              }
              renderInput={(params) => (
                <CustomTextField {...params} placeholder="Trades" />
              )}
            />
          </Grid>

          <Grid
            size={{
              xs: 12,
              sm: 12,
            }}
            display={"flex"}
            justifyContent={"end"}
          >
            <Button
              color="primary"
              variant="contained"
              size="medium"
              type="submit"
              disabled={isSaving}
            >
              {isSaving ? "Updating Work..." : "Update"}
            </Button>
          </Grid>
        </Grid>
      </Box>
    </form>
  );
};

export default EditWork;

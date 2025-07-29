"use client";
import React, { useState, useEffect, ChangeEvent } from "react";
import {
  Button,
  Typography,
  Box,
  Stack,
  Grid,
  Autocomplete,
} from "@mui/material";
import CustomFormLabel from "@/app/components/forms/theme-elements/CustomFormLabel";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import toast from "react-hot-toast";
import api from "@/utils/axios";
import { useSession } from "next-auth/react";
import { User } from "next-auth";

export type TradeList = {
  trade_id: number;
  name: string;
};

type CreateWorkProps = {
  onCloseDialog?: () => void;
};

const CreateWork = ({ onCloseDialog }: CreateWorkProps) => {
  const [data, setData] = useState<TradeList[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState<any>({
    name: "",
    trade_id: "",
    company_id: user.company_id,
  });

  useEffect(() => {
    const fetchTrades = async () => {
      setLoading(true);
      try {
        const res = await api.get(
          `trade/get-trades?company_id=${user.company_id}`
        );
        if (res.data) {
          setData(res.data.info);
        }
      } catch (err) {
        console.error("Failed to fetch trades", err);
      }
      setLoading(false);
    };
    fetchTrades();
  }, []);

  // fetch team member's
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`type-works/get?company_id=${user.company_id}`);
      // setData(res.data.info);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch users", err);
      setLoading(false);
    }
  };

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prevData: FormData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const result = await api.post("type-works/create", formData);
      if (result.data.IsSuccess == true) {
        toast.success(result.data.message);
        setFormData({
          name: "",
          trade_id: 0,
        });
        onCloseDialog?.();
        fetchData();
      } else {
        toast.error(result.data.message);
      }
    } catch (error) {
      console.log(error, "error");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <form onSubmit={handleSubmit}>
      <Box>
        <Stack
          direction="row"
          spacing={2}
          justifyContent="space-between"
          mb={3}
        >
          <Typography variant="h5">#Add Type of work</Typography>
        </Stack>

        <Grid container spacing={3}>
          <Grid
            display="flex"
            alignItems="center"
            size={{
              xs: 12,
              sm: 3,
            }}
          >
            <CustomFormLabel
              htmlFor="bl-name"
              sx={{ mt: 0, mb: { xs: "-10px", sm: 0 } }}
            >
              Name
            </CustomFormLabel>
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
              placeholder="Enter Name.."
              value={formData.name}
              onChange={handleChange}
              fullWidth
            />
          </Grid>

          <Grid
            display="flex"
            alignItems="center"
            size={{
              xs: 12,
              sm: 3,
            }}
          >
            <CustomFormLabel
              htmlFor="bl-name"
              sx={{ mt: 0, mb: { xs: "-10px", sm: 0 } }}
            >
              Trade
            </CustomFormLabel>
          </Grid>
          <Grid
            size={{
              xs: 12,
              sm: 9,
            }}
          >
            <Autocomplete
              fullWidth
              id="trade_id"
              options={data}
              value={
                data.find((user) => user.trade_id === formData.trade_id) ?? null
              }
              onChange={(event, newValue) => {
                setFormData({
                  ...formData,
                  trade_id: newValue ? newValue.trade_id : null,
                });
              }}
              getOptionLabel={(option) => option.name}
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
              {isSaving ? "Creating Work..." : "Save"}
            </Button>
          </Grid>
        </Grid>
      </Box>
    </form>
  );
};

export default CreateWork;

import React, { useEffect, useState, useMemo } from "react";
import {
  Typography,
  Button,
  TextField,
  InputAdornment,
  Stack,
  Skeleton,
  Box,
} from "@mui/material";
import api from "@/utils/axios";
import toast from "react-hot-toast";
import Image from "next/image";
import { IconSearch, IconCurrencyPound } from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";

interface StoreItem {
  id: number;
  name: string;
  max_limit: string | null;
}

export default function StoreLimit() {
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [originalStores, setOriginalStores] = useState<StoreItem[]>([]);
  const [fetchStore, setFetchStore] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [currency, setCurrency] = useState<string>("£");

  const session = useSession();
  const user = session.data?.user as User & { company_id?: number | null };

  const fetchData = async () => {
    setFetchStore(true);
    try {
      const res = await api.get(`stores/get?company_id=${user?.company_id}`);
      if (res.data?.info) {
        const fetchedStores = res.data.info.map((s: any) => ({
          id: s.id,
          name: s.name,
          max_limit:
            s.max_limit !== null && s.max_limit !== undefined
              ? String(s.max_limit)
              : null,
        }));
        setStores(fetchedStores);
        setOriginalStores(fetchedStores.map((s: StoreItem) => ({ ...s })));
        if (res.data.info.length > 0) {
          setCurrency(res.data.info[0]?.currency || "£");
        }
      }
    } catch (err) {
      console.error("Failed to fetch stores data", err);
    } finally {
      setFetchStore(false);
    }
  };

  useEffect(() => {
    if (user?.company_id) {
      fetchData();
    }
  }, [user?.company_id]);

  const filteredStores = useMemo(() => {
    const s = searchTerm.toLowerCase().trim();
    return stores.filter((store) => {
      if (!s) return true;
      return store.name.toLowerCase().includes(s);
    });
  }, [stores, searchTerm]);

  const hasChanges = useMemo(() => {
    return stores.some((s) => {
      const orig = originalStores.find((o) => o.id === s.id);
      if (!orig) return false;
      const origLimit = orig.max_limit === null || orig.max_limit === "" ? null : Number(orig.max_limit);
      const newLimit = s.max_limit === null || s.max_limit === "" ? null : Number(s.max_limit);
      return origLimit !== newLimit;
    });
  }, [stores, originalStores]);

  const handleLimitChange = (id: number, value: string) => {
    const limit = value === "" ? null : value;
    setStores((prev) =>
      prev.map((s) => (s.id === id ? { ...s, max_limit: limit } : s)),
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        company_id: user?.company_id,
        limits: stores.map((s) => ({
          store_id: s.id,
          max_limit: s.max_limit === null || s.max_limit === "" ? null : Number(s.max_limit),
        })),
      };

      const res = await api.post("stores/update-max-limits", payload);
      if (res.data?.IsSuccess) {
        toast.success(res.data.message);
        setOriginalStores(stores.map((s) => ({ ...s })));
      } else {
        toast.error(res.data?.message || "Failed to update store limits");
      }
    } catch (err: any) {
      console.error("Failed to save store limits", err);
      toast.error("An error occurred while saving limits");
    } finally {
      setSaving(false);
      await fetchData();
    }
  };

  const isListViewEmpty = filteredStores.length === 0;

  return (
    <Box>
      <Typography fontWeight={600} variant="h6" p={2} pb={0}>
        Store Limits
      </Typography>
      <Stack
        p={2}
        pt={1}
        direction="row"
        spacing={2}
        alignItems="center"
        flexWrap="wrap"
        useFlexGap
      >
        {/* Search Input */}
        <TextField
          size="small"
          placeholder="Search stores..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconSearch size={16} />
              </InputAdornment>
            ),
          }}
          sx={{ width: 250 }}
        />

        {stores.length > 0 && (
          <Button
            onClick={handleSave}
            disabled={fetchStore || saving || !hasChanges}
            variant="contained"
            color="primary"
            sx={{ borderRadius: 2, minWidth: 100 }}
          >
            {saving ? "Updating..." : "Update Limits"}
          </Button>
        )}
      </Stack>

      {/* Scrollable Grouped Card List Container */}
      <Box
        mx={2}
        sx={{
          height: "calc(95vh - 160px)",
          overflowY: "auto",
          pr: 1,
        }}
      >
        {fetchStore ? (
          Array.from(new Array(4)).map((_, idx) => (
            <Box key={idx} mb={2}>
              <Skeleton
                variant="rectangular"
                height={65}
                sx={{ borderRadius: 2 }}
              />
            </Box>
          ))
        ) : isListViewEmpty ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              minHeight: 300,
            }}
          >
            <Image
              src="/images/no-data.png"
              alt="No data found"
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
              }}
              width={200}
              height={200}
            />
          </Box>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "1fr 1fr",
                md: "repeat(3, 1fr)",
              },
              gap: 3,
              pb: 4,
            }}
          >
            {filteredStores.map((store) => (
              <Box
                key={store.id}
                p={2}
                sx={{
                  border: "1px solid #eef2f6",
                  borderRadius: 2,
                  background: "#ffffff",
                  transition: "all 0.2s ease-in-out",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  "&:hover": {
                    borderColor: "#cbd5e1",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                    background: "#fafbfc",
                  },
                }}
              >
                <Typography fontWeight={500} color="textPrimary">
                  {store.name}
                </Typography>

                <CustomTextField
                  size="small"
                  value={store.max_limit !== null ? store.max_limit : ""}
                  onChange={(e: any) => {
                    const value = e.target.value;

                    if (value.length > 15) {
                      return;
                    }

                    if (!/^(\d+)?(\.\d{0,2})?$/.test(value)) {
                      return;
                    }

                    handleLimitChange(store.id, value);
                  }}
                  sx={{ width: 150 }}
                  inputProps={{
                    inputMode: "decimal",
                    style: { textAlign: "left" },
                    maxLength: 15,
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        {currency}
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}

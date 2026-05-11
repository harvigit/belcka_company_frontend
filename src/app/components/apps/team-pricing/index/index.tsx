"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  Typography,
  Box,
  Button,
  Stack,
  IconButton,
  Drawer,
  TextField,
  InputAdornment,
  Divider,
  Avatar,
  Chip,
  CircularProgress,
} from "@mui/material";
import {
  IconArrowsShuffle,
  IconSearch,
  IconX,
  IconArrowLeft,
} from "@tabler/icons-react";
import api from "@/utils/axios";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import IOSSwitch from "@/app/components/common/IOSSwitch";

const TeamPricing = () => {
  const [data, setData] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [openDrawer, setOpenDrawer] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const session = useSession();
  const user = session.data?.user as User & {
    company_id?: number | null;
  };

  const fetchTeams = async () => {
    try {
      setLoadingTeams(true);
      const res = await api.get(
        `team/get-team-member-list?company_id=${user.company_id}`,
      );

      if (res.data?.info) {
        setData(res.data.info || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTeams(false);
    }
  };

  useEffect(() => {
    if (user?.company_id) {
      fetchTeams();
    }
  }, [user?.company_id]);

  const shouldHighlight = (item: any) => {
    return (
      item.is_subcontractor === true &&
      item.company_id !== item.subcontractor_company_id
    );
  };

  const handleOpenDrawer = async (team: any) => {
    try {
      setSelectedTeam(team);
      setOpenDrawer(true);
      setLoadingProducts(true);

      const productRes = await api.get(
        `products/get?company_id=${user.company_id}&is_products=true`,
      );

      const allProducts = (productRes.data?.info || []).map((item: any) => ({
        ...item,
        percentage: "",
        calculated_price: null,
      }));

      const pricingRes = await api.get(
        `team/get-team-pricing-details?company_id=${user.company_id}&team_id=${team.team_id}`,
      );

      const pricingProducts = pricingRes.data?.info?.products || [];
      const mergedProducts = allProducts.map((product: any) => {
        const matched = pricingProducts.find(
          (x: any) => Number(x.product_id) === Number(product.id),
        );

        return {
          ...product,

          percentage:
            matched?.percentage !== undefined && matched?.percentage !== null
              ? String(matched.percentage)
              : "",

          calculated_price: matched?.calculated_price || null,
        };
      });

      setProducts(mergedProducts);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load products");
    } finally {
      setLoadingProducts(false);
    }
  };

  // change percentage
  const handlePercentageChange = (productId: number, value: string) => {
    if (value !== "" && Number(value) > 100) return;

    if (value !== "" && Number(value) < 0) return;

    setProducts((prev) =>
      prev.map((item) => {
        if (item.id !== productId) return item;

        if (value === "") {
          return {
            ...item,
            percentage: "",
            calculated_price: "0.00",
          };
        }

        const percentage = Number(value);
        const buyingPrice = Number(item.price || 0);
        const marketPrice = Number(item.market_price || 0);
        let calculatedPrice = 0;

        if (marketPrice <= buyingPrice) {
          calculatedPrice = buyingPrice + (buyingPrice * percentage) / 100;
        } else {
          calculatedPrice =
            buyingPrice + ((marketPrice - buyingPrice) * percentage) / 100;
        }

        return {
          ...item,
          percentage: value,
          calculated_price: calculatedPrice.toFixed(2),
        };
      }),
    );
  };

  // team status change
  const handleTeamStatus = async (teamId: number, value: boolean) => {
    try {
      setData((prev) =>
        prev.map((item) =>
          item.team_id === teamId
            ? {
                ...item,
                is_enabled: value,
              }
            : item,
        ),
      );

      const payload = {
        company_id: user.company_id,
        team_id: teamId,
        is_enabled: value,
      };

      const res = await api.post(`team/update-team-pricing-status`, payload);

      if (res.data?.IsSuccess) {
        toast.success(res.data.message);
        fetchTeams();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const payload = {
        company_id: Number(user.company_id),
        team_id: Number(selectedTeam?.team_id),
        products: products
          .filter((p) => p.percentage !== "" && p.percentage !== null)
          .map((p) => ({
            product_id: Number(p.id),
            percentage: Number(p.percentage),
            calculated_price: Number(p.calculated_price || 0),
          })),
      };

      const res = await api.post(`team/save-team-pricing`, payload);

      if (res.data?.IsSuccess) {
        toast.success(res.data.message);

        setOpenDrawer(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((item: any) => {
      return (
        item.name?.toLowerCase().includes(search.toLowerCase()) ||
        item.short_name?.toLowerCase().includes(search.toLowerCase()) ||
        item.uuid?.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [products, search]);

  return (
    <Box
      sx={{
        height: "calc(100vh - 100px)",
        overflow: "auto",
        p: 2,
      }}
    >
      <Typography variant="h4" fontWeight={700} mb={3}>
        Team Pricing
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "1fr 1fr",
            lg: "1fr 1fr 1fr",
          },
          gap: 2,
        }}
      >
        {data.map((item: any) => {
          const highlight = shouldHighlight(item);

          return (
            <Box
              key={item.id}
              sx={{
                border: "1px solid",
                borderColor: highlight ? "#f59e0b" : "#e5e7eb",
                borderRadius: 3,
                p: 2,
                backgroundColor: highlight
                  ? "rgba(245, 158, 11, 0.08)"
                  : "#fff",
                transition: "0.2s",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                "&:hover": {
                  boxShadow: 3,
                },
              }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                spacing={2}
              >
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                    <Typography variant="h6" fontWeight={700}>
                      {item.name}
                    </Typography>

                    {highlight && (
                      <Chip
                        label="Sub Contractor"
                        color="warning"
                        size="small"
                      />
                    )}
                  </Stack>
                </Box>

                {!highlight && (
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <IconButton
                      color="primary"
                      onClick={() => handleOpenDrawer(item)}
                      sx={{
                        border: "1px solid #dbeafe",
                        backgroundColor: "#eff6ff",
                        "&:hover": {
                          backgroundColor: "#dbeafe",
                        },
                      }}
                    >
                      <IconArrowsShuffle width={18} />
                    </IconButton>

                    <IOSSwitch
                      checked={item.is_inventory}
                      onChange={(e) =>
                        handleTeamStatus(item.team_id, e.target.checked)
                      }
                      color="success"
                    />
                  </Box>
                )}
              </Stack>
            </Box>
          );
        })}
      </Box>

      {!loadingTeams && data.length === 0 && (
        <Typography textAlign="center" mt={5} color="text.secondary">
          No teams found.
        </Typography>
      )}

      <Drawer
        anchor="right"
        open={openDrawer}
        onClose={() => setOpenDrawer(false)}
        PaperProps={{
          sx: {
            width: {
              xs: "100%",
              sm: 550,
            },
          },
        }}
      >
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          p={2}
        >
          <Box display={"flex"} alignItems={"center"}>
            <IconButton onClick={() => setOpenDrawer(false)}>
              <IconArrowLeft />
            </IconButton>

            <Typography variant="h4" fontWeight={600}>
              {selectedTeam?.name}
            </Typography>
          </Box>

          <IconButton onClick={() => setOpenDrawer(false)}>
            <IconX />
          </IconButton>
        </Box>

        <Divider />

        <Box p={2}>
          <TextField
            id="search"
            type="text"
            size="small"
            variant="outlined"
            fullWidth
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: "97%" }}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconSearch size={"16"} />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>

        <Box
          sx={{
            flex: 1,
            overflow: "auto",
            px: 2,
            pb: 12,
          }}
        >
          {loadingProducts ? (
            <Box display="flex" justifyContent="center" mt={5}>
              <CircularProgress />
            </Box>
          ) : (
            <Stack spacing={1.5}>
              {filteredProducts.map((item: any) => (
                <Box
                  key={item.id}
                  sx={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 2,
                    p: 2,
                    transition: "0.2s",
                    "&:hover": {
                      boxShadow: 1,
                    },
                  }}
                >
                  <Stack spacing={2}>
                    <Stack
                      direction="row"
                      spacing={2}
                      justifyContent="space-between"
                    >
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar
                          src={item.image_url || "/images/products/product.svg"}
                          variant="rounded"
                          sx={{
                            width: 55,
                            height: 55,
                          }}
                        />

                        <Box>
                          <Typography
                            fontWeight={700}
                            sx={{
                              display: "-webkit-box",
                              WebkitBoxOrient: "vertical",
                              WebkitLineClamp: 3,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              lineHeight: 1.25,
                              maxWidth: 300,
                              wordBreak: "break-word",
                            }}
                          >
                            {item.short_name || item.name}
                          </Typography>

                          <Typography variant="body2" color="text.secondary">
                            {item.uuid}
                          </Typography>

                          <Typography variant="body2" color="primary" mt={0.5}>
                            Buying:
                            {item.currency}
                            {item.price}
                          </Typography>

                          <Typography variant="body2" color="success.main">
                            Market:
                            {item.currency}
                            {item.market_price}
                          </Typography>
                        </Box>
                      </Stack>
                      <TextField
                        size="small"
                        type="text"
                        label="%"
                        value={item.percentage}
                        onChange={(e) => {
                          const value = e.target.value;

                          if (/^\d*$/.test(value)) {
                            if (value === "" || Number(value) <= 100) {
                              handlePercentageChange(item.id, value);
                            }
                          }
                        }}
                        sx={{
                          width: "15%",
                        }}
                      />
                    </Stack>

                    <Box
                      sx={{
                        backgroundColor: "#f8fafc",
                        borderRadius: 2,
                        p: 1.5,
                        pt: 0,
                        m: 0,
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Calculated Price
                      </Typography>

                      <Typography variant="h6" fontWeight={700} color="primary">
                        {item.currency}
                        {item.calculated_price || "0.00"}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </Box>

        <Box
          sx={{
            position: "sticky",
            bottom: 0,
            background: "#fff",
            borderTop: "1px solid #e5e7eb",
            p: 2,
            zIndex: 10,
          }}
        >
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            className="drawer_buttons"
            sx={{
              borderRadius: 3,
            }}
          >
            {saving ? "Saving..." : "Save Pricing"}
          </Button>
        </Box>
      </Drawer>
    </Box>
  );
};

export default TeamPricing;

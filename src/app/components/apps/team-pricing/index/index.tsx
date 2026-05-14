"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  Typography,
  Box,
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
  const [teamPercentage, setTeamPercentage] = useState("");
  const [search, setSearch] = useState("");
  const [savingTeamId, setSavingTeamId] = useState<number | null>(null);
  const [cachedAllProducts, setCachedAllProducts] = useState<any[] | null>(
    null,
  );

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
        const teamsNormalized = (res.data.info || []).map((t: any) => ({
          ...t,
          percentage:
            t.percentage !== undefined && t.percentage !== null
              ? String(t.percentage)
              : "",
        }));
        setData(teamsNormalized);
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

  const calculateProductPrice = (
    buyingPrice: number,
    marketPrice: number,
    percentageStr: string,
  ): string | null => {
    if (!percentageStr || percentageStr === "") return null;
    const percentage = Number(percentageStr);
    let calculatedPrice = 0;

    if (marketPrice <= buyingPrice) {
      calculatedPrice = buyingPrice + (buyingPrice * percentage) / 100;
    } else {
      calculatedPrice =
        buyingPrice + ((marketPrice - buyingPrice) * percentage) / 100;
    }

    return calculatedPrice.toFixed(2);
  };

  const handleOpenDrawer = async (team: any) => {
    try {
      setSelectedTeam(team);
      setTeamPercentage(team.percentage);
      setOpenDrawer(true);
      setLoadingProducts(true);

      const teamPercentageStr =
        team.percentage !== undefined && team.percentage !== null
          ? String(team.percentage)
          : "";

      const [productRes, pricingRes] = await Promise.all([
        cachedAllProducts
          ? Promise.resolve({ data: { info: cachedAllProducts } })
          : api.get(
            `products/get?company_id=${user.company_id}&is_products=true`,
          ),
        api.get(
          `team/get-team-pricing-details?company_id=${user.company_id}&team_id=${team.team_id}`,
        ),
      ]);

      const allProducts = productRes.data?.info || [];
      if (!cachedAllProducts) {
        setCachedAllProducts(allProducts);
      }

      const pricingProducts = pricingRes.data?.info?.products || [];
      const pricingMap = new Map<number, any>(
        pricingProducts.map((x: any) => [Number(x.product_id), x]),
      );

      const mergedProducts = allProducts.map((product: any) => {
        const matched = pricingMap.get(Number(product.id));

        const resolvedPercentage =
          matched?.percentage !== undefined &&
            matched?.percentage !== null &&
            String(matched.percentage) !== ""
            ? String(matched.percentage)
            : teamPercentageStr;

        const buyingPrice = Number(product.price || product.buying_price || 0);
        const marketPrice = Number(product.market_price || 0);

        const calculatedPrice =
          matched?.calculated_price !== undefined &&
            matched?.calculated_price !== null
            ? Number(matched.calculated_price).toFixed(2)
            : calculateProductPrice(
              buyingPrice,
              marketPrice,
              resolvedPercentage,
            );

        return {
          ...product,
          percentage: resolvedPercentage,
          calculated_price: calculatedPrice,
        };
      });

      setProducts(mergedProducts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const autoApplyPricing = async (teamId: number, percentageStr: string) => {
    try {
      setSavingTeamId(teamId);
      let allProducts = cachedAllProducts;

      if (!allProducts) {
        const productRes = await api.get(
          `products/get?company_id=${user.company_id}&is_products=true`,
        );
        allProducts = productRes.data?.info || [];
        setCachedAllProducts(allProducts);
      }

      const payload = {
        company_id: Number(user.company_id),
        team_id: Number(teamId),
        products: allProducts!.map((p: any) => {
          const buyingPrice = Number(p.price || p.buying_price || 0);
          const marketPrice = Number(p.market_price || 0);
          const calculatedPrice = calculateProductPrice(
            buyingPrice,
            marketPrice,
            percentageStr,
          );
          return {
            product_id: Number(p.id),
            percentage: Number(percentageStr),
            calculated_price: Number(calculatedPrice || 0),
          };
        }),
      };

      const res = await api.post(`team/save-team-pricing`, payload);
      if (res.data?.IsSuccess) {
        setData((prev) =>
          prev.map((item) =>
            item.team_id === teamId
              ? { ...item, percentage: percentageStr }
              : item,
          ),
        );
      }
    } catch (err) {
      console.error("Auto-apply failed", err);
    } finally {
      setSavingTeamId(null);
    }
  };

  const handleUpdateTeamCommonStatus = async (
    teamId: number,
    isEnabled: boolean,
    percentageStr?: string,
    skipAutoApply: boolean = false,
  ) => {
    try {
      setData((prev) =>
        prev.map((item) =>
          item.team_id === teamId
            ? {
              ...item,
              is_inventory: isEnabled,
              percentage: percentageStr || "",
            }
            : item,
        ),
      );

      if (selectedTeam && selectedTeam.team_id === teamId) {
        setSelectedTeam((prev: any) => ({
          ...prev,
          percentage: percentageStr || "",
        }));
        setTeamPercentage(percentageStr || "");
      }

      const payload = {
        company_id: Number(user.company_id),
        team_id: Number(teamId),
        is_enabled: isEnabled,
        percentage:
          percentageStr !== undefined && percentageStr !== ""
            ? Number(percentageStr)
            : null,
      };

      const res = await api.post(`team/update-team-pricing-status`, payload);
      if (res.data?.IsSuccess) {
        if (
          !skipAutoApply &&
          percentageStr !== undefined &&
          percentageStr !== ""
        ) {
          await autoApplyPricing(teamId, percentageStr);
        }
      }
      toast.success(res.data.message);
    } catch (err) {
      console.error("Failed to update team pricing status", err);
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
              key={item.id || item.team_id}
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
                {!highlight && <Divider sx={{ my: 0.5 }} />}

                {!highlight && (
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <TextField
                      size="small"
                      label="%"
                      placeholder="0"
                      value={item.percentage || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (
                          /^\d*$/.test(val) &&
                          (val === "" || Number(val) <= 100)
                        ) {
                          setData((prev) =>
                            prev.map((t) =>
                              t.team_id === item.team_id
                                ? { ...t, percentage: val }
                                : t,
                            ),
                          );
                        }
                      }}
                      onBlur={() =>
                        handleUpdateTeamCommonStatus(
                          item.team_id,
                          item.is_inventory,
                          item.percentage,
                        )
                      }
                      sx={{ width: 60 }}
                    />

                    <Box display="flex" alignItems="center" gap={1.5}>
                      <IconButton
                        color="primary"
                        onClick={() => handleOpenDrawer(item)}
                        disabled={savingTeamId === item.team_id}
                        sx={{
                          border: "1px solid #dbeafe",
                          backgroundColor:
                            savingTeamId === item.team_id ? "#f3f4f6" : "#eff6ff",
                          "&:hover": {
                            backgroundColor: "#dbeafe",
                          },
                        }}
                      >
                        {savingTeamId === item.team_id ? (
                          <CircularProgress size={18} color="inherit" />
                        ) : (
                          <IconArrowsShuffle width={18} />
                        )}
                      </IconButton>
                      <IOSSwitch
                        checked={item.is_inventory}
                        onChange={(e) =>
                          handleUpdateTeamCommonStatus(
                            item.team_id,
                            e.target.checked,
                            item.percentage,
                          )
                        }
                        color="success"
                      />
                    </Box>
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
              sm: 600,
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
            {/* {teamPercentage && (
              <Typography variant="body2">
                Applied {teamPercentage}% on Price
              </Typography>
            )} */}
          </Box>

          <IconButton onClick={() => setOpenDrawer(false)}>
            <IconX />
          </IconButton>
        </Box>

        <Divider />

        <Stack direction="row" spacing={2} alignItems="center" p={2}>
          <TextField
            id="search"
            type="text"
            size="small"
            variant="outlined"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flexGrow: 1 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconSearch size={16} />
                </InputAdornment>
              ),
            }}
          />
        </Stack>

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
                              lineHeight: 1.35,
                              maxWidth: 400,
                              wordBreak: "break-word",
                            }}
                          >
                            {item.short_name || item.name}
                            <Chip
                              label={item.uuid}
                              size="small"
                              sx={{ ml: 1 }}
                            />
                          </Typography>

                          <Box display={"flex"} gap={1.5} alignItems={"center"}>
                            <Typography variant="body2" color="primary">
                              Buying: {item.currency || "£"}
                              {item.price || item.buying_price || "0.00"}
                            </Typography>

                            <Typography variant="body2" color="success.main">
                              Market: {item.currency || "£"}
                              {item.market_price || "0.00"}
                            </Typography>
                          </Box>
                          <Typography variant="h6" color="error.main">
                            Calculated Price: {item.currency || "£"}
                            {item.calculated_price || "0.00"}
                          </Typography>
                        </Box>
                      </Stack>
                    </Stack>
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </Box>
      </Drawer>
    </Box>
  );
};

export default TeamPricing;

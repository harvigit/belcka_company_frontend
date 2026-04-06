import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
} from "@mui/material";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import api from "@/utils/axios";
import { Grid } from "@mui/system";
import { useTheme } from "@mui/material/styles";
import {
  IconBox,
  IconChartLine,
  IconCoins,
  IconHomeDollar,
  IconMapPinCheck,
  IconNotes,
  IconUserCircle,
} from "@tabler/icons-react";
import Link from "next/link";
import { IconChartBar } from "@tabler/icons-react";
import SalesOverview from "@/app/components/dashboard/TheSalesOverview";
import LowStockProduct from "@/app/components/dashboard/TheProductPerformance";

const BuyerDashboard = () => {
  const session = useSession();
  const user = session.data?.user as User & { first_name?: string | null } & {
    last_name?: string | null;
  } & { company_id: number };
  const [sales, setSales] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const theme = useTheme();
  const borderColor = theme.palette.divider;
  const [currency, setCurrency] = useState("");

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const res = await api.get(
        `products/inventory-overview?company_id=${user.company_id}`,
      );

      if (res.data.IsSuccess) {
        setProducts(res.data.low_stock_product);
        const data = res.data.info;
      }
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
    setLoading(false);
  };

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await api.get(
        `products/inventory-summary?company_id=${user.company_id}`,
      );

      if (res.data.IsSuccess) {
        const data = res.data.info;
        setCurrency(res.data.currency);

        setInventory([
          {
            btnText: "primary.main",
            title: "order_in_hands",
            digits: data.order_in_hands.count,
            subtext: "",
            text: "",
            text2: "Order in Hand",
          },
          {
            btnText: "warning.main",
            title: "received_orders",
            digits: data.received_orders.count,
            subtext: "",
            text: "",
            text2: "To be received",
          },
        ]);
      }
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
    setLoading(false);
  };

  const fetchResorces = async () => {
    setLoading(true);
    try {
      const res = await api.get(
        `get-inventory-resources?company_id=${user.company_id}`,
      );
      if (res.data.IsSuccess) {
        const data = res.data;

        setSuppliers([
          {
            btnText: "primary.main",
            title: "suppliers",
            digits: data.suppliers?.length,
            subtext: "",
            text: "",
            text2: "Number of Suppliers",
          },
          {
            btnText: "warning.main",
            title: "categories",
            digits: data.categories?.length,
            subtext: "",
            text: "",
            text2: "Number of Categories",
          },
        ]);
      }
    } catch (err) {
      console.error("Failed to fetch inventory resource", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOverview();
    fetchInventory();
    fetchResorces();
  }, [user.company_id]);
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 8 }}>
        <Card
          sx={{
            borderRadius: "15px",
            boxShadow: (theme) => theme.shadows[9],
          }}
        >
          <Typography pl={4} pt={2} variant="h3">
            Delivery details
          </Typography>

          <Grid container>
            {/* 1 */}
            <Grid size={{ xs: 6, sm: 3, lg: 3 }}>
              <CardContent
                sx={{
                  borderRight: {
                    xs: "0",
                    sm: `1px solid ${borderColor}`,
                  },
                  p: 4,
                  textAlign: "center",
                }}
              >
                <IconCoins
                  stroke={1.5}
                  size={40}
                  color="#629FF4"
                  style={{
                    backgroundColor: "#E8F1FD",
                    padding: 6,
                    borderRadius: 6,
                  }}
                />

                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  mt={3}
                  color="text.secondary"
                >
                  <Typography variant="h3">40</Typography>
                  <Typography variant="h6">Will be delivery</Typography>
                </Box>
              </CardContent>
            </Grid>

            {/* 2 */}
            <Grid size={{ xs: 6, sm: 3, lg: 3 }}>
              <CardContent
                sx={{
                  borderRight: {
                    xs: "0",
                    sm: `1px solid ${borderColor}`,
                  },
                  p: 4,
                  textAlign: "center",
                }}
              >
                <IconChartLine
                  size={40}
                  color="#817AF3"
                  style={{
                    backgroundColor: "#ECEAFF",
                    padding: 6,
                    borderRadius: 6,
                  }}
                />

                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  mt={3}
                  color="text.secondary"
                >
                  <Typography variant="h3">5</Typography>
                  <Typography variant="h6">In Transit</Typography>
                </Box>
              </CardContent>
            </Grid>

            {/* 3 */}
            <Grid size={{ xs: 6, sm: 3, lg: 3 }}>
              <CardContent
                sx={{
                  borderRight: {
                    xs: "0",
                    sm: `1px solid ${borderColor}`,
                  },
                  p: 4,
                  textAlign: "center",
                }}
              >
                <IconChartBar
                  size={40}
                  color="#DBA362"
                  style={{
                    backgroundColor: "#FFEEDB",
                    padding: 6,
                    borderRadius: 6,
                  }}
                />

                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  mt={3}
                  color="text.secondary"
                >
                  <Typography variant="h3">20</Typography>
                  <Typography variant="h6">Delivered</Typography>
                </Box>
              </CardContent>
            </Grid>

            {/* 4 */}
            <Grid size={{ xs: 6, sm: 3, lg: 3 }}>
              <CardContent
                sx={{
                  borderRight: {
                    xs: "0",
                    sm: `1px solid ${borderColor}`,
                  },
                  p: 4,
                  textAlign: "center",
                }}
              >
                <IconHomeDollar
                  size={40}
                  color="#58D365"
                  style={{
                    backgroundColor: "#EBFFED",
                    padding: 6,
                    borderRadius: 6,
                  }}
                />

                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  mt={3}
                  color="text.secondary"
                >
                  <Typography variant="h3">
                    {currency ? currency : "£"}17,432
                  </Typography>
                  <Typography variant="h6">Cost</Typography>
                </Box>
              </CardContent>
            </Grid>
          </Grid>
        </Card>
      </Grid>

      <Grid size={{ xs: 4 }}>
        <Card
          sx={{
            borderRadius: "15px",
            boxShadow: (theme) => theme.shadows[9],
          }}
        >
          <Box>
            <Typography variant="h3" pl={4} pt={2}>
              Inventory Summary
            </Typography>
          </Box>

          <Grid container>
            {inventory.map((topcard) => (
              <Grid
                key={topcard.digits}
                size={{
                  xs: 6,
                  lg: 6,
                  sm: 6,
                }}
              >
                {!loading ? (
                  <CardContent
                    sx={{
                      borderRight: {
                        xs: "0",
                        sm: `1px solid ${borderColor}`,
                      },
                      p: 4,
                      textAlign: "center",
                    }}
                  >
                    {topcard.title == "order_in_hands" ? (
                      <IconBox
                        size={40}
                        color="#DBA362"
                        style={{
                          backgroundColor: "#FFEEDB",
                          padding: 6,
                          borderRadius: 6,
                        }}
                      />
                    ) : (
                      <IconMapPinCheck
                        size={40}
                        color="#817AF399"
                        style={{
                          backgroundColor: "#ECEAFF",
                          padding: 6,
                          borderRadius: 6,
                        }}
                      />
                    )}
                    <Box
                      display="block"
                      alignItems="center"
                      color="text.secondary"
                      mt={0.5}
                    >
                      <Typography variant="h3" fontWeight="400">
                        {topcard.digits}
                      </Typography>

                      <Typography
                        color="textSecondary"
                        variant="h6"
                        fontWeight="400"
                      >
                        {topcard.text2}
                      </Typography>
                    </Box>
                  </CardContent>
                ) : (
                  <>
                    {" "}
                    <CircularProgress
                      size={30}
                      color="primary"
                      sx={{ ml: 5 }}
                    />
                  </>
                )}
              </Grid>
            ))}
          </Grid>
        </Card>
      </Grid>
      {/* <Grid size={{ xs: 8 }}>
        <Card
          sx={{
            borderRadius: "15px",
            boxShadow: (theme) => theme.shadows[9],
          }}
        >
          <Typography className="f-18" pl={4} pt={2}>
            Overall Inventory
          </Typography>

          <Grid container>
            {sales.map((topcard) => (
              <Grid
                key={topcard.digits}
                size={{
                  xs: 6,
                  lg: 3,
                  sm: 3,
                }}
              >
                {!loading ? (
                  <CardContent
                    sx={{
                      borderRight: {
                        xs: "0",
                        sm: `1px solid ${borderColor}`,
                      },
                      padding: "30px",
                      "& :last-child": {
                        borderRight: "0",
                      },
                    }}
                  >
                    <Typography
                      fontWeight={500}
                      sx={{
                        color: topcard.btnText,
                        boxShadow: "none",
                      }}
                    >
                      {topcard.title}
                    </Typography>
                    <Box
                      display="flex"
                      justifyContent={"space-between"}
                      alignItems="center"
                      mt={3}
                      color="text.secondary"
                    >
                      <Typography variant="h3">{topcard.digits}</Typography>
                      <Typography color="textSecondary" variant="h3">
                        {topcard.subtext}
                      </Typography>
                    </Box>
                    <Box
                      display="flex"
                      justifyContent={"space-between"}
                      alignItems="end"
                      mt={1}
                      color="text.secondary"
                    >
                      <Typography variant="h6" fontWeight="400">
                        {topcard.text2}
                      </Typography>

                      <Typography
                        color="textSecondary"
                        variant="h6"
                        fontWeight="400"
                      >
                        {topcard.text}
                      </Typography>
                    </Box>
                  </CardContent>
                ) : (
                  <>
                    {" "}
                    <CircularProgress
                      size={30}
                      color="primary"
                      sx={{ ml: 5 }}
                    />
                  </>
                )}
              </Grid>
            ))}
          </Grid>
        </Card>
      </Grid> */}

      <Grid size={{ xs: 8 }}>
        <SalesOverview companyId={user.company_id} />
      </Grid>
      <Grid size={{ xs: 4 }}>
        <Grid size={{ xs: 12 }}>
          <Card
            sx={{
              mb: 2,
              borderRadius: "15px",
              boxShadow: (theme) => theme.shadows[9],
            }}
          >
            <Box
              display={"flex"}
              justifyContent={"space-between"}
              alignItems={"center"}
              width={"95%"}
            >
              <Typography variant="h3" pl={4} pt={2}>
                Suppliers
              </Typography>
              <Link
                href={"/apps/suppliers/list"}
                style={{ color: "#1E4DB7", paddingTop: 16 }}
              >
                See all
              </Link>
            </Box>
            <Grid container>
              {loading ? (
                <Box width={"100%"} textAlign={"center"}>
                  <CircularProgress
                    size={30}
                    color="primary"
                    sx={{ m: "auto" }}
                  />
                </Box>
              ) : (
                suppliers.map((topcard,index) => (
                  <Grid
                    key={index}
                    size={{
                      xs: 6,
                      lg: 6,
                      sm: 6,
                    }}
                  >
                    <CardContent
                      sx={{
                        borderRight: {
                          xs: "0",
                          sm: `1px solid ${borderColor}`,
                        },
                        p: 4,
                        textAlign: "center",
                      }}
                    >
                      {topcard.title == "suppliers" ? (
                        <IconUserCircle
                          size={40}
                          color="#24B8F1"
                          style={{
                            backgroundColor: "#E5F7FD",
                            padding: 6,
                            borderRadius: 6,
                          }}
                        />
                      ) : (
                        <IconNotes
                          size={40}
                          color="#817AF399"
                          style={{
                            backgroundColor: "#ECEAFF",
                            padding: 6,
                            borderRadius: 6,
                          }}
                        />
                      )}
                      <Box
                        display="block"
                        alignItems="center"
                        mt={1}
                        color="text.secondary"
                      >
                        <Typography variant="h3" fontWeight="400">
                          {topcard.digits}
                        </Typography>

                        <Typography
                          color="textSecondary"
                          variant="h6"
                          fontWeight="400"
                        >
                          {topcard.text2}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Grid>
                ))
              )}
            </Grid>
          </Card>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <LowStockProduct products={products} loading={loading} />
        </Grid>
      </Grid>
    </Grid>
  );
};

export default BuyerDashboard;

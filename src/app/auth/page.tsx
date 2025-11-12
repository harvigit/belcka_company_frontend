"use client";
import Link from "next/link";
import { Grid, Box, Stack, Typography, Dialog, Card } from "@mui/material";
import PageContainer from "@/app/components/container/PageContainer";
import Logo from "@/app/(DashboardLayout)/layout/shared/logo/Logo";
import AuthLogin from "./authForms/AuthLogin";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthRegister from "./authForms/AuthRegister";

export default function Login() {
  const router = useRouter();

  const { data: session } = useSession();
  const isAuthenticated = session?.user?.email;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, router]);

  if (isAuthenticated) return null;

  return (
    <PageContainer title="Login Page" description="this is Sample page">
      <Grid
        container
        spacing={0}
        justifyContent="center"
        sx={{ height: "80vh" }}
      >
        {open == false && (
          <Grid
            sx={{
              position: "relative",
              "&:before": {
                content: '""',
                background: "radial-gradient(#d2f1df, #d3d7fa, #bad8f4)",
                backgroundSize: "400% 400%",
                animation: "gradient 15s ease infinite",
                position: "absolute",
                height: "100%",
                width: "100%",
                opacity: "0.3",
              },
            }}
            size={{
              xs: 12,
              sm: 12,
              lg: 7,
              xl: 8,
            }}
          >
            <Box position="relative">
              <Box px={3}>
                <Logo />
              </Box>
              <Box
                alignItems="center"
                justifyContent="center"
                height={"calc(100vh - 75px)"}
                sx={{
                  display: {
                    xs: "none",
                    lg: "flex",
                  },
                }}
              >
                <Image
                  src={"/images/backgrounds/login-bg.svg"}
                  alt="bg"
                  width={500}
                  height={500}
                  style={{
                    width: "100%",
                    maxWidth: "500px",
                    maxHeight: "500px",
                  }}
                />
              </Box>
            </Box>
          </Grid>
        )}
        <Grid
          display="flex"
          justifyContent="center"
          alignItems="center"
          size={{
            xs: 12,
            sm: 12,
            lg: 5,
            xl: 4,
          }}
        >
          {open == false && (
            <>
              <Box width={"50%"}>
                <AuthLogin
                  title="Welcome to Belcka"
                  subtext={
                    <Typography
                      variant="subtitle1"
                      color="textSecondary"
                      mb={1}
                    >
                      {/* Your Admin Dashboard */}
                    </Typography>
                  }
                />
                <Stack
                  direction="row"
                  spacing={1}
                  mt={1}
                  alignItems={"baseline"}
                >
                  <Typography
                    color="textSecondary"
                    variant="h6"
                    fontWeight="400"
                  >
                    New to Belcka?
                  </Typography>
                  <Box
                    onClick={() => setOpen(true)}
                    fontWeight="500"
                    sx={{
                      textDecoration: "none",
                      color: "primary.main",
                      cursor: "pointer",
                    }}
                  >
                    Create an account
                  </Box>
                </Stack>
              </Box>
            </>
          )}
        </Grid>
        <Grid
          display="flex"
          justifyContent="center"
          alignItems="center"
          mt={0}
          size={{
            xs: 12,
            sm: 12,
            lg: 12,
            xl: 12,
          }}
        >
          {open == true && (
            <PageContainer title="">
              <Card elevation={9} sx={{ p: 4, width: "100%", m: 0 }}>
                <Box>
                  <Logo />
                </Box>
                <Box display={"flex"}>
                  <Box
                    alignItems="center"
                    justifyContent="center"
                    sx={{
                      display: {
                        xs: "none",
                        lg: "flex",
                      },
                    }}
                  >
                    <Image
                      src={"/images/backgrounds/login-bg.svg"}
                      alt="bg"
                      width={500}
                      height={400}
                      style={{
                        width: "100%",
                        maxWidth: "500px",
                        maxHeight: "500px",
                      }}
                    />
                  </Box>
                  <Box>
                    <AuthRegister title="Welcome to Belcka" />
                    <Stack
                      direction="row"
                      spacing={1}
                      mt={1}
                      alignItems={"baseline"}
                    >
                      <Typography
                        color="textSecondary"
                        variant="h6"
                        fontWeight="400"
                      >
                        Already have an Account?
                      </Typography>
                      <Box
                        onClick={() => setOpen(false)}
                        fontWeight="500"
                        sx={{
                          textDecoration: "none",
                          color: "primary.main",
                          cursor: "pointer",
                        }}
                      >
                        Sign In
                      </Box>
                    </Stack>
                  </Box>
                </Box>
              </Card>
            </PageContainer>
          )}
        </Grid>
      </Grid>
    </PageContainer>
  );
}

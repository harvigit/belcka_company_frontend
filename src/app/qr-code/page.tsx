"use client";

import { Avatar, Box, Card, CircularProgress, Typography } from "@mui/material";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";

export default function UserQrPage() {
  const searchParams = useSearchParams();

  const userId = searchParams?.get("user_id") ?? null;
  const companyId = searchParams?.get("company_id") ?? null;

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !companyId) {
      setLoading(false);
      return;
    }

    fetch(
      `${process.env.NEXT_PUBLIC_API_URL}user/qr-code?user_id=${userId}&company_id=${companyId}`
    )
      .then((res) => res.json())
      .then((res) => {
        if (!res.IsSuccess) return;

        setUser({
          id: res.info.id,
          code: res.info.user_code,
          name: res.info.user_name,
          email: res.info.email,
          phone: res.info.phone_with_extension,
          trade: res.info.trade_name,
          company_name: res.info.company_name,
          company_logo: res.info.company_logo,
          photo: res.info.user_image,
        });
      })
      .finally(() => setLoading(false));
  }, [userId, companyId]);

  if (loading) {
    return (
      <Box
        minHeight="100vh"
        display="flex"
        justifyContent="center"
        alignItems="center"
        bgcolor="#ffffff"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return (
      <Box
        minHeight="100vh"
        display="flex"
        justifyContent="center"
        alignItems="center"
        bgcolor="#ffffff"
      >
        <Typography color="error">Invalid or expired QR code</Typography>
      </Box>
    );
  }

  return (
    <Box minHeight="100vh" bgcolor="#f5f5f5" p={3}>
      <Box minHeight="45vh" bgcolor="#ffffff" p={3}>
        {/* Logo at top left */}
        <Box mb={2}>
          <Image
            src="/images/logos/belcka.svg"
            alt="Belcka"
            width={140}
            height={60}
          />
        </Box>

        {/* Centered Card Container */}
        <Box display="flex" justifyContent="center" alignItems="flex-start">
          <Box maxWidth={800} width="100%">
            <Card
              sx={{
                boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.08)",
                borderRadius: 2,
                position: "relative",
                p: 3,
                bgcolor: "#ffffff",
              }}
            >
              {/* Company Logo in top right */}
              {user.company_logo && (
                <Box
                  component="img"
                  src={user.company_logo}
                  alt={user.company_name}
                  sx={{
                    width: 50,
                    height: 50,
                    position: "absolute",
                    top: 25,
                    right: 25,
                    objectFit: "contain",
                  }}
                />
              )}

              <Box
                display="flex"
                gap={3}
                sx={{
                  "@media (max-width: 768px)": {
                    flexDirection: "column",
                  },
                }}
              >
                {/* Avatar */}
                <Box>
                  <Avatar
                    src={user.photo || undefined}
                    sx={{
                      width: 90,
                      height: 90,
                      border: "1px solid #e0e0e0",
                    }}
                  />
                </Box>
              </Box>

              <Box
                flex={1}
                display="flex"
                gap={4}
                sx={{
                  "@media (max-width: 768px)": {
                    flexDirection: "column",
                    gap: 0,
                  },
                }}
              >
                {/* Left Column */}
                <Box flex={1}>
                  {user.code && (
                    <Box
                      mt={3}
                      mb={1.2}
                      display="flex"
                      alignContent={"center"}
                      gap={1}
                    >
                      <Typography
                        variant="h6"
                        fontWeight={500}
                        sx={{
                          lineHeight: 1.6,
                          whiteSpace: "nowrap",
                        }}
                      >
                        ID :
                      </Typography>

                      <Typography
                        variant="h6"
                        sx={{
                          wordBreak: "break-word",
                          overflowWrap: "anywhere",
                          lineHeight: 1.6,
                        }}
                      >
                        {user.code}
                      </Typography>
                    </Box>
                  )}

                  {user.name && (
                    <Box
                      mt={1}
                      mb={1.2}
                      display="flex"
                      alignContent={"center"}
                      gap={1}
                    >
                      <Typography
                        variant="h6"
                        fontWeight={500}
                        sx={{
                          lineHeight: 1.6,
                          whiteSpace: "nowrap",
                        }}
                      >
                        Name :
                      </Typography>
                      <Typography variant="h6">{user.name}</Typography>
                    </Box>
                  )}

                  {user.trade && (
                    <Box
                      mt={1}
                      mb={1.2}
                      display="flex"
                      alignContent={"center"}
                      gap={1}
                    >
                      <Typography
                        variant="h6"
                        fontWeight={500}
                        sx={{
                          lineHeight: 1.6,
                          whiteSpace: "nowrap",
                        }}
                      >
                        Trade :
                      </Typography>
                      <Typography variant="h6">{user.trade}</Typography>
                    </Box>
                  )}

                  {user.phone && (
                    <Box
                      mt={1}
                      mb={1.2}
                      display="flex"
                      alignContent={"center"}
                      gap={1}
                    >
                      <Typography
                        variant="h6"
                        fontWeight={500}
                        sx={{
                          lineHeight: 1.6,
                          whiteSpace: "nowrap",
                        }}
                      >
                        Phone :
                      </Typography>
                      <Typography variant="h6">{user.phone}</Typography>
                    </Box>
                  )}
                </Box>

                <Box flex={1}>
                  {user.company_name && (
                    <Box
                      mb={1.2}
                      display="flex"
                      alignContent={"center"}
                      gap={1}
                    >
                      <Typography
                        variant="h6"
                        fontWeight={500}
                        sx={{
                          lineHeight: 1.6,
                          whiteSpace: "nowrap",
                        }}
                      >
                        Company name :
                      </Typography>
                      <Typography variant="h6">{user.company_name}</Typography>
                    </Box>
                  )}

                  {user.email && (
                    <Box
                      mb={1.2}
                      display="flex"
                      alignContent={"center"}
                      gap={1}
                    >
                      <Typography
                        variant="h6"
                        fontWeight={500}
                        sx={{
                          lineHeight: 1.6,
                          whiteSpace: "nowrap",
                        }}
                      >
                        Email :
                      </Typography>
                      <Typography variant="h6">{user.email}</Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Card>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

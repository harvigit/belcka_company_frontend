"use client";

import { Grid, Box, Typography } from "@mui/material";
import { Container } from "@mui/system";
import {
  IconMailCheck,
  IconMailDown,
  IconMailQuestion,
} from "@tabler/icons-react";

export default function PrivacyPolicy() {
  return (
    <Box>
      <Box
        bgcolor="primary.light"
        sx={{
          paddingTop: {
            xs: "40px",
            lg: "100px",
          },
          paddingBottom: {
            xs: "40px",
            lg: "100px",
          },
        }}
      >
        <Container maxWidth="md">
          <Grid container spacing={3} justifyContent="space-between">
            <Grid
              alignItems="center"
              size={{
                xs: 12,
                lg: 6,
              }}
            >
              <Typography
                variant="h1"
                mb={3}
                lineHeight={1.4}
                fontWeight={700}
                fontSize={"30px !important"}
              >
                Help & Support
              </Typography>
            </Grid>
            <Grid
              display="flex"
              alignItems="center"
              size={{
                xs: 12,
                lg: 6,
              }}
            >
              <Typography lineHeight={1.9}>
                Welcome to the Belcka ERP Help Center. We&#39;re here to help
                you make the most of your Belcka ERP experience. Whether you
                need assistance with setup, user management, reports, or any
                module, you&#39;ll find helpful information here.
              </Typography>
            </Grid>
          </Grid>
        </Container>
      </Box>
      <Box mt={3} mb={2}>
        <Grid container justifyContent="center">
          <Grid
            pr={2}
            pl={2}
            size={{
              xs: 12,
              lg: 5,
              sm: 8,
            }}
          >
            <Typography variant="h2" mb={2} lineHeight={1.4} fontWeight={700}>
              Getting Started
            </Typography>
            <Typography lineHeight={1.0} mb={1}>
              If you&#39;re new to Belcka ERP, here are some key areas to
              explore:
            </Typography>
            <Box ml={2}>
              <Typography lineHeight={1.5} fontWeight={700}>
                Dashboard Overview:
              </Typography>
              <Typography mb={1}>
                Monitor your company&#39;s performance in real time.
              </Typography>
              <Typography lineHeight={1.5} fontWeight={700}>
                User Management:
              </Typography>
              <Typography mb={1}>
                Add, edit, and manage users with specific roles.
              </Typography>
              <Typography lineHeight={1.5} fontWeight={700}>
                Sales & Purchase:
              </Typography>
              <Typography mb={1}>
                Manage your transactions efficiently.
              </Typography>
              <Typography lineHeight={1.5} fontWeight={700}>
                Inventory:
              </Typography>
              <Typography mb={1}>
                Keep track of your stock and product movements.
              </Typography>
              <Typography lineHeight={1.5} fontWeight={700}>
                Reports:
              </Typography>
              <Typography mb={1}>
                Generate and export detailed business insights.
              </Typography>
            </Box>
            <Typography>
              <b>Common Help Topics</b>
            </Typography>

            <Box ml={2}>
              <Typography mb={1}>
                Creating new users and assigning roles
              </Typography>
              <Typography mb={1}>
                Managing permissions and access levels
              </Typography>
              <Typography mb={1}>Importing and exporting data</Typography>
              <Typography mb={1}>Customizing company settings</Typography>
              <Typography mb={1}>
                Troubleshooting login or performance issues
              </Typography>
            </Box>

            <Typography mb={1}>
              <b>Need Help?</b>
            </Typography>
            <Typography>
              If you need further assistance or have any questions, our support
              team is here for you.
            </Typography>
            <Typography>
              <Typography style={{ display: "flex", alignItems: "center" }}>
                {" "}
                <IconMailCheck /> Email us at:{" "}
                <a href="#" style={{ display: "flex", alignItems: "center" }}>
                  {" "}
                  [support@belcka.com]
                </a>
              </Typography>
            </Typography>
          </Grid>
        </Grid>
      </Box>
      <Box
        bgcolor="primary.light"
        borderRadius={0}
        sx={{
          paddingTop: {
            xs: "20px",
            lg: "20px",
          },
          paddingBottom: {
            xs: "20px",
            lg: "30px",
          },
        }}
      ></Box>
    </Box>
  );
}

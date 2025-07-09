"use client";

import { Grid, Box, Typography, useTheme, Button, Paper, CardContent } from "@mui/material";
import { Container, Stack } from "@mui/system";

export default function AppInfo() {

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
            <Container maxWidth="lg">
                <Grid container spacing={3} justifyContent="center">
                    <Grid
                        alignItems="center"
                        textAlign="center"
                        size={{
                            xs: 12,
                            lg: 8
                        }}>
                        <Typography color="primary.main" textTransform="uppercase" fontSize="13px">Contact Details</Typography>
                        <Typography variant="h1" mb={3} lineHeight={1.4} fontWeight={700} sx={{
                            fontSize: {
                                xs: '34px', sm: '48px', lg: '56px'
                            }
                        }}>App Info</Typography>
                    </Grid>
                </Grid>

            </Container>
      </Box>
        <Box mt={3} mb={2}>
            <Grid container justifyContent="center">
                <Grid pr={2} pl={2} size={{ xs: 12, lg: 4, sm: 8 }}>
                    <Paper variant="outlined" sx={{ borderRadius: "16px" }}>
                    <CardContent sx={{ p: "48px !important" }}>
                        <Stack direction="row" alignItems="center" gap={3} mb={3}>
                        <Typography variant="body1">
                            <b>App Name:</b> Belcka
                        </Typography>
                        </Stack>
                        <Typography variant="body1" mb={2}>
                            <b>Version:</b> 1.0.0
                        </Typography>
                        <Typography variant="body1" mt={3}>
                            <b>Developer:</b> Belcka Technologies Pvt. Ltd.
                        </Typography>
                    </CardContent>
                    </Paper>
                </Grid>
            </Grid>
      </Box>
    </Box>
  );
}

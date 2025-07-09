import React from "react";
import { Card, CardContent, Typography, Box, Fab } from "@mui/material";
import { IconCurrencyDollar } from "@tabler/icons-react";

const Earnings = () => (
  <Card
    sx={{
      backgroundColor: (theme) => theme.palette.primary.main,
      color: 'white',
    }}
  >
    <CardContent>
      <Box display="flex" alignItems="flex-start">
        <Typography
          variant="h3"
          sx={{
            marginBottom: '0',
          }}
          gutterBottom
        >
          Earnings
        </Typography>
        <Box
          sx={{
            marginLeft: 'auto',
          }}
        >
          <Fab
            size="medium"
            color="secondary"
            aria-label="add"
          >
            <IconCurrencyDollar width="21" height="21" />

          </Fab>
        </Box>
      </Box>
      <Typography
        variant="h1"
        fontWeight="500" mt={3} mb={0}
        gutterBottom
      >
        $93,438.78
      </Typography>
      <Typography
        variant="h6"
        fontWeight="400"
        sx={{
          marginBottom: '0',
          opacity: '0.6',
        }}
        gutterBottom
      >
        Monthly Revenue
      </Typography>
    </CardContent>
  </Card>
);

export default Earnings;

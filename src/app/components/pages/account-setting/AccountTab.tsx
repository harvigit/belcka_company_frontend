import React from "react";
import {
  CardContent,
  Grid,
  Typography,
  Box,
  Avatar,
  Button,
} from "@mui/material";

// components
import BlankCard from "../../shared/BlankCard";
import CustomTextField from "../../forms/theme-elements/CustomTextField";
import CustomFormLabel from "../../forms/theme-elements/CustomFormLabel";
import { useSession } from "next-auth/react";

// images
import { Stack } from "@mui/system";
import { User } from "next-auth";

const AccountTab = () => {
  const session = useSession();
  let url = process.env.NEXT_PUBLIC_API_URL;

  const user = session.data?.user as User & { user_role?: string | null } & {
    phone?: number | null;
  } & { user_image?: string | null } & { first_name?: string | null } & {
    last_name?: string | null;
  };

  return (
    <Grid container spacing={3}>
      {/* Change Profile */}
      <Grid
        size={{
          xs: 12,
          lg: 6,
        }}
      >
        <BlankCard>
          <CardContent>
            <Typography variant="h5" mb={1}>
              Change Profile
            </Typography>
            <Typography color="textSecondary" mb={3}>
              Change your profile picture from here
            </Typography>
            <Box textAlign="center" display="flex" justifyContent="center">
              <Box>
                <Avatar
                  src={
                    user?.user_image
                      ? `${user.user_image}`
                      : "/favicon.svg"
                  }
                  // src={"/images/logos/logoIcon.svg"}
                  alt={user.first_name || ''}
                  sx={{ width: 120, height: 120, margin: "0 auto" }}
                />
                <Stack
                  direction="row"
                  justifyContent="center"
                  spacing={2}
                  my={3}
                >
                  <Button variant="contained" color="primary" component="label">
                    Upload
                    <input hidden accept="image/*" multiple type="file" />
                  </Button>
                  <Button variant="outlined" color="error">
                    Reset
                  </Button>
                </Stack>
                <Typography variant="subtitle1" color="textSecondary" mb={4}>
                  Allowed JPG, GIF or PNG. Max size of 800K
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </BlankCard>
      </Grid>
      {/*  Change Password */}
      <Grid
        size={{
          xs: 12,
          lg: 6,
        }}
      >
        <BlankCard>
          <CardContent>
            <Typography variant="h5" mb={1}>
              Change Password
            </Typography>
            <Typography color="textSecondary" mb={3}>
              To change your password please confirm here
            </Typography>
            <form>
              <CustomFormLabel
                sx={{
                  mt: 0,
                }}
                htmlFor="text-cpwd"
              >
                Current Password
              </CustomFormLabel>
              <CustomTextField
                id="text-cpwd"
                value="MathewAnderson"
                variant="outlined"
                fullWidth
                type="password"
              />
              {/* 2 */}
              <CustomFormLabel htmlFor="text-npwd">
                New Password
              </CustomFormLabel>
              <CustomTextField
                id="text-npwd"
                value="MathewAnderson"
                variant="outlined"
                fullWidth
                type="password"
              />
              {/* 3 */}
              <CustomFormLabel htmlFor="text-conpwd">
                Confirm Password
              </CustomFormLabel>
              <CustomTextField
                id="text-conpwd"
                value="MathewAnderson"
                variant="outlined"
                fullWidth
                type="password"
              />
            </form>
          </CardContent>
        </BlankCard>
      </Grid>
      {/* Edit Details */}
      <Grid size={12}>
        <BlankCard>
          <CardContent>
            <Typography variant="h5" mb={1}>
              Personal Details
            </Typography>
            <Typography color="textSecondary" mb={3}>
              To change your personal detail , edit and save from here
            </Typography>
            <form>
              <Grid container spacing={3}>
                <Grid
                  size={{
                    xs: 12,
                    sm: 6,
                  }}
                >
                  <CustomFormLabel
                    sx={{
                      mt: 0,
                    }}
                    htmlFor="text-name"
                  >
                    Your Name
                  </CustomFormLabel>
                  <CustomTextField
                    id="text-name"
                    value={user?.first_name + "" + user?.last_name}
                    variant="outlined"
                    fullWidth
                  />
                </Grid>
                <Grid
                  size={{
                    xs: 12,
                    sm: 6,
                  }}
                >
                  {/* 2 */}
                  <CustomFormLabel
                    sx={{
                      mt: 0,
                    }}
                    htmlFor="text-store-name"
                  >
                    Role
                  </CustomFormLabel>
                  <CustomTextField
                    id="text-store-name"
                    value={user?.user_role?.toUpperCase() || ""}
                    variant="outlined"
                    fullWidth
                    InputProps={{
                      readOnly: true,
                      style: {
                        textTransform: "uppercase",
                        cursor: "not-allowed",
                        backgroundColor: "#ebebeb",
                      },
                    }}
                  />
                </Grid>
                <Grid
                  size={{
                    xs: 12,
                    sm: 6,
                  }}
                >
                  {/* 5 */}
                  <CustomFormLabel
                    sx={{
                      mt: 0,
                    }}
                    htmlFor="text-email"
                  >
                    Email
                  </CustomFormLabel>
                  <CustomTextField
                    id="text-email"
                    value={user?.email}
                    variant="outlined"
                    fullWidth
                  />
                </Grid>
                <Grid
                  size={{
                    xs: 12,
                    sm: 6,
                  }}
                >
                  {/* 6 */}
                  <CustomFormLabel
                    sx={{
                      mt: 0,
                    }}
                    htmlFor="text-phone"
                  >
                    Phone
                  </CustomFormLabel>
                  <CustomTextField
                    id="text-phone"
                    value={user?.phone}
                    variant="outlined"
                    fullWidth
                  />
                </Grid>
              </Grid>
            </form>
          </CardContent>
        </BlankCard>
        <Stack
          direction="row"
          spacing={2}
          sx={{ justifyContent: "end" }}
          mt={3}
        >
          <Button size="large" variant="contained" color="primary">
            Save
          </Button>
          <Button size="large" variant="text" color="error">
            Cancel
          </Button>
        </Stack>
      </Grid>
    </Grid>
  );
};

export default AccountTab;

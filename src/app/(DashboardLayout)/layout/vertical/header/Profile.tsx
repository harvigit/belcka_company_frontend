import React, { useState } from "react";
import { useTheme } from "@mui/material/styles";
import Link from "next/link";
import {
  Box,
  Menu,
  Avatar,
  Typography,
  Divider,
  Button,
} from "@mui/material";
import { Stack } from "@mui/system";
import {
  IconChevronDown,
  IconCurrencyDollar,
  IconMail,
} from "@tabler/icons-react";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { User } from "next-auth";

const Profile = () => {
  const [anchorEl2, setAnchorEl2] = useState<HTMLElement | null>(null);
  const handleClick2 = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl2(event.currentTarget);
  };
  const handleClose2 = () => {
    setAnchorEl2(null);
  };
  const session = useSession();
  const user = session?.data?.user as User & { user_role?: string | null } & {
      phone?: number | null;
    } & { user_image?: string | null } & { first_name?: string | null } & {
      last_name?: string | null;
    };
  const [loading] = useState(false);

  const userLogout = () => {
    toast.success("Logged out successfully!!")
    signOut({ callbackUrl: "/auth" });
    return loading;
  };

  const theme = useTheme();

  return (
    <Box>
      <Button
        size="large"
        aria-label="menu"
        color="inherit"
        aria-controls="msgs-menu"
        aria-haspopup="true"
        sx={{
          ...(typeof anchorEl2 === "object" && {
            borderRadius: "9px",
          }),
        }}
        onClick={handleClick2}
      >
        <Avatar
         src={user?.user_image ? `${user?.user_image}` : "/images/logos/belcka_logo.png"}
          // src={"/images/logos/belcka_logo.png"}
          alt={user.first_name || ''}
          sx={{
            width: 30,
            height: 30,
          }}
        />
        <Box
          sx={{
            display: {
              xs: "none",
              sm: "flex",
            },
            alignItems: "center",
          }}
        >
          <Typography
            color="textprimary"
            variant="h5"
            fontWeight="400"
            sx={{ ml: 1 }}
          >
            Hi,
          </Typography>
          <Typography
            variant="h5"
            fontWeight="700"
            sx={{
              ml: 1,
            }}
          >
            {user?.first_name} {user?.last_name}
          </Typography>
          <IconChevronDown width="20" height="20" />
        </Box>
      </Button>
      {/* ------------------------------------------- */}
      {/* Message Dropdown */}
      {/* ------------------------------------------- */}
      <Menu
        id="msgs-menu"
        anchorEl={anchorEl2}
        keepMounted
        open={Boolean(anchorEl2)}
        onClose={handleClose2}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        sx={{
          "& .MuiMenu-paper": {
            width: "360px",
            p: 4,
            pb: 2,
          },
        }}
      >
        <Typography variant="h4">User Profile</Typography>
        <Stack direction="row" py={3} spacing={2} alignItems="center">
          <Avatar
            src={user?.user_image ? `${user?.user_image}` : "/images/logos/belcka_logo.png"}
            // src={"/images/logos/logoIcon.svg"}
            alt={user?.first_name || ''}
            sx={{ width: 95, height: 95 }}
          />
          <Box>
            <Typography variant="h4" color="textPrimary">
            {user?.first_name} {user?.last_name}
            </Typography>
            <Typography variant="h6" color="textSecondary">
              Administrator
            </Typography>
            <Typography
              variant="subtitle2"
              color="textSecondary"
              display="flex"
              alignItems="center"
              gap={1}
            >
              <IconMail width="18" height="18" />
              {user?.email}
            </Typography>
          </Box>
        </Stack>

        <Box mt={2}>
          <Button
            onClick={userLogout}
            variant="outlined"
            color="secondary"
            fullWidth
          >
            Logout
          </Button>
        </Box>
      </Menu>
    </Box>
  );
};

export default Profile;

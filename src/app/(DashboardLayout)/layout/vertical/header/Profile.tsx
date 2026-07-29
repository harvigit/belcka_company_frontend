import React, { useState } from "react";
import { useTheme } from "@mui/material/styles";
import { Box, Menu, Avatar, Typography, Button } from "@mui/material";
import { Stack } from "@mui/system";
import { IconChevronDown, IconMail } from "@tabler/icons-react";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { User } from "next-auth";
import Cookies from "js-cookie";
import Link from "next/link";

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
  } & { trade_name: string | null } & { company_id?: number | null };
  const [loading] = useState(false);

  const userLogout = async () => {
    toast.success("Logged out successfully!!");
    Cookies.remove(`user_store_${user.id}_${user.company_id}`);
    await signOut({ callbackUrl: "/auth" });
    return loading;
  };

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
          src={user?.user_image || "/default-avatar.png"}
          alt={user?.first_name || "User"}
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
            className="f-14"
            sx={{
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 3,
              overflow: "hidden",
              textOverflow: "ellipsis",
              lineHeight: 1.25,
              maxWidth: 150,
              wordBreak: "break-word",
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
            pt: 2,
          },
        }}
      >
        <Typography variant="h4" mb={1}>
          User Profile
        </Typography>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems={{ xs: "center", sm: "flex-start" }}
          textAlign={{ xs: "center", sm: "left" }}
        >
          <Link href={`/apps/users/${user.id}`} passHref>
            <Avatar
              src={user?.user_image || "/default-avatar.png"}
              alt={user?.first_name || "User"}
              sx={{
                width: { xs: 70, sm: 85 },
                height: { xs: 70, sm: 85 },
              }}
            />
          </Link>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Link href={`/apps/users/${user.id}`} passHref>
              <Typography
                variant="h4"
                color="textSecondary"
                sx={{
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical",
                  WebkitLineClamp: 2,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  wordBreak: "break-word",
                  cursor: "pointer",
                  "&:hover": { color: "#173f98" },
                }}
              >
                {user?.first_name} {user?.last_name}
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{
                  textTransform: "capitalize",
                  mt: 0.5,
                }}
              >
                {user?.trade_name ?? user?.user_role}
              </Typography>
            </Link>

            {user?.email && (
              <Box
                display="flex"
                alignItems="center"
                sx={{
                  mt: 1,
                  color: "text.secondary",
                }}
              >
                <IconMail size={18} />
                <Typography
                  variant="body2"
                  sx={{
                    flexWrap: "wrap",
                    display: "-webkit-box",
                    WebkitBoxOrient: "vertical",
                    WebkitLineClamp: 2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    wordBreak: "break-word",
                  }}
                >
                  {user.email}
                </Typography>
              </Box>
            )}
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

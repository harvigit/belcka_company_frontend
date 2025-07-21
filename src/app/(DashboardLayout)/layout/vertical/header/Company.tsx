import React, { useContext, useState } from "react";
import { useEffect } from "react";
import { Box } from "@mui/system";
import {
  Avatar,
  CircularProgress,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
} from "@mui/material";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import api from "@/utils/axios";
import toast from "react-hot-toast";

const Company = () => {
  const [companies, setCompanies] = useState<any[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const session = useSession();

  const user = session.data?.user as User & { company_id?: string | null } & {
    company_name?: string | null;
  } & {
    company_image?: number | null;
  } & { id: number };

  // Fetch user companies
  useEffect(() => {
    const fetchCompanies = async () => {
      setLoading(true);
      try {
        const response = await api.get(
          `user/switch-company-list?user_id=${user.id}`
        );
        setCompanies(response.data.info);
      } catch (error) {
        console.error("Error fetching companies:", error);
      }
      setLoading(false);
    };

    fetchCompanies();
  }, []);

  const handleAvatarClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  // Handle closing the dropdown menu
  const handleClose = () => {
    setAnchorEl(null);
  };

  // Handle company selection from the dropdown
  const handleCompanyChange = async (companyId: number) => {
    try {
      const payload = {
        company_id: companyId,
        user_id: user.id,
      };
      const response = await api.post("company/switch-company", payload);
      if (response.data.IsSuccess == true) {
        toast.success(response.data.message);
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error("Failed to save data:", error);
    }
    handleClose();
  };

  return (
    <Box>
      {user.company_image && (
        <Tooltip title={user.company_name || "Select Company"}>
          <Avatar
            src={user?.company_image ? `${user.company_image}` : ""}
            alt={user.company_name || ""}
            sx={{
              width: 30,
              height: 30,
              margin: "0 auto",
              cursor: "pointer",
            }}
            onClick={handleAvatarClick}
          />
        </Tooltip>
      )}

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
        <MenuItem value="" disabled>
          Switch company
        </MenuItem>
        {companies.map((company) => (
          <MenuItem
            key={company.id}
            selected={user.company_id == company.id}
            onClick={() => handleCompanyChange(company.id)}
          >
            <ListItemText primary={company.name} />
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

export default Company;

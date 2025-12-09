import {
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import { Grid, Stack } from "@mui/system";
import "react-phone-input-2/lib/material.css";
import { SetStateAction, useEffect, useState } from "react";
import PhoneInput from "react-phone-input-2";
import api from "@/utils/axios";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { User } from "next-auth";
import { IconX } from "@tabler/icons-react";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

export type ProjectList = {
  id: number;
  name: string;
  currency: string | null;
  address: string;
  budget: string;
  start_date?: string;
  end_date?: string;
  description?: string;
  progress: string;
  check_ins: number;
  salary: number | null;
  materials: number | null;
  profit: number | null;
  date_added: string;
  expire_date: string;
};

interface Props {
  open: boolean;
  onClose: () => void;
  onWorkUpdated?: () => void;
}

const AuthRegister = ({ open, onClose, onWorkUpdated }: Props) => {
  const [email, setEmail] = useState("");
  const [firstName, setfirstName] = useState("");
  const [lastName, setlastName] = useState("");
  const [expireDate, setExpireDate] = useState("");

  const session = useSession();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<ProjectList[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<ProjectList[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const user = session.data?.user as User & { company_id?: string | null };
  const handleRegister = async (e: React.FormEvent) => {
    setLoading(true);
    e.preventDefault();

    try {
      const selectedIds = selectedProjects.map((p) => p.id).join(",");

      const payload = {
        first_name: firstName,
        last_name: lastName,
        email,
        user_role_id: 3,
        company_id: user.company_id,
        project_ids: selectedIds,
        expire_date: expireDate,
      };

      const response = await api.post("company-clients/registration", payload);

      if (response.data.IsSuccess === true) {
        onWorkUpdated?.();
        toast.success(response.data.message);
        setInviteLink(response.data.info.invited_link);
        setInviteDialogOpen(true);
        setfirstName("");
        setlastName("");
        setEmail("");
        setExpireDate("");
        setSelectedProjects([]);
      }
    } catch (error: any) {
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await api.get(`project/get?company_id=${user.company_id}`);
      if (res.data?.info) {
        setProjects(res.data.info);
      }
    } catch (err) {
      console.error("Failed to fetch projects", err);
    }
  };
  useEffect(() => {
    if (user.company_id) {
      fetchProjects();
    }
  }, [user.company_id, user.id,fetchProjects]);

  const handleCopyCode = (invite_link: string | null) => {
    const codeToCopy = invite_link ?? "";

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard
        .writeText(codeToCopy)
        .then(() => toast.success("Code copied!"))
        .catch((err) => {
          console.error("Clipboard API failed:", err);
          fallbackCopyCode(codeToCopy);
        });
    } else {
      fallbackCopyCode(codeToCopy);
    }
    onClose()
  };

  const fallbackCopyCode = (codeToCopy: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = codeToCopy;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand("copy");
      toast.success("Invitation link copied!");
    } catch (err) {
      console.error("Fallback failed:", err);
      toast.error("Failed to copy invitation link!");
    } finally {
      document.body.removeChild(textArea);
    }
  };
  return (
    <>
      <Box sx={{ p: 3,pt:1, marginBottom: 4 }}>
        <Grid
          size={{
            xs: 12,
            lg: 12,
          }}
        >
          <Box>
            <form onSubmit={handleRegister}>
              <Stack mb={3}>
                <Box display={"flex"} gap={3}>
                  <Box className="form_inputs">
                    <Typography variant="caption" mt={2}>
                      First Name
                    </Typography>
                    <CustomTextField
                      id="first_name"
                      variant="outlined"
                      fullWidth
                      value={firstName}
                      onChange={(e: {
                        target: { value: SetStateAction<string> };
                      }) => setfirstName(e.target.value)}
                    />
                  </Box>
                  <Box className="form_inputs">
                    <Typography variant="caption" mt={2}>
                      Last Name
                    </Typography>
                    <CustomTextField
                      id="lastname"
                      variant="outlined"
                      fullWidth
                      value={lastName}
                      onChange={(e: {
                        target: { value: SetStateAction<string> };
                      }) => setlastName(e.target.value)}
                    />
                  </Box>
                </Box>
                <Box display={"flex"} gap={3}>
                  <Box className="form_inputs" mt={3}>
                    <Typography variant="caption">Email Address</Typography>
                    <CustomTextField
                      id="email"
                      variant="outlined"
                      fullWidth
                      value={email}
                      onChange={(e: {
                        target: { value: SetStateAction<string> };
                      }) => setEmail(e.target.value)}
                    />
                  </Box>
                  <Box className="form_inputs" mt={3}>
                    <Typography>Select Projects</Typography>
                    <Autocomplete
                      fullWidth
                      multiple
                      id="project_id"
                      options={projects}
                      open={dialogOpen}
                      onOpen={() => setDialogOpen(true)}
                      onClose={() => setDialogOpen(false)}
                      value={selectedProjects}
                      onChange={(event, newValue) => {
                        setSelectedProjects(newValue);
                      }}
                      getOptionLabel={(option) => option?.name || ""}
                      isOptionEqualToValue={(option, value) =>
                        option.id === value.id
                      }
                      renderInput={(params) => (
                        <CustomTextField
                          {...params}
                          placeholder="Select Projects"
                          onClick={() => setDialogOpen(true)}
                        />
                      )}
                    />
                  </Box>
                </Box>
                <Box display={"flex"} gap={3}>
                  <Box className="form_inputs" mt={3}>
                    <Typography>Select Expiry time</Typography>
                    <CustomTextField
                      type="date"
                      id="invite_date"
                      placeholder="Choose Expiry date"
                      fullWidth
                      value={expireDate}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const newDate = e.target.value;
                        setExpireDate(newDate);
                      }}
                    />
                  </Box>
                  <Box className="form_inputs" mt={3}></Box>
                </Box>
              </Stack>
              <Button
                color="primary"
                variant="contained"
                size="large"
                type="submit"
                disabled={loading}
                sx={{
                  width: "20%",
                }}
              >
                {loading ? "Saving..." : "Add Client"}
              </Button>
            </form>
            <Dialog
              fullWidth
              maxWidth="sm"
              open={inviteDialogOpen}
              onClose={() => setInviteDialogOpen(false)}
            >
              <Box
                display={"flex"}
                justifyContent={"space-between"}
                mr={1}
                mt={2}
              >
                <DialogTitle>Invitation Link</DialogTitle>
                <IconButton onClick={() => setInviteDialogOpen(false)}>
                  <IconX />
                </IconButton>
              </Box>
              <DialogContent sx={{ pt: 1 }}>
                <Box display="flex" gap={2} justifyContent="center">
                  <TextField
                    fullWidth
                    value={inviteLink}
                    variant="outlined"
                    InputProps={{ readOnly: true }}
                  />
                  <Button
                    variant="outlined"
                    onClick={() => handleCopyCode(inviteLink)}
                  >
                    <ContentCopyIcon />
                  </Button>
                </Box>
              </DialogContent>
            </Dialog>
          </Box>
        </Grid>
      </Box>
    </>
  );
};

export default AuthRegister;

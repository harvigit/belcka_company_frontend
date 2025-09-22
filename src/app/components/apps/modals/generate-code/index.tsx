import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CloseIcon from "@mui/icons-material/Close";
import toast from "react-hot-toast";

interface GenerateCodeDialogProps {
  open: boolean;
  onClose: () => void;
  onGenerate: () => Promise<string>;
}

const GenerateCodeDialog: React.FC<GenerateCodeDialogProps> = ({
  open,
  onClose,
  onGenerate,
}) => {
  const [code, setCode] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const generatedCode = await onGenerate();
      setCode(generatedCode);

      setResendTimer(15 * 60); // 15 minute
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      intervalRef.current = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      toast.error("Failed to generate code");
    } finally {
      setIsGenerating(false);
    }
  };
  const handleCopyCode = (code: string | null) => {
    const codeToCopy = code ?? "";

    // Always use fallback for HTTP
    const textArea = document.createElement("textarea");
    textArea.value = codeToCopy;
    textArea.style.position = "fixed"; // avoid scrolling
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.width = "1px";
    textArea.style.height = "1px";
    textArea.style.padding = "0";
    textArea.style.border = "none";
    textArea.style.outline = "none";
    textArea.style.boxShadow = "none";
    textArea.style.background = "transparent";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand("copy");
      if (successful) toast.success("Code copied!");
      else toast.error("Failed to copy code!");
    } catch (err) {
      console.error("Fallback failed:", err);
      toast.error("Failed to copy code!");
    } finally {
      document.body.removeChild(textArea);
    }
  };

  // const fallbackCopyCode = (codeToCopy: string) => {
  //   const textArea = document.createElement("textarea");
  //   textArea.value = codeToCopy;
  //   document.body.appendChild(textArea);
  //   textArea.select();
  //   try {
  //     document.execCommand("copy");
  //     toast.success("code copied!");
  //   } catch (err) {
  //     console.error("Fallback failed:", err);
  //     toast.error("Failed to copy code!");
  //   } finally {
  //     document.body.removeChild(textArea);
  //   }
  // };

  // Start timer on code set
  useEffect(() => {
    if (code) {
      intervalRef.current = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [code]);

  const formatTimer = () => {
    const m = Math.floor(resendTimer / 60)
      .toString()
      .padStart(2, "0");
    const s = (resendTimer % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const renderCodeBoxes = () => {
    if (!code) return null;
    return (
      <Box sx={{ display: "flex", gap: 1, justifyContent: "center", mt: 2 }}>
        {code.split("").map((digit, i) => (
          <Box
            key={i}
            sx={{
              width: 40,
              height: 50,
              borderRadius: 2,
              border: "1px solid #ccc",
              fontSize: 24,
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#f5f5f5",
            }}
          >
            {digit}
          </Box>
        ))}
      </Box>
    );
  };

  const handleDialogClose = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setCode(null);
    setResendTimer(0);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleDialogClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ pr: 4 }}>
        Generate Code
        <IconButton
          aria-label="close"
          onClick={handleDialogClose}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ textAlign: "center", minHeight: 120 }}>
        {!code && (
          <Typography>Are you sure you want to generate a new code?</Typography>
        )}

        {isGenerating && <Typography>Generating code...</Typography>}

        {code && (
          <>
            <Typography sx={{ mt: 1 }}>Random code generator</Typography>
            {renderCodeBoxes()}

            <Typography sx={{ mt: 2, color: "text.secondary" }}>
              Resend code in {formatTimer()}
            </Typography>

            <Button
              variant="outlined"
              startIcon={<ContentCopyIcon />}
              sx={{ mt: 2 }}
              onClick={() => handleCopyCode(code)}
            >
              Copy Code
            </Button>

            <Button
              sx={{ mt: 2, ml: 3 }}
              variant="text"
              disabled={resendTimer > 0 || isGenerating}
              onClick={handleGenerate}
            >
              Resend Code
            </Button>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ justifyContent: "center" }}>
        {!code && (
          <>
            <Button onClick={handleDialogClose} disabled={isGenerating}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              Confirm
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default GenerateCodeDialog;

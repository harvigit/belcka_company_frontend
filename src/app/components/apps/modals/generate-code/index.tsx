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

  // Unified copy function
  const copyToClipboard = (text: string) => {
    if (!text) return toast.error("Nothing to copy");

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard
          .writeText(text)
          .then(() => toast.success("Copied!"));
        return;
      }

      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.width = "1px";
      textArea.style.height = "1px";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);

      if (successful) toast.success("Copied!");
      else throw new Error("Fallback copy failed");
    } catch (err) {
      console.error("Copy failed:", err);
      toast.error("Failed to copy!");
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const generatedCode = await onGenerate();
      if (!generatedCode) return toast.error("No code received");

      setCode(generatedCode); // set code first
      setResendTimer(15 * 60); // 15 minutes

      if (intervalRef.current) clearInterval(intervalRef.current);

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
    if (intervalRef.current) clearInterval(intervalRef.current);
    setCode(null);
    setResendTimer(0);
    onClose();
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

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
              onClick={() => copyToClipboard(code)}
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

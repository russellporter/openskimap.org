import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import * as React from "react";

export function EmbedCode() {
  const [copied, setCopied] = React.useState(false);

  const iframeSrc = React.useMemo(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("about");
    return url.toString();
  }, []);

  const code = `<iframe src="${iframeSrc}" width="600" height="400" frameborder="0"></iframe>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Box sx={{ position: "relative", marginBottom: 2 }}>
      <Tooltip title={copied ? "Copied!" : "Copy"}>
        <IconButton
          onClick={handleCopy}
          size="small"
          sx={{
            position: "absolute",
            top: 4,
            right: 4,
            color: "#d4d4d4",
          }}
        >
          {copied ? (
            <CheckIcon fontSize="small" />
          ) : (
            <ContentCopyIcon fontSize="small" />
          )}
        </IconButton>
      </Tooltip>
      <Typography
        component="pre"
        sx={{
          backgroundColor: "#1e1e1e",
          color: "#d4d4d4",
          padding: 1.5,
          paddingRight: 5,
          borderRadius: 1,
          overflow: "auto",
          fontSize: "0.85rem",
          fontFamily: "monospace",
          margin: 0,
          wordBreak: "break-all",
          whiteSpace: "pre-wrap",
        }}
      >
        <span style={{ color: "#569cd6" }}>&lt;iframe</span>{" "}
        <span style={{ color: "#9cdcfe" }}>src</span>
        <span style={{ color: "#d4d4d4" }}>=</span>
        <span style={{ color: "#ce9178" }}>"{iframeSrc}"</span>{" "}
        <span style={{ color: "#9cdcfe" }}>width</span>
        <span style={{ color: "#d4d4d4" }}>=</span>
        <span style={{ color: "#ce9178" }}>"600"</span>{" "}
        <span style={{ color: "#9cdcfe" }}>height</span>
        <span style={{ color: "#d4d4d4" }}>=</span>
        <span style={{ color: "#ce9178" }}>"400"</span>{" "}
        <span style={{ color: "#9cdcfe" }}>frameborder</span>
        <span style={{ color: "#d4d4d4" }}>=</span>
        <span style={{ color: "#ce9178" }}>"0"</span>
        <span style={{ color: "#569cd6" }}>&gt;&lt;/iframe&gt;</span>
      </Typography>
    </Box>
  );
}

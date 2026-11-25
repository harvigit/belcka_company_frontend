"use client";

import React from "react";
import { Box } from "@mui/material";

/** The words of a search, as the server splits them (punctuation is a space; 2+ characters). */
export const queryWords = (q: string) => [...new Set((q.toLowerCase().match(/[a-z0-9£]+/g) ?? []).filter((w) => w.length >= 2))];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Shows text with the searched words marked, so the user sees why a result came up. */
export const Highlight: React.FC<{ text: string | null | undefined; words: string[] }> = ({ text, words }) => {
  if (!text || !words.length) return <>{text ?? ""}</>;
  const re = new RegExp(`(${[...words].sort((a, b) => b.length - a.length).map(escape).join("|")})`, "gi");
  return (
    <>
      {text.split(re).map((part, i) =>
        i % 2 ? (
          <Box component="mark" key={i} sx={{ bgcolor: "#fff1b8", color: "inherit", fontWeight: 700, borderRadius: 0.5, px: 0.15 }}>
            {part}
          </Box>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        ),
      )}
    </>
  );
};

/** Group title for search results: every word found, or only some. */
export const matchGroup = (o: { match?: "best" | "close" }) => (o.match === "close" ? "Close matches (some words)" : "Best matches");

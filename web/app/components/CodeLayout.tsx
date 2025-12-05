"use client";
import React from "react";
import Link from "next/link";
import {
  Box,
  Typography,
  Button,
  styled,
  keyframes,
} from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";

// Code-style colors (VSCode Dark+ inspired)
export const colors = {
  bg: "#0d1117",
  bgAlt: "#161b22",
  border: "#30363d",
  text: "#c9d1d9",
  textMuted: "#8b949e",
  keyword: "#ff7b72",
  string: "#a5d6ff",
  function: "#d2a8ff",
  variable: "#79c0ff",
  comment: "#8b949e",
  number: "#79c0ff",
  operator: "#ff7b72",
  bracket: "#ffd700",
  success: "#3fb950",
  cursor: "#58a6ff",
  error: "#f85149",
  warning: "#d29922",
};

// Keyframes
export const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

// Styled Components
export const MonoText = styled(Typography)({
  fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace',
});

export const CodeLine = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "4px 0",
  fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace',
  fontSize: "14px",
  lineHeight: 1.6,
});

export const TerminalButton = styled(Button)({
  fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace',
  textTransform: "none",
  padding: "8px 16px",
  borderRadius: "4px",
  fontSize: "13px",
  fontWeight: 500,
});

// Header Component
interface HeaderProps {
  onNewClick?: () => void;
  showNew?: boolean;
  currentPage?: "home" | "workflows";
}

export function Header({ onNewClick, showNew = true, currentPage }: HeaderProps) {
  return (
    <Box
      sx={{
        borderBottom: `1px solid ${colors.border}`,
        px: 4,
        py: 2,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Link href="/" style={{ textDecoration: "none" }}>
        <MonoText
          sx={{
            fontSize: "16px",
            fontWeight: 600,
            color: colors.function,
            cursor: "pointer",
            "&:hover": { opacity: 0.8 },
          }}
        >
          flow<span style={{ color: colors.operator }}>.</span>
          <span style={{ color: colors.variable }}>work</span>
          <span style={{ color: colors.textMuted }}>()</span>
        </MonoText>
      </Link>
      <Box sx={{ display: "flex", gap: 2 }}>
        <Button
          component={Link}
          href="/workflows"
          sx={{
            fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace',
            textTransform: "none",
            padding: "8px 16px",
            borderRadius: "4px",
            fontSize: "13px",
            fontWeight: 500,
            color: currentPage === "workflows" ? colors.text : colors.textMuted,
            bgcolor: currentPage === "workflows" ? colors.bgAlt : "transparent",
            "&:hover": { color: colors.text, bgcolor: colors.bgAlt },
          }}
        >
          workflows
        </Button>
        {showNew && onNewClick && (
          <TerminalButton
            onClick={onNewClick}
            sx={{
              bgcolor: colors.success,
              color: colors.bg,
              "&:hover": { bgcolor: "#2ea043" },
            }}
            startIcon={<AddIcon sx={{ fontSize: 16 }} />}
          >
            new
          </TerminalButton>
        )}
      </Box>
    </Box>
  );
}

// Footer Component
export function Footer() {
  return (
    <Box
      sx={{
        borderTop: `1px solid ${colors.border}`,
        px: 4,
        py: 2,
        mt: "auto",
      }}
    >
      <MonoText
        sx={{
          fontSize: "12px",
          color: colors.comment,
          textAlign: "center",
        }}
      >
        {"/* "}http • timers • webhooks{" */"}
      </MonoText>
    </Box>
  );
}

// Page Layout Component
interface PageLayoutProps {
  children: React.ReactNode;
  onNewClick?: () => void;
  showNew?: boolean;
  currentPage?: "home" | "workflows";
}

export function PageLayout({ children, onNewClick, showNew = true, currentPage }: PageLayoutProps) {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: colors.bg,
        color: colors.text,
        fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace',
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Header onNewClick={onNewClick} showNew={showNew} currentPage={currentPage} />
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {children}
      </Box>
      <Footer />
    </Box>
  );
}


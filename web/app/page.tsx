"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { listWorkflows, createWorkflow, createInstance } from "./api-client";
import { useToast } from "./components/ToastContext";
import {
  PageLayout,
  MonoText,
  CodeLine,
  TerminalButton,
  colors,
  fadeIn,
} from "./components/CodeLayout";
import {
  Box,
  TextField,
  Dialog,
  DialogContent,
  IconButton,
  styled,
} from "@mui/material";
import {
  Close as CloseIcon,
  PlayArrow as PlayIcon,
  Edit as EditIcon,
  List as ListIcon,
} from "@mui/icons-material";

interface Workflow {
  id: string;
  name: string;
  createdAt: string;
}

const WorkflowRow = styled(Box)({
  display: "flex",
  alignItems: "center",
  padding: "12px 16px",
  background: "transparent",
  border: `1px solid transparent`,
  borderRadius: "4px",
  transition: "all 0.15s ease",
  "&:hover": {
    background: colors.bgAlt,
    borderColor: colors.border,
  },
});

const ActionButton = styled("button")({
  fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace',
  fontSize: "11px",
  padding: "4px 10px",
  borderRadius: "3px",
  border: `1px solid ${colors.border}`,
  background: "transparent",
  color: colors.textMuted,
  cursor: "pointer",
  transition: "all 0.15s ease",
  display: "flex",
  alignItems: "center",
  gap: "4px",
  "&:hover": {
    borderColor: colors.textMuted,
    color: colors.text,
  },
});

export default function Page() {
  const router = useRouter();
  const toast = useToast();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState("");

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      const data = await listWorkflows();
      setWorkflows(data);
    } catch (error) {
      console.error("Error fetching workflows:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkflow = async () => {
    if (!newWorkflowName.trim()) {
      toast.showToast("workflow.name is required", "warning");
      return;
    }
    try {
      const created = await createWorkflow(newWorkflowName);
      setShowCreateModal(false);
      setNewWorkflowName("");
      router.push(`/workflows/${created.id}/editor`);
    } catch (error: any) {
      toast.showToast(`Error: ${error.message}`, "error");
    }
  };

  const handleCreateInstance = async (workflowId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const result = await createInstance(workflowId, {});
      if (!result?.instanceId) {
        toast.showToast("Failed to create instance: No instance ID returned", "error");
        return;
      }
      router.push(`/workflows/${workflowId}/editor?instanceId=${result.instanceId}`);
    } catch (error: any) {
      toast.showToast(`Error: ${error.message}`, "error");
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toISOString().split("T")[0];
  };

  return (
    <PageLayout
      onNewClick={() => setShowCreateModal(true)}
      currentPage="home"
    >
      <Box sx={{ maxWidth: "900px", mx: "auto", px: 4, py: 6, flex: 1, width: "100%" }}>
        {/* Mini Flow Chart */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
            mb: 5,
            py: 3,
          }}
        >
          <Box
            sx={{
              px: 2,
              py: 1,
              border: `1px solid ${colors.border}`,
              borderRadius: "4px",
              bgcolor: colors.bgAlt,
            }}
          >
            <MonoText sx={{ fontSize: "12px", color: colors.keyword }}>trigger</MonoText>
          </Box>
          <MonoText sx={{ color: colors.textMuted, fontSize: "12px" }}>→</MonoText>
          <Box
            sx={{
              px: 2,
              py: 1,
              border: `1px solid ${colors.variable}`,
              borderRadius: "4px",
              bgcolor: "transparent",
            }}
          >
            <MonoText sx={{ fontSize: "12px", color: colors.variable }}>action</MonoText>
          </Box>
          <MonoText sx={{ color: colors.textMuted, fontSize: "12px" }}>→</MonoText>
          <Box
            sx={{
              px: 2,
              py: 1,
              border: `1px solid ${colors.border}`,
              borderRadius: "4px",
              bgcolor: colors.bgAlt,
            }}
          >
            <MonoText sx={{ fontSize: "12px", color: colors.function }}>timer</MonoText>
          </Box>
          <MonoText sx={{ color: colors.textMuted, fontSize: "12px" }}>→</MonoText>
          <Box
            sx={{
              px: 2,
              py: 1,
              border: `1px solid ${colors.success}`,
              borderRadius: "4px",
              bgcolor: "transparent",
            }}
          >
            <MonoText sx={{ fontSize: "12px", color: colors.success }}>done</MonoText>
          </Box>
        </Box>

        {/* Workflows Section */}
        <Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 3,
              pb: 2,
              borderBottom: `1px solid ${colors.border}`,
            }}
          >
            <MonoText sx={{ fontSize: "14px", color: colors.text }}>
              <span style={{ color: colors.keyword }}>const</span>{" "}
              <span style={{ color: colors.variable }}>workflows</span>{" "}
              <span style={{ color: colors.operator }}>=</span>{" "}
              <span style={{ color: colors.bracket }}>[</span>
              <span style={{ color: colors.number }}>{workflows.length}</span>
              <span style={{ color: colors.bracket }}>]</span>
            </MonoText>
          </Box>

          {loading ? (
            <Box sx={{ py: 4 }}>
              <CodeLine>
                <span style={{ color: colors.function }}>loading</span>
                <span style={{ color: colors.bracket }}>()</span>
                <span style={{ color: colors.operator }}>...</span>
              </CodeLine>
            </Box>
          ) : workflows.length === 0 ? (
            <Box
              sx={{
                py: 6,
                textAlign: "center",
                border: `1px dashed ${colors.border}`,
                borderRadius: "4px",
              }}
            >
              <MonoText sx={{ color: colors.textMuted, mb: 3, fontSize: "14px" }}>
                <span style={{ color: colors.comment }}>{"// "}</span>
                no workflows found
              </MonoText>
              <TerminalButton
                onClick={() => setShowCreateModal(true)}
                sx={{
                  bgcolor: colors.bgAlt,
                  color: colors.success,
                  border: `1px solid ${colors.border}`,
                  "&:hover": { bgcolor: colors.border },
                }}
              >
                create first workflow
              </TerminalButton>
            </Box>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {workflows.map((workflow, index) => (
                <WorkflowRow
                  key={workflow.id}
                  sx={{
                    animation: `${fadeIn} 0.3s ease ${index * 0.05}s both`,
                  }}
                >
                  <Box sx={{ flex: 1, display: "flex", alignItems: "center", gap: 2 }}>
                    <MonoText
                      sx={{
                        fontSize: "12px",
                        color: colors.textMuted,
                        minWidth: "24px",
                      }}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </MonoText>
                    <MonoText sx={{ fontSize: "14px", color: colors.variable }}>
                      {workflow.name}
                    </MonoText>
                    <MonoText sx={{ fontSize: "12px", color: colors.textMuted }}>
                      {formatDate(workflow.createdAt)}
                    </MonoText>
                  </Box>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <ActionButton
                      onClick={(e) => handleCreateInstance(workflow.id, e)}
                      style={{ borderColor: colors.success, color: colors.success }}
                    >
                      <PlayIcon sx={{ fontSize: 12 }} />
                      run
                    </ActionButton>
                    <ActionButton
                      onClick={() => router.push(`/workflows/${workflow.id}/instances`)}
                    >
                      <ListIcon sx={{ fontSize: 12 }} />
                      instances
                    </ActionButton>
                    <ActionButton
                      onClick={() => router.push(`/workflows/${workflow.id}/editor`)}
                      style={{ borderColor: colors.cursor, color: colors.cursor }}
                    >
                      <EditIcon sx={{ fontSize: 12 }} />
                      edit
                    </ActionButton>
                  </Box>
                </WorkflowRow>
              ))}
            </Box>
          )}
        </Box>
      </Box>

      {/* Create Dialog */}
      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: colors.bg,
            border: `1px solid ${colors.border}`,
            borderRadius: "8px",
            backgroundImage: "none",
          },
        }}
      >
        <DialogContent sx={{ p: 0 }}>
          {/* Dialog Header */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: 3,
              py: 2,
              borderBottom: `1px solid ${colors.border}`,
            }}
          >
            <MonoText sx={{ fontSize: "13px", color: colors.text }}>
              <span style={{ color: colors.keyword }}>new</span>
              <span style={{ color: colors.function }}> Workflow</span>
              <span style={{ color: colors.bracket }}>()</span>
            </MonoText>
            <IconButton
              onClick={() => setShowCreateModal(false)}
              sx={{ color: colors.textMuted, p: 0.5 }}
            >
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>

          {/* Dialog Body */}
          <Box sx={{ p: 3 }}>
            <CodeLine sx={{ mb: 2, color: colors.comment, fontSize: "12px" }}>
              {"// enter workflow name"}
            </CodeLine>
            <TextField
              autoFocus
              fullWidth
              placeholder="my-workflow"
              value={newWorkflowName}
              onChange={(e) => setNewWorkflowName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateWorkflow()}
              sx={{
                "& .MuiOutlinedInput-root": {
                  fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                  fontSize: "14px",
                  bgcolor: colors.bgAlt,
                  color: colors.text,
                  borderRadius: "4px",
                  "& fieldset": { borderColor: colors.border },
                  "&:hover fieldset": { borderColor: colors.textMuted },
                  "&.Mui-focused fieldset": { borderColor: colors.cursor },
                },
                "& .MuiOutlinedInput-input": {
                  padding: "12px 16px",
                  "&::placeholder": { color: colors.textMuted, opacity: 1 },
                },
              }}
            />
          </Box>

          {/* Dialog Footer */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 2,
              px: 3,
              py: 2,
              borderTop: `1px solid ${colors.border}`,
            }}
          >
            <TerminalButton
              onClick={() => {
                setShowCreateModal(false);
                setNewWorkflowName("");
              }}
              sx={{
                color: colors.textMuted,
                "&:hover": { bgcolor: colors.bgAlt },
              }}
            >
              cancel
            </TerminalButton>
            <TerminalButton
              onClick={handleCreateWorkflow}
              sx={{
                bgcolor: colors.success,
                color: colors.bg,
                "&:hover": { bgcolor: "#2ea043" },
              }}
            >
              create
            </TerminalButton>
          </Box>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}

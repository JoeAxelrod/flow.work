"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getWorkflow, getWorkflowInstances } from "../../../api-client";
import { useToast } from "../../../components/ToastContext";
import {
  PageLayout,
  MonoText,
  CodeLine,
  TerminalButton,
  colors,
  fadeIn,
} from "../../../components/CodeLayout";
import {
  Box,
  IconButton,
  styled,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  PlayArrow as PlayIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  Close as CloseIcon,
  Language as HttpIcon,
  Webhook as HookIcon,
  CallMerge as JoinIcon,
  RadioButtonUnchecked as DefaultIcon,
  Visibility as VisibilityIcon,
  Code as CodeIcon,
} from "@mui/icons-material";

type NodeKind = "http" | "hook" | "timer" | "join";

interface Node {
  id: string;
  nodeId: string;
  nodeName: string;
  nodeKind?: NodeKind;
  status: string;
  input: any;
  output: any;
  error: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Instance {
  id: string;
  workflowId: string;
  status: string;
  input: any;
  output: any;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
  nodes: Node[];
}

interface Workflow {
  id: string;
  name: string;
}

const InstanceRow = styled(Box)({
  padding: "16px",
  background: colors.bgAlt,
  border: `1px solid ${colors.border}`,
  borderRadius: "4px",
  transition: "all 0.15s ease",
});

const NodeCard = styled(Box)({
  padding: "10px 12px",
  background: colors.bg,
  border: `1px solid ${colors.border}`,
  borderRadius: "4px",
  minWidth: "180px",
  transition: "all 0.15s ease",
  "&:hover": {
    borderColor: colors.textMuted,
  },
});

const ActionButton = styled("button")({
  fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace',
  fontSize: "10px",
  padding: "3px 8px",
  borderRadius: "3px",
  border: `1px solid ${colors.border}`,
  background: "transparent",
  color: colors.textMuted,
  cursor: "pointer",
  transition: "all 0.15s ease",
  display: "flex",
  alignItems: "center",
  gap: "3px",
  "&:hover": {
    borderColor: colors.textMuted,
    color: colors.text,
  },
});

function getKindIcon(kind: NodeKind) {
  const iconStyle = { fontSize: 10 };
  switch (kind) {
    case "http":
      return <HttpIcon sx={iconStyle} />;
    case "hook":
      return <HookIcon sx={iconStyle} />;
    case "timer":
      return <ScheduleIcon sx={iconStyle} />;
    case "join":
      return <JoinIcon sx={iconStyle} />;
    default:
      return <DefaultIcon sx={iconStyle} />;
  }
}

function getStatusColor(status: string) {
  switch (status?.toLowerCase()) {
    case "success":
    case "completed":
      return colors.success;
    case "failed":
      return colors.error;
    case "running":
      return colors.cursor;
    case "cancelled":
      return colors.warning;
    default:
      return colors.textMuted;
  }
}

function getStatusIcon(status: string) {
  const iconStyle = { fontSize: 14 };
  switch (status?.toLowerCase()) {
    case "success":
    case "completed":
      return <CheckCircleIcon sx={iconStyle} />;
    case "failed":
      return <ErrorIcon sx={iconStyle} />;
    case "running":
      return <ScheduleIcon sx={iconStyle} />;
    default:
      return <PlayIcon sx={iconStyle} />;
  }
}

export default function InstancesPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const workflowId = params.id as string;
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState<{
    nodeId: string;
    type: "input" | "output";
  } | null>(null);

  useEffect(() => {
    fetchData();
  }, [workflowId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [workflowData, instancesData] = await Promise.all([
        getWorkflow(workflowId),
        getWorkflowInstances(workflowId),
      ]);
      setWorkflow(workflowData.workflow);
      setInstances(instancesData);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.showToast(`Error: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toISOString().replace("T", " ").substring(0, 19);
  };

  const formatDateShort = (date: string) => {
    return new Date(date).toISOString().split("T")[0];
  };

  const getTimerDuration = (node: Node): number | null => {
    if (node.nodeKind === "timer") {
      if (node.output?.ms) return node.output.ms;
      if (node.input?.ms) return node.input.ms;
      if (node.output?.scheduledFor && node.startedAt) {
        try {
          const scheduledFor =
            typeof node.output.scheduledFor === "number"
              ? node.output.scheduledFor
              : new Date(node.output.scheduledFor).getTime();
          const startedAt = new Date(node.startedAt).getTime();
          const duration = scheduledFor - startedAt;
          return duration > 0 ? duration : null;
        } catch (e) {
          return null;
        }
      }
    }
    return null;
  };

  const handleOpenDialog = (nodeId: string, type: "input" | "output") => {
    setDialogOpen({ nodeId, type });
  };

  const handleCloseDialog = () => {
    setDialogOpen(null);
  };

  const getModalContent = () => {
    if (!dialogOpen) return null;

    const instance = instances.find((i) =>
      i.nodes?.some((n) => n.id === dialogOpen.nodeId)
    );
    const node = instance?.nodes?.find((n) => n.id === dialogOpen.nodeId);

    if (!node) return null;

    const data = dialogOpen.type === "input" ? node.input : node.output;

    return (
      <Box
        onClick={handleCloseDialog}
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          bgcolor: "rgba(0, 0, 0, 0.8)",
          zIndex: 1300,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 2,
        }}
      >
        <Box
          onClick={(e) => e.stopPropagation()}
          sx={{
            maxWidth: "700px",
            width: "100%",
            maxHeight: "80vh",
            display: "flex",
            flexDirection: "column",
            bgcolor: colors.bg,
            border: `1px solid ${colors.border}`,
            borderRadius: "8px",
          }}
        >
          {/* Modal Header */}
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
              <span style={{ color: colors.keyword }}>
                {dialogOpen.type}
              </span>
              <span style={{ color: colors.textMuted }}>{" // "}</span>
              <span style={{ color: colors.variable }}>
                {node.nodeName || "node"}
              </span>
            </MonoText>
            <IconButton
              onClick={handleCloseDialog}
              sx={{ color: colors.textMuted, p: 0.5 }}
            >
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>

          {/* Modal Body */}
          <Box
            sx={{
              p: 3,
              overflow: "auto",
              flex: 1,
            }}
          >
            <Box
              component="pre"
              sx={{
                fontFamily:
                  '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace',
                fontSize: "12px",
                color: colors.text,
                m: 0,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {JSON.stringify(data, null, 2)}
            </Box>
          </Box>

          {/* Modal Footer */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              px: 3,
              py: 2,
              borderTop: `1px solid ${colors.border}`,
            }}
          >
            <TerminalButton
              onClick={handleCloseDialog}
              sx={{
                color: colors.textMuted,
                "&:hover": { bgcolor: colors.bgAlt },
              }}
            >
              close
            </TerminalButton>
          </Box>
        </Box>
      </Box>
    );
  };

  return (
    <PageLayout showNew={false}>
      <Box sx={{ maxWidth: "1000px", mx: "auto", px: 4, py: 5, width: "100%" }}>
        {/* Back Button & Title */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
            <IconButton
              onClick={() => router.push("/")}
              sx={{
                color: colors.textMuted,
                p: 0.5,
                "&:hover": { color: colors.text },
              }}
            >
              <ArrowBackIcon sx={{ fontSize: 20 }} />
            </IconButton>
            <MonoText sx={{ fontSize: "14px", color: colors.text }}>
              <span style={{ color: colors.function }}>
                {workflow?.name || "workflow"}
              </span>
              <span style={{ color: colors.operator }}>.</span>
              <span style={{ color: colors.variable }}>instances</span>
              <span style={{ color: colors.bracket }}>()</span>
            </MonoText>
          </Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              pb: 2,
              borderBottom: `1px solid ${colors.border}`,
            }}
          >
            <MonoText sx={{ fontSize: "13px", color: colors.comment }}>
              {`// ${instances.length} instance${instances.length !== 1 ? "s" : ""}`}
            </MonoText>
            <TerminalButton
              onClick={() => router.push(`/workflows/${workflowId}/editor`)}
              sx={{
                color: colors.cursor,
                border: `1px solid ${colors.border}`,
                "&:hover": { bgcolor: colors.bgAlt, borderColor: colors.cursor },
              }}
            >
              edit workflow
            </TerminalButton>
          </Box>
        </Box>

        {/* Instances List */}
        {loading ? (
          <Box sx={{ py: 4 }}>
            <CodeLine>
              <span style={{ color: colors.function }}>fetching</span>
              <span style={{ color: colors.bracket }}>()</span>
              <span style={{ color: colors.operator }}>...</span>
            </CodeLine>
          </Box>
        ) : instances.length === 0 ? (
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
              no instances found
            </MonoText>
            <TerminalButton
              onClick={() => router.push("/")}
              sx={{
                bgcolor: colors.bgAlt,
                color: colors.text,
                border: `1px solid ${colors.border}`,
                "&:hover": { bgcolor: colors.border },
              }}
            >
              go to workflows
            </TerminalButton>
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {instances.map((instance, index) => (
              <InstanceRow
                key={instance.id}
                sx={{
                  animation: `${fadeIn} 0.3s ease ${index * 0.05}s both`,
                }}
              >
                {/* Instance Header */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 2,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        color: getStatusColor(instance.status),
                      }}
                    >
                      {getStatusIcon(instance.status)}
                      <MonoText sx={{ fontSize: "12px", fontWeight: 600 }}>
                        {instance.status}
                      </MonoText>
                    </Box>
                    <MonoText sx={{ fontSize: "12px", color: colors.textMuted }}>
                      {instance.id.substring(0, 8)}...
                    </MonoText>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <MonoText sx={{ fontSize: "11px", color: colors.textMuted }}>
                      {formatDateShort(instance.startedAt)}
                    </MonoText>
                    <ActionButton
                      onClick={() =>
                        router.push(
                          `/workflows/${workflowId}/editor?instanceId=${instance.id}`
                        )
                      }
                      style={{ borderColor: colors.cursor, color: colors.cursor }}
                    >
                      <VisibilityIcon sx={{ fontSize: 10 }} />
                      view
                    </ActionButton>
                  </Box>
                </Box>

                {/* Error Display */}
                {instance.error && (
                  <Box
                    sx={{
                      mb: 2,
                      p: 2,
                      bgcolor: colors.bg,
                      borderRadius: "4px",
                      border: `1px solid ${colors.error}`,
                    }}
                  >
                    <MonoText sx={{ fontSize: "11px", color: colors.error }}>
                      <span style={{ color: colors.keyword }}>error</span>
                      <span style={{ color: colors.operator }}>: </span>
                      {instance.error}
                    </MonoText>
                  </Box>
                )}

                {/* Nodes */}
                {instance.nodes && instance.nodes.length > 0 && (
                  <Box
                    sx={{
                      display: "flex",
                      gap: 1,
                      flexWrap: "wrap",
                    }}
                  >
                    {instance.nodes.map((node) => (
                      <NodeCard key={node.id}>
                        {/* Node Kind Badge */}
                        {node.nodeKind && (
                          <Box
                            sx={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 0.5,
                              px: 1,
                              py: 0.25,
                              mb: 1,
                              borderRadius: "3px",
                              bgcolor: colors.function,
                              color: colors.bg,
                              fontSize: "9px",
                              fontFamily:
                                '"JetBrains Mono", "Fira Code", monospace',
                              fontWeight: 600,
                              textTransform: "uppercase",
                            }}
                          >
                            {getKindIcon(node.nodeKind)}
                            {node.nodeKind}
                            {node.nodeKind === "timer" &&
                              (() => {
                                const duration = getTimerDuration(node);
                                return duration !== null
                                  ? ` ${duration}ms`
                                  : "";
                              })()}
                          </Box>
                        )}

                        {/* Node Info */}
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            mb: 1,
                          }}
                        >
                          <MonoText
                            sx={{
                              fontSize: "12px",
                              color: colors.variable,
                              flex: 1,
                            }}
                          >
                            {node.nodeName || `node_${node.nodeId.substring(0, 4)}`}
                          </MonoText>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                              color: getStatusColor(node.status),
                            }}
                          >
                            {getStatusIcon(node.status)}
                          </Box>
                        </Box>

                        {/* Node Actions */}
                        {(node.input || node.output) && (
                          <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                            {node.input && (
                              <ActionButton
                                onClick={() => handleOpenDialog(node.id, "input")}
                              >
                                <CodeIcon sx={{ fontSize: 10 }} />
                                in
                              </ActionButton>
                            )}
                            {node.output && (
                              <ActionButton
                                onClick={() => handleOpenDialog(node.id, "output")}
                              >
                                <CodeIcon sx={{ fontSize: 10 }} />
                                out
                              </ActionButton>
                            )}
                          </Box>
                        )}

                        {/* Node Error */}
                        {node.error && (
                          <MonoText
                            sx={{
                              fontSize: "10px",
                              color: colors.error,
                              mt: 1,
                              display: "block",
                            }}
                          >
                            {node.error.substring(0, 50)}
                            {node.error.length > 50 ? "..." : ""}
                          </MonoText>
                        )}
                      </NodeCard>
                    ))}
                  </Box>
                )}
              </InstanceRow>
            ))}
          </Box>
        )}
      </Box>

      {/* Modal */}
      {getModalContent()}
    </PageLayout>
  );
}

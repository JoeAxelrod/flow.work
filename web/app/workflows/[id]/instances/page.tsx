'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getWorkflow, getWorkflowInstances } from '../../../api-client';
import { useToast } from '../../../components/ToastContext';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  AppBar,
  Toolbar,
  IconButton,
  Avatar,
  Chip,
  LinearProgress,
  Stack,
  useTheme,
  alpha,
  styled,
} from '@mui/material';
import {
  AccountTree as WorkflowIcon,
  ArrowBack as ArrowBackIcon,
  PlayArrow as PlayIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  CalendarToday as CalendarIcon,
  Circle as NodeIcon,
  Visibility as VisibilityIcon,
  Code as CodeIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

type NodeKind = 'http' | 'hook' | 'timer' | 'join';


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

// Styled Components
const GlowCard = styled(Card)(({ theme }) => ({
  position: 'relative',
  overflow: 'visible',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: `0 12px 24px ${alpha(theme.palette.primary.main, 0.2)}`,
  },
}));

const GradientText = styled(Typography)(({ theme }) => ({
  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
}));

function getKindIcon(kind: NodeKind) {
  const iconSize = 8;
  switch (kind) {
    case 'http':
      return (
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      );
    case 'hook':
      return (
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z" />
        </svg>
      );
    case 'timer':
      return (
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    case 'join':
      return (
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
        </svg>
      );
    default:
      return (
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
        </svg>
      );
  }
}

export default function InstancesPage() {
  const params = useParams();
  const router = useRouter();
  const theme = useTheme();
  const toast = useToast();
  const workflowId = params.id as string;
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState<{ nodeId: string; type: 'input' | 'output' } | null>(null);

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
      console.error('Error fetching data:', error);
      toast.showToast(`Failed to load data: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'success':
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'running':
        return 'info';
      case 'cancelled':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'success':
      case 'completed':
        return <CheckCircleIcon />;
      case 'failed':
        return <ErrorIcon />;
      case 'running':
        return <ScheduleIcon />;
      case 'cancelled':
        return <ErrorIcon />;
      default:
        return <PlayIcon />;
    }
  };

  const getActivityStatusColor = (status: string): 'success' | 'error' | 'info' | 'warning' | 'default' => {
    switch (status?.toLowerCase()) {
      case 'success':
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'running':
        return 'info';
      case 'created':
      case 'skipped':
        return 'default';
      default:
        return 'default';
    }
  };

  const getActivityStatusColorValue = (status: string) => {
    const color = getActivityStatusColor(status);
    return theme.palette[color]?.main || theme.palette.grey[500];
  };

  const getStatusColorValue = (status: string) => {
    const color = getStatusColor(status);
    if (color === 'default') {
      return theme.palette.grey[500];
    }
    return theme.palette[color as 'success' | 'error' | 'info' | 'warning']?.main || theme.palette.grey[500];
  };

  const handleOpenDialog = (nodeId: string, type: 'input' | 'output') => {
    setDialogOpen({ nodeId, type });
  };

  const handleCloseDialog = () => {
    setDialogOpen(null);
  };

  const getModalContent = () => {
    if (!dialogOpen) return null;
    
    const instance = instances.find(i => i.nodes?.some(n => n.id === dialogOpen.nodeId));
    const node = instance?.nodes?.find(n => n.id === dialogOpen.nodeId);
    
    if (!node) return null;
    
    const data = dialogOpen.type === 'input' ? node.input : node.output;
    
    return (
      <Box
        onClick={handleCloseDialog}
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          bgcolor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1300,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
        }}
      >
        <Card
          onClick={(e) => e.stopPropagation()}
          sx={{
            maxWidth: '800px',
            width: '100%',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 2,
            boxShadow: theme.shadows[24],
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CodeIcon />
              <Typography variant="h6">
                {dialogOpen.type === 'input' ? 'Input' : 'Output'} - {node.nodeName || 'Node'}
              </Typography>
            </Box>
            <IconButton onClick={handleCloseDialog} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
          <Box
            sx={{
              p: 2,
              overflow: 'auto',
              flex: 1,
            }}
          >
            <Box
              sx={{
                p: 2,
                bgcolor: alpha(theme.palette.background.paper, 0.5),
                borderRadius: 1,
                border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
              }}
            >
              <Typography
                component="pre"
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  m: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {JSON.stringify(data, null, 2)}
              </Typography>
            </Box>
          </Box>
          <Box
            sx={{
              p: 2,
              borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <Button onClick={handleCloseDialog} variant="contained">
              Close
            </Button>
          </Box>
        </Card>
      </Box>
    );
  };

  const getTimerDuration = (node: Node): number | null => {
    if (node.nodeKind === 'timer') {
      // First check if ms is directly in output or input
      if (node.output?.ms) return node.output.ms;
      if (node.input?.ms) return node.input.ms;
      
      // Calculate from scheduledFor timestamp if available
      if (node.output?.scheduledFor && node.startedAt) {
        try {
          const scheduledFor = typeof node.output.scheduledFor === 'number' 
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

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* AppBar */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
          backdropFilter: 'blur(10px)',
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => router.push('/workflows')}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
            <Avatar
              sx={{
                bgcolor: 'white',
                color: theme.palette.primary.main,
                width: 40,
                height: 40,
              }}
            >
              <WorkflowIcon />
            </Avatar>
            <Box>
              <Typography
                variant="h6"
                component="div"
                sx={{
                  fontWeight: 700,
                  color: 'white',
                }}
              >
                {workflow?.name || 'Workflow Instances'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                {instances.length} {instances.length === 1 ? 'instance' : 'instances'}
              </Typography>
            </Box>
          </Box>
          <Button
            component={Link}
            href={`/workflows/${workflowId}/editor`}
            sx={{
              color: 'white',
              fontWeight: 600,
              '&:hover': {
                bgcolor: alpha(theme.palette.common.white, 0.1),
              },
            }}
          >
            Edit Workflow
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {loading ? (
          <Card sx={{ p: 8, textAlign: 'center' }}>
            <LinearProgress sx={{ mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              Loading instances...
            </Typography>
          </Card>
        ) : instances.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Card
              sx={{
                p: 8,
                textAlign: 'center',
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)}, ${alpha(theme.palette.secondary.main, 0.05)})`,
                border: `2px dashed ${alpha(theme.palette.primary.main, 0.3)}`,
              }}
            >
              <PlayIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
              <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
                No instances found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                Create an instance to start executing this workflow
              </Typography>
              <Button
                variant="contained"
                startIcon={<PlayIcon />}
                onClick={() => router.push('/workflows')}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                Go to Workflows
              </Button>
            </Card>
          </motion.div>
        ) : (
          <Box>
            <Box sx={{ mb: 4 }}>
              <GradientText variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
                Workflow Instances
              </GradientText>
              <Typography variant="body2" color="text.secondary">
                View and monitor all execution instances for this workflow
              </Typography>
            </Box>

            <Stack spacing={2}>
              {instances.map((instance, index) => (
                <motion.div
                  key={instance.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <GlowCard>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flex: 1 }}>
                          <Avatar
                            sx={{
                              bgcolor: getStatusColorValue(instance.status),
                              width: 56,
                              height: 56,
                            }}
                          >
                            {getStatusIcon(instance.status)}
                          </Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <Typography
                                variant="h6"
                                sx={{
                                  fontWeight: 700,
                                  color: 'text.primary',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                Instance {instance.id.substring(0, 8)}...
                              </Typography>
                              <Chip
                                label={instance.status}
                                color={getStatusColor(instance.status) as 'success' | 'error' | 'info' | 'default'}
                                size="small"
                                sx={{ textTransform: 'capitalize' }}
                              />
                              <Button
                                component={Link}
                                href={`/workflows/${workflowId}/editor?instanceId=${instance.id}`}
                                size="small"
                                variant="outlined"
                                startIcon={<VisibilityIcon />}
                                sx={{
                                  ml: 'auto',
                                  textTransform: 'none',
                                  fontSize: '0.75rem',
                                  minWidth: 'auto',
                                  px: 1,
                                }}
                              >
                                View in Editor
                              </Button>
                            </Box>
                            <Stack direction="row" spacing={2} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <CalendarIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                <Typography variant="body2" color="text.secondary">
                                  Started: {new Date(instance.startedAt).toLocaleString(undefined, { 
                                    year: 'numeric', 
                                    month: 'short', 
                                    day: 'numeric', 
                                    hour: '2-digit', 
                                    minute: '2-digit', 
                                    second: '2-digit' 
                                  })}
                                </Typography>
                              </Box>
                              {instance.finishedAt && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <CheckCircleIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                  <Typography variant="body2" color="text.secondary">
                                    Finished: {new Date(instance.finishedAt).toLocaleString(undefined, { 
                                      year: 'numeric', 
                                      month: 'short', 
                                      day: 'numeric', 
                                      hour: '2-digit', 
                                      minute: '2-digit', 
                                      second: '2-digit' 
                                    })}
                                  </Typography>
                                </Box>
                              )}
                            </Stack>
                            {instance.error && (
                              <Box
                                sx={{
                                  mt: 2,
                                  p: 2,
                                  bgcolor: alpha(theme.palette.error.main, 0.1),
                                  borderRadius: 1,
                                  border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                                }}
                              >
                                <Typography variant="body2" color="error" sx={{ fontWeight: 600, mb: 0.5 }}>
                                  Error:
                                </Typography>
                                <Typography variant="body2" color="error">
                                  {instance.error}
                                </Typography>
                              </Box>
                            )}

                            {/* Nodes/Activities Section */}
                            {instance.nodes && instance.nodes.length > 0 && (
                              <Box sx={{ mt: 1.5 }}>
                                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                                  {instance.nodes.map((node, nodeIndex) => (
                                    <Card
                                      key={node.id}
                                      sx={{
                                        bgcolor: alpha(theme.palette.primary.main, 0.02),
                                        border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                                        position: 'relative',
                                        transition: 'all 0.2s ease',
                                        width: '240px',
                                        flex: '0 0 auto',
                                        '&:hover': {
                                          borderColor: alpha(theme.palette.primary.main, 0.3),
                                        },
                                      }}
                                    >
                                      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                        {/* Kind badge */}
                                        {node.nodeKind && (
                                          <Box
                                            sx={{
                                              position: 'absolute',
                                              top: 4,
                                              left: 4,
                                              background: '#4f46e5',
                                              color: 'white',
                                              padding: '2px 4px 2px 2px',
                                              borderRadius: '3px',
                                              fontSize: '8px',
                                              fontWeight: 'bold',
                                              textTransform: 'uppercase',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '2px',
                                            }}
                                          >
                                            <Box
                                              sx={{
                                                background: '#3730a3',
                                                borderRadius: '2px',
                                                padding: '1px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                              }}
                                            >
                                              {getKindIcon(node.nodeKind)}
                                            </Box>
                                            <span>{node.nodeKind}</span>
                                            {node.nodeKind === 'timer' && (() => {
                                              const duration = getTimerDuration(node);
                                              return duration !== null ? ` (${duration} ms)` : '';
                                            })()}
                                          </Box>
                                        )}
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, mt: node.nodeKind ? 2 : 0 }}>
                                          <Avatar
                                            sx={{
                                              bgcolor: getActivityStatusColorValue(node.status),
                                              width: 28,
                                              height: 28,
                                            }}
                                          >
                                            <NodeIcon sx={{ fontSize: 16 }} />
                                          </Avatar>
                                          <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.8rem', display: 'block' }}>
                                              {node.nodeName || `Node ${nodeIndex + 1}`}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                              {node.nodeId.substring(0, 8)}...
                                            </Typography>
                                          </Box>
                                          <Chip
                                            label={node.status}
                                            color={getActivityStatusColor(node.status) as 'success' | 'error' | 'info' | 'default'}
                                            size="small"
                                            sx={{ 
                                              textTransform: 'capitalize',
                                              height: '22px',
                                              fontSize: '0.7rem',
                                              '& .MuiChip-label': { px: 0.75 }
                                            }}
                                          />
                                        </Box>

                                        {(node.input || node.output) && (
                                          <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                                            {node.input && (
                                              <Button
                                                size="small"
                                                variant="outlined"
                                                startIcon={<CodeIcon />}
                                                onClick={() => handleOpenDialog(node.id, 'input')}
                                                sx={{
                                                  textTransform: 'none',
                                                  fontSize: '0.7rem',
                                                  py: 0.5,
                                                  px: 1.5,
                                                }}
                                              >
                                                Input
                                              </Button>
                                            )}
                                            {node.output && (
                                              <Button
                                                size="small"
                                                variant="outlined"
                                                startIcon={<CodeIcon />}
                                                onClick={() => handleOpenDialog(node.id, 'output')}
                                                sx={{
                                                  textTransform: 'none',
                                                  fontSize: '0.7rem',
                                                  py: 0.5,
                                                  px: 1.5,
                                                }}
                                              >
                                                Output
                                              </Button>
                                            )}
                                          </Box>
                                        )}

                                        {node.error && (
                                          <Box
                                            sx={{
                                              mt: 1,
                                              p: 1,
                                              bgcolor: alpha(theme.palette.error.main, 0.1),
                                              borderRadius: 1,
                                              border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                                            }}
                                          >
                                            <Typography variant="caption" color="error" sx={{ fontWeight: 600, display: 'block', mb: 0.25, fontSize: '0.7rem' }}>
                                              Error:
                                            </Typography>
                                            <Typography variant="caption" color="error" sx={{ fontSize: '0.7rem' }}>
                                              {node.error}
                                            </Typography>
                                          </Box>
                                        )}

                                        {(node.startedAt || node.finishedAt) && (
                                          <Box sx={{ mt: 1, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                                            {node.startedAt && (
                                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                                Started: {new Date(node.startedAt).toLocaleString(undefined, { 
                                                  year: 'numeric', 
                                                  month: 'short', 
                                                  day: 'numeric', 
                                                  hour: '2-digit', 
                                                  minute: '2-digit', 
                                                  second: '2-digit' 
                                                })}
                                              </Typography>
                                            )}
                                            {node.finishedAt && (
                                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                                Finished: {new Date(node.finishedAt).toLocaleString(undefined, { 
                                                  year: 'numeric', 
                                                  month: 'short', 
                                                  day: 'numeric', 
                                                  hour: '2-digit', 
                                                  minute: '2-digit', 
                                                  second: '2-digit' 
                                                })}
                                              </Typography>
                                            )}
                                          </Box>
                                        )}
                                      </CardContent>
                                    </Card>
                                  ))}
                                </Stack>
                              </Box>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    </CardContent>
                  </GlowCard>
                </motion.div>
              ))}
            </Stack>
          </Box>
        )}
      </Container>
      {getModalContent()}
    </Box>
  );
}


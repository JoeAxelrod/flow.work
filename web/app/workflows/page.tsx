'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { listWorkflows, createWorkflow, createInstance } from '../api-client';
import { useToast } from '../components/ToastContext';
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
  Paper,
  Divider,
  Stack,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  alpha,
  styled,
  List,
  ListItem,
} from '@mui/material';
import {
  AccountTree as WorkflowIcon,
  Add as AddIcon,
  Edit as EditIcon,
  PlayArrow as PlayIcon,
  Close as CloseIcon,
  CalendarToday as CalendarIcon,
  List as ListIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

interface Workflow {
  id: string;
  name: string;
  createdAt: string;
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

const StyledButton = styled(Button)(({ theme }) => ({
  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
  borderRadius: '50px',
  padding: '10px 24px',
  textTransform: 'none',
  fontWeight: 600,
  boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.4)}`,
    background: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
  },
}));

const GradientText = styled(Typography)(({ theme }) => ({
  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
}));

export default function WorkflowsPage() {
  const router = useRouter();
  const theme = useTheme();
  const toast = useToast();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWorkflow, setNewWorkflow] = useState({ name: '' });

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      const data = await listWorkflows();
      setWorkflows(data);
    } catch (error) {
      console.error('Error fetching workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkflow = async () => {
    if (!newWorkflow.name) {
      toast.showToast('Please provide a name', 'warning');
      return;
    }

    try {
      const created = await createWorkflow(newWorkflow.name);
      setShowCreateModal(false);
      setNewWorkflow({ name: '' });
      router.push(`/workflows/${created.id}/editor`);
    } catch (error: any) {
      toast.showToast(`Failed to create workflow: ${error.message}`, 'error');
    }
  };

  const handleCreateInstance = async (workflowId: string) => {
    try {
      const instance = await createInstance(workflowId, {});
      toast.showToast(`Instance created successfully! Instance ID: ${instance.id}`, 'success');
    } catch (error: any) {
      toast.showToast(`Failed to create instance: ${error.message}`, 'error');
    }
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
            <Typography
              variant="h6"
              component="div"
              sx={{
                fontWeight: 700,
                color: 'white',
              }}
            >
              Workflows
            </Typography>
          </Box>
          <Button
            component={Link}
            href="/"
            sx={{
              color: 'white',
              fontWeight: 600,
              mr: 2,
              '&:hover': {
                bgcolor: alpha(theme.palette.common.white, 0.1),
              },
            }}
          >
            Home
          </Button>
          <StyledButton
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowCreateModal(true)}
            sx={{
              bgcolor: 'white',
              color: theme.palette.primary.main,
              '&:hover': {
                bgcolor: alpha(theme.palette.common.white, 0.9),
              },
            }}
          >
            Create Workflow
          </StyledButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {loading ? (
          <Card sx={{ p: 8, textAlign: 'center' }}>
            <LinearProgress sx={{ mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              Loading workflows...
            </Typography>
          </Card>
        ) : workflows.length === 0 ? (
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
              <WorkflowIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
              <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
                No workflows found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                Create your first workflow to get started!
              </Typography>
              <StyledButton
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setShowCreateModal(true)}
              >
                Create Workflow
              </StyledButton>
            </Card>
          </motion.div>
        ) : (
          <Box>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <GradientText variant="h4" sx={{ fontWeight: 800 }}>
                All Workflows
              </GradientText>
              <Typography variant="body2" color="text.secondary">
                {workflows.length} {workflows.length === 1 ? 'workflow' : 'workflows'}
              </Typography>
            </Box>

            <Stack spacing={2}>
              {workflows.map((workflow, index) => (
                <motion.div
                  key={workflow.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <GlowCard>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                          <Avatar
                            sx={{
                              bgcolor: theme.palette.primary.main,
                              width: 56,
                              height: 56,
                            }}
                          >
                            <WorkflowIcon />
                          </Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                              variant="h6"
                              sx={{
                                fontWeight: 700,
                                color: 'text.primary',
                                mb: 0.5,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {workflow.name}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                              <CalendarIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                              <Typography variant="body2" color="text.secondary">
                                Created {new Date(workflow.createdAt).toLocaleDateString()}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                        <Stack direction="row" spacing={2} sx={{ ml: 2, flexWrap: 'wrap' }}>
                          <Button
                            component={Link}
                            href={`/workflows/${workflow.id}/instances`}
                            variant="outlined"
                            startIcon={<ListIcon />}
                            sx={{
                              textTransform: 'none',
                              fontWeight: 600,
                              borderColor: theme.palette.info.main,
                              color: theme.palette.info.main,
                              '&:hover': {
                                borderColor: theme.palette.info.dark,
                                bgcolor: alpha(theme.palette.info.main, 0.05),
                              },
                            }}
                          >
                            View Instances
                          </Button>
                          <Button
                            component={Link}
                            href={`/workflows/${workflow.id}/editor`}
                            variant="outlined"
                            startIcon={<EditIcon />}
                            sx={{
                              textTransform: 'none',
                              fontWeight: 600,
                              borderColor: theme.palette.primary.main,
                              color: theme.palette.primary.main,
                              '&:hover': {
                                borderColor: theme.palette.primary.dark,
                                bgcolor: alpha(theme.palette.primary.main, 0.05),
                              },
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="contained"
                            startIcon={<PlayIcon />}
                            onClick={() => handleCreateInstance(workflow.id)}
                            sx={{
                              textTransform: 'none',
                              fontWeight: 600,
                              bgcolor: theme.palette.success.main,
                              '&:hover': {
                                bgcolor: theme.palette.success.dark,
                              },
                            }}
                          >
                            Create Instance
                          </Button>
                        </Stack>
                      </Box>
                    </CardContent>
                  </GlowCard>
                </motion.div>
              ))}
            </Stack>
          </Box>
        )}
      </Container>

      {/* Create Workflow Dialog */}
      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)}, ${alpha(theme.palette.secondary.main, 0.05)})`,
            backdropFilter: 'blur(10px)',
          },
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Create New Workflow
            </Typography>
            <IconButton onClick={() => setShowCreateModal(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Workflow Name"
            placeholder="My Awesome Workflow"
            value={newWorkflow.name}
            onChange={(e) => setNewWorkflow({ ...newWorkflow, name: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCreateWorkflow();
              }
            }}
            sx={{
              mt: 2,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button
            onClick={() => {
              setShowCreateModal(false);
              setNewWorkflow({ name: '' });
            }}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Cancel
          </Button>
          <StyledButton
            variant="contained"
            onClick={handleCreateWorkflow}
            startIcon={<AddIcon />}
            sx={{ textTransform: 'none' }}
          >
            Create
          </StyledButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

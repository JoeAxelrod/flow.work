"use client";
import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { listWorkflows, createWorkflow } from "./api-client";
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
  Fade,
  Zoom,
  Slide,
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
  keyframes,
} from "@mui/material";
import {
  AccountTree as WorkflowIcon,
  Add as AddIcon,
  Dashboard as DashboardIcon,
  Timer as TimerIcon,
  Webhook as WebhookIcon,
  Code as CodeIcon,
  TrendingUp as TrendingUpIcon,
  Bolt as BoltIcon,
  CheckCircle as CheckCircleIcon,
  ArrowForward as ArrowForwardIcon,
  AutoAwesome as AutoAwesomeIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  CloudQueue as CloudQueueIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { motion } from "framer-motion";

interface Workflow {
  id: string;
  name: string;
  createdAt: string;
}

// Styled Components with tons of styling
const AnimatedGradientBox = styled(Box)(({ theme }) => ({
  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
  backgroundSize: "200% 200%",
  animation: "gradientShift 8s ease infinite",
  "@keyframes gradientShift": {
    "0%": { backgroundPosition: "0% 50%" },
    "50%": { backgroundPosition: "100% 50%" },
    "100%": { backgroundPosition: "0% 50%" },
  },
}));

const GlowCard = styled(Card)(({ theme }) => ({
  position: "relative",
  overflow: "visible",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    transform: "translateY(-8px) scale(1.02)",
    boxShadow: `0 20px 40px ${alpha(theme.palette.primary.main, 0.3)}`,
    "&::before": {
      opacity: 1,
    },
  },
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: theme.shape.borderRadius,
    padding: "2px",
    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
    WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
    WebkitMaskComposite: "xor",
    maskComposite: "exclude",
    opacity: 0,
    transition: "opacity 0.3s",
  },
}));

const FloatingIcon = styled(Box)(({ theme }) => ({
  animation: "float 3s ease-in-out infinite",
  "@keyframes float": {
    "0%, 100%": { transform: "translateY(0px)" },
    "50%": { transform: "translateY(-20px)" },
  },
}));

const PulseBox = styled(Box)(({ theme }) => ({
  animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
  "@keyframes pulse": {
    "0%, 100%": { opacity: 1 },
    "50%": { opacity: 0.5 },
  },
}));

const ShimmerText = styled(Typography)(({ theme }) => ({
  background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main}, ${theme.palette.primary.main})`,
  backgroundSize: "200% auto",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
  animation: "shimmer 3s linear infinite",
  "@keyframes shimmer": {
    "0%": { backgroundPosition: "0% center" },
    "100%": { backgroundPosition: "200% center" },
  },
}));

const StyledButton = styled(Button)(({ theme }) => ({
  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
  borderRadius: "50px",
  padding: "12px 32px",
  textTransform: "none",
  fontWeight: 600,
  boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.3)}`,
  transition: "all 0.3s ease",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: `0 12px 24px ${alpha(theme.palette.primary.main, 0.4)}`,
    background: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
  },
}));

export default function Page() {
  const router = useRouter();
  const theme = useTheme();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWorkflow, setNewWorkflow] = useState({ name: "" });

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
    if (!newWorkflow.name) {
      alert("Please provide a name");
      return;
    }

    try {
      const created = await createWorkflow(newWorkflow.name);
      setShowCreateModal(false);
      setNewWorkflow({ name: "" });
      router.push(`/workflows/${created.id}/editor`);
    } catch (error: any) {
      alert(`Failed to create workflow: ${error.message}`);
    }
  };

  const recentWorkflows = workflows.slice(0, 5);
  
  const stats = useMemo(() => [
    {
      icon: WorkflowIcon,
      label: "Total Workflows",
      value: loading ? "..." : workflows.length,
      color: theme.palette.primary.main,
      gradient: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
    },
    {
      icon: BoltIcon,
      label: "HTTP Actions",
      value: "Unlimited",
      color: theme.palette.success.main,
      gradient: `linear-gradient(135deg, ${theme.palette.success.main}, ${theme.palette.success.dark})`,
    },
    {
      icon: TimerIcon,
      label: "Durable Timers",
      value: "Supported",
      color: theme.palette.info.main,
      gradient: `linear-gradient(135deg, ${theme.palette.info.main}, ${theme.palette.info.dark})`,
    },
    {
      icon: TrendingUpIcon,
      label: "Performance",
      value: "99.9%",
      color: theme.palette.warning.main,
      gradient: `linear-gradient(135deg, ${theme.palette.warning.main}, ${theme.palette.warning.dark})`,
    },
  ], [loading, workflows.length, theme]);

  const features = useMemo(() => [
    {
      icon: CodeIcon,
      title: "Visual Editor",
      description: "Create and edit workflows with an intuitive drag-and-drop visual editor. Build complex automation flows effortlessly.",
      color: theme.palette.primary.main,
      gradient: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
    },
    {
      icon: TimerIcon,
      title: "Durable Timers",
      description: "Schedule delays and time-based actions with reliable, durable timers powered by RabbitMQ.",
      color: theme.palette.success.main,
      gradient: `linear-gradient(135deg, ${theme.palette.success.main}, ${theme.palette.success.dark})`,
    },
    {
      icon: WebhookIcon,
      title: "Webhooks & HTTP",
      description: "Integrate with external systems using webhooks and HTTP endpoints. Connect to any API seamlessly.",
      color: theme.palette.info.main,
      gradient: `linear-gradient(135deg, ${theme.palette.info.main}, ${theme.palette.info.dark})`,
    },
    {
      icon: SecurityIcon,
      title: "Enterprise Security",
      description: "Built with security in mind. Enterprise-grade authentication and authorization for your workflows.",
      color: theme.palette.error.main,
      gradient: `linear-gradient(135deg, ${theme.palette.error.main}, ${theme.palette.error.dark})`,
    },
    {
      icon: SpeedIcon,
      title: "High Performance",
      description: "Lightning-fast execution with optimized engine. Handle millions of workflow instances with ease.",
      color: theme.palette.warning.main,
      gradient: `linear-gradient(135deg, ${theme.palette.warning.main}, ${theme.palette.warning.dark})`,
    },
    {
      icon: CloudQueueIcon,
      title: "Cloud Ready",
      description: "Deploy anywhere - on-premises, cloud, or hybrid. Scalable architecture that grows with you.",
      color: theme.palette.secondary.main,
      gradient: `linear-gradient(135deg, ${theme.palette.secondary.main}, ${theme.palette.secondary.dark})`,
    },
  ], [theme]);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      {/* Animated Gradient AppBar */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
          backdropFilter: "blur(10px)",
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Toolbar>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexGrow: 1 }}>
            <motion.div
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.6 }}
            >
              <Avatar
                sx={{
                  bgcolor: "white",
                  color: theme.palette.primary.main,
                  width: 48,
                  height: 48,
                  boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                }}
              >
                <WorkflowIcon />
              </Avatar>
            </motion.div>
            <Typography
              variant="h5"
              component="div"
              sx={{
                fontWeight: 800,
                background: "linear-gradient(45deg, #fff, #e0e0e0)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Workflow Engine
            </Typography>
          </Box>
          <Stack direction="row" spacing={2} alignItems="center">
            <Button
              component={Link}
              href="/workflows"
              sx={{
                color: "white",
                fontWeight: 600,
                "&:hover": {
                  bgcolor: alpha(theme.palette.common.white, 0.1),
                },
              }}
            >
              All Workflows
            </Button>
            <StyledButton
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setShowCreateModal(true)}
              sx={{
                bgcolor: "white",
                color: theme.palette.primary.main,
                "&:hover": {
                  bgcolor: alpha(theme.palette.common.white, 0.9),
                  transform: "translateY(-2px)",
                },
              }}
            >
              Create Workflow
            </StyledButton>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Hero Section with Animation */}
      <AnimatedGradientBox
        sx={{
          position: "relative",
          overflow: "hidden",
          py: { xs: 8, md: 12 },
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "radial-gradient(circle at 30% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)",
          },
        }}
      >
        <Container maxWidth="lg">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Box sx={{ textAlign: "center", position: "relative", zIndex: 1 }}>
              <FloatingIcon sx={{ display: "inline-flex", mb: 2 }}>
                <AutoAwesomeIcon sx={{ fontSize: 80, color: "white", opacity: 0.9 }} />
              </FloatingIcon>
              <ShimmerText
                variant="h1"
                sx={{
                  fontSize: { xs: "3rem", md: "5rem", lg: "6rem" },
                  fontWeight: 900,
                  mb: 2,
                  color: "white",
                  textShadow: "0 4px 20px rgba(0,0,0,0.2)",
                }}
              >
                Automate Your Workflows
              </ShimmerText>
              <Typography
                variant="h5"
                sx={{
                  color: "rgba(255,255,255,0.95)",
                  mb: 4,
                  maxWidth: "800px",
                  mx: "auto",
                  fontWeight: 300,
                  lineHeight: 1.6,
                }}
              >
                Build powerful, event-driven workflows with HTTP actions, timers, and webhooks.
                Create, manage, and execute complex automation workflows with ease.
              </Typography>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                justifyContent="center"
                sx={{ mt: 4 }}
              >
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <StyledButton
                    variant="contained"
                    size="large"
                    startIcon={<AddIcon />}
                    onClick={() => setShowCreateModal(true)}
                    sx={{
                      bgcolor: "white",
                      color: theme.palette.primary.main,
                      fontSize: "1.1rem",
                      px: 4,
                      py: 1.5,
                    }}
                  >
                    Get Started
                  </StyledButton>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    component={Link}
                    href="/workflows"
                    variant="outlined"
                    size="large"
                    endIcon={<ArrowForwardIcon />}
                    sx={{
                      borderColor: "white",
                      color: "white",
                      fontSize: "1.1rem",
                      px: 4,
                      py: 1.5,
                      borderWidth: 2,
                      "&:hover": {
                        borderWidth: 2,
                        bgcolor: alpha(theme.palette.common.white, 0.1),
                      },
                    }}
                  >
                    View Workflows
                  </Button>
                </motion.div>
              </Stack>
            </Box>
          </motion.div>
        </Container>
      </AnimatedGradientBox>

      {/* Stats Section with Glow Cards */}
      <Container maxWidth="lg" sx={{ mt: -6, position: "relative", zIndex: 2 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }, gap: 3 }}>
          {stats.map((stat, index) => (
            <Box key={index}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                <GlowCard
                  sx={{
                    height: "100%",
                    background: `linear-gradient(135deg, ${alpha(stat.color, 0.1)}, ${alpha(stat.color, 0.05)})`,
                    backdropFilter: "blur(10px)",
                    border: `1px solid ${alpha(stat.color, 0.2)}`,
                  }}
                >
                  <CardContent>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mb: 2,
                        p: 2,
                        borderRadius: "50%",
                        background: stat.gradient,
                        width: 80,
                        height: 80,
                        mx: "auto",
                        boxShadow: `0 8px 24px ${alpha(stat.color, 0.4)}`,
                      }}
                    >
                      <Box sx={{ color: "white" }}>
                        {React.createElement(stat.icon, { sx: { fontSize: 40 } })}
                      </Box>
                    </Box>
                    <Typography
                      variant="h3"
                      sx={{
                        textAlign: "center",
                        fontWeight: 800,
                        mb: 1,
                        background: stat.gradient,
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                      }}
                    >
                      {stat.value}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        textAlign: "center",
                        color: "text.secondary",
                        fontWeight: 500,
                      }}
                    >
                      {stat.label}
                    </Typography>
                  </CardContent>
                </GlowCard>
              </motion.div>
            </Box>
          ))}
        </Box>
      </Container>

      {/* Recent Workflows Section */}
      <Container maxWidth="lg" sx={{ mt: 8, mb: 8 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 800,
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Recent Workflows
            </Typography>
          </motion.div>
          <Button
            component={Link}
            href="/workflows"
            endIcon={<ArrowForwardIcon />}
            sx={{
              fontWeight: 600,
              textTransform: "none",
            }}
          >
            View all
          </Button>
        </Box>

        {loading ? (
          <Card sx={{ p: 8, textAlign: "center" }}>
            <PulseBox>
              <LinearProgress sx={{ mb: 2 }} />
            </PulseBox>
            <Typography variant="body1" color="text.secondary">
              Loading workflows...
            </Typography>
          </Card>
        ) : recentWorkflows.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Card
              sx={{
                p: 8,
                textAlign: "center",
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)}, ${alpha(theme.palette.secondary.main, 0.05)})`,
                border: `2px dashed ${alpha(theme.palette.primary.main, 0.3)}`,
              }}
            >
              <WorkflowIcon sx={{ fontSize: 80, color: "text.secondary", mb: 2, opacity: 0.5 }} />
              <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                No workflows yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                Get started by creating your first workflow
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
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" }, gap: 3 }}>
            {recentWorkflows.map((workflow, index) => (
              <Box key={workflow.id}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -8 }}
                >
                  <Box
                    component={Link}
                    href={`/workflows/${workflow.id}/editor`}
                    sx={{
                      textDecoration: "none",
                      display: "block",
                      height: "100%",
                    }}
                  >
                    <GlowCard
                      sx={{
                        height: "100%",
                        cursor: "pointer",
                      }}
                    >
                    <CardContent>
                      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                        <Avatar
                          sx={{
                            bgcolor: theme.palette.primary.main,
                            mr: 2,
                            width: 48,
                            height: 48,
                          }}
                        >
                          <WorkflowIcon />
                        </Avatar>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography
                            variant="h6"
                            sx={{
                              fontWeight: 700,
                              color: "text.primary",
                              mb: 0.5,
                            }}
                          >
                            {workflow.name}
                          </Typography>
                          <Chip
                            label="Active"
                            size="small"
                            color="success"
                            sx={{ height: 20, fontSize: "0.7rem" }}
                          />
                        </Box>
                        <ArrowForwardIcon sx={{ color: "text.secondary" }} />
                      </Box>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="body2" color="text.secondary">
                        Created {new Date(workflow.createdAt).toLocaleDateString()}
                      </Typography>
                    </CardContent>
                    </GlowCard>
                  </Box>
                </motion.div>
              </Box>
            ))}
          </Box>
        )}
      </Container>

      {/* Features Section */}
      <Box
        sx={{
          bgcolor: "background.paper",
          py: 8,
          background: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.02)}, ${alpha(theme.palette.secondary.main, 0.02)})`,
        }}
      >
        <Container maxWidth="lg">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Typography
              variant="h3"
              sx={{
                textAlign: "center",
                fontWeight: 800,
                mb: 6,
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Powerful Features
            </Typography>
          </motion.div>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" }, gap: 4 }}>
            {features.map((feature, index) => (
              <Box key={index}>
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  whileHover={{ y: -8 }}
                >
                  <GlowCard
                    sx={{
                      height: "100%",
                      p: 3,
                      background: `linear-gradient(135deg, ${alpha(feature.color, 0.05)}, ${alpha(feature.color, 0.02)})`,
                      border: `1px solid ${alpha(feature.color, 0.1)}`,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 64,
                        height: 64,
                        borderRadius: "16px",
                        background: feature.gradient,
                        mb: 3,
                        boxShadow: `0 8px 24px ${alpha(feature.color, 0.3)}`,
                      }}
                    >
                      <Box sx={{ color: "white", fontSize: 32 }}>
                        {React.createElement(feature.icon)}
                      </Box>
                    </Box>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 700,
                        mb: 1.5,
                        color: "text.primary",
                      }}
                    >
                      {feature.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                      {feature.description}
                    </Typography>
                  </GlowCard>
                </motion.div>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

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
            backdropFilter: "blur(10px)",
          },
        }}
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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
              if (e.key === "Enter") {
                handleCreateWorkflow();
              }
            }}
            sx={{
              mt: 2,
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button
            onClick={() => {
              setShowCreateModal(false);
              setNewWorkflow({ name: "" });
            }}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            Cancel
          </Button>
          <StyledButton
            variant="contained"
            onClick={handleCreateWorkflow}
            startIcon={<AddIcon />}
            sx={{ textTransform: "none" }}
          >
            Create
          </StyledButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

import express from "express";
import authtRoutes from "../src/routes/auth.route.js";
import agentRoutes from "../src/routes/agent.route.js";
import appointmentRoutes from "../src/routes/appointment.route.js";

const app = express();

app.use(express.json());
app.use("/auth", authtRoutes);
app.use("/agent", agentRoutes);
app.use("/appointment", appointmentRoutes);

export default app;

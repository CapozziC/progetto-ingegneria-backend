import express from "express";
import authtRoutes from "../src/routes/auth.route.js";
import agentRoutes from "../src/routes/agent.route.js";
import appointmentRoutes from "../src/routes/appointment.route.js";
import advertisementRoutes from "../src/routes/advertisement.route.js";
import offerRoutes from "../src/routes/offer.route.js";

const app = express();

app.use(express.json());
app.use("/auth", authtRoutes);
app.use("/agent", agentRoutes);
app.use("/appointment", appointmentRoutes);
app.use("/advertisement", advertisementRoutes);
app.use("/offer", offerRoutes);

export default app;

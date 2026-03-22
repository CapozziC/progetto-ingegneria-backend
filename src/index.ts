import "reflect-metadata";
import { AppDataSource } from "./data-source.js";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.route.js";
import agentRoutes from "./routes/agent.route.js";
import advertisementRoutes from "./routes/advertisement.route.js";
import appointmentRoutes from "./routes/appointment.route.js";
import accountRoutes from "./routes/account.route.js";
import uploadRoutes from "./routes/upload.route.js";
import offerRoutes from "./routes/offer.route.js";
import { verifySmtpConnection } from "./config/nodemailer.config.js";

try {
  // Initialize database connection
  await AppDataSource.initialize();
  const port = 3000;
  const app = express();
  app.use(
    cors({
      origin: ["http://localhost:5173", "https://www.dietiestates.cloud"],
      credentials: true,
    }),
  );
  app.set("trust proxy", true);
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  const uploadDir = process.env.UPLOAD_DIR;
  if (!uploadDir) {
    throw new Error("UPLOAD_DIR environment variable is not defined");
  }
  app.use("/uploads", express.static(uploadDir));

  // Use auth routes
  app.use("/auth", authRoutes);
  app.use("/agent", agentRoutes);
  app.use("/advertisement", advertisementRoutes);
  app.use("/appointment", appointmentRoutes);
  app.use("/account", accountRoutes);
  app.use("/upload", uploadRoutes);
  app.use("/offer", offerRoutes);

  // Define a route handler for the default home page
  app.get("/", (req, res) => {
    res.send("Hello World!");
  });
  app.get("/health", (req, res) => {
    res.send("OK");
  });

  // Check backend connection
  app.listen(port, "0.0.0.0", () => {
    console.log(`Example app listening on port ${port}`);
  });

  // Verify SMTP connection
  await verifySmtpConnection();
} catch (error) {
  console.log(error);
}

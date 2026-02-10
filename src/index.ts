import "reflect-metadata";
import express from "express";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.route.js";
import { AppDataSource } from "./data-source.js";

try {
  // Initialize database connection
  await AppDataSource.initialize();
  const port = 3000;
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  // Use auth routes
  app.use("/auth", authRoutes);

  // Define a route handler for the default home page
  app.get("/", (req, res) => {
    res.send("Hello World!");
  });

  // Check backend connection
  app.listen(port, "0.0.0.0", () => {
    console.log(`Example app listening on port ${port}`);
  });
} catch (error) {
  console.log(error);
}

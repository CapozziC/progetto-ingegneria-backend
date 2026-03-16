import express from "express";
import authtRoutes from "../src/routes/auth.route.js";

const app = express();

app.use(express.json());
app.use("/auth", authtRoutes);

export default app;

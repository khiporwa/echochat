const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const app = express();
const port = 3001;

// Import routes
const authRoutes = require("./routes/auth");
const premiumRoutes = require("./routes/premium");

app.use(
  cors({
    origin: "http://localhost:8080", // Adjust if your frontend runs on a different port
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/premium", premiumRoutes);

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});
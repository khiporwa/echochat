const express = require("express");
const router = express.Router();

// Get premium plans
router.get("/plans", (req, res) => {
  res.json({
    plans: [
      {
        id: "monthly",
        name: "Monthly Premium",
        price: 9.99,
        currency: "USD",
        features: [
          "Filter matches by gender",
          "Skip unlimited times",
          "Priority matching",
          "Ad-free experience",
        ],
      },
      {
        id: "yearly",
        name: "Yearly Premium",
        price: 79.99,
        currency: "USD",
        savings: 20,
        features: [
          "Filter matches by gender",
          "Skip unlimited times",
          "Priority matching",
          "Ad-free experience",
          "Save 20% vs monthly",
        ],
      },
    ],
  });
});

module.exports = router;
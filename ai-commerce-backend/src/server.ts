import "dotenv/config";
import express from "express";
import cors from "cors";
import productsRouter from "./routes/products.js";
import session from "express-session";
import authRouter from "./routes/auth.js";
import interactionsRouter from "./routes/interactions.js";
import { syncCatalogToAlgolia } from "./integrations/algolia/catalog.js";
import { getRelatedProducts } from "./integrations/algolia/recommend.js";
import { getValidatedRelatedProducts } from "./integrations/algolia/validatedRecommendations.js";
import cartRouter from "./routes/cart.js";
import authorizationRouter from "./routes/authorization.js";
import checkoutRouter from "./routes/checkout.js";
import growthRouter from "./routes/growth.js";
import growthAuditRouter from "./routes/growthAudit.js";
import growthAnalyticsRouter from "./routes/growthAnalytics.js";
import { requireMerchant } from "./auth/merchant.js";
import klaviyoRouter from "./routes/klaviyo.js";
import { runAbandonedCartWorker } from "./workers/abandonedCartWorker.js";

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:8080",
    credentials: true,
  })
);

app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "ai-commerce-backend",
  });
});

app.use("/auth", authRouter);
app.use("/products", productsRouter);
app.use("/interactions", interactionsRouter);
app.use("/cart", cartRouter);
app.use("/authorization", authorizationRouter);
app.use("/checkout", checkoutRouter);
app.use("/growth", growthRouter);
app.use("/growth/analytics", requireMerchant, growthAnalyticsRouter);
app.use("/growth/audit", requireMerchant, growthAuditRouter);
app.use("/klaviyo", klaviyoRouter);

const PORT = process.env.PORT || 8000;

app.post("/admin/sync/algolia", async (_req, res) => {
  try {
    const result = await syncCatalogToAlgolia();

    return res.json({
      success: true,
      message: "Medusa catalog synchronized to Algolia",
      indexed: result.indexed,
    });
  } catch (error) {
    console.error("Algolia catalog sync failed:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to synchronize Medusa catalog to Algolia",
    });
  }
});

app.get("/products/:productId/recommendations", async (req, res) => {
  try {
    const { productId } = req.params;
    const recommendations = await getRelatedProducts(productId, 6);

    return res.json({
      success: true,
      productId,
      recommendations,
    });
  } catch (error) {
    console.error("Algolia recommendations failed:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve product recommendations",
    });
  }
});

app.post(
  "/products/:productId/validated-recommendations",
  async (req, res) => {
    try {
      const { productId } = req.params;

      const constraints = req.body ?? {};

      const recommendations = await getValidatedRelatedProducts(
        productId,
        constraints,
        6
      );

      return res.json({
        success: true,
        productId,
        constraints,
        recommendations,
      });
    } catch (error) {
      console.error("Validated recommendations failed:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to retrieve validated recommendations",
      });
    }
  }
);

app.listen(PORT, () => {
  console.log(
    `AI Commerce Backend running on http://localhost:${PORT}`
  );

  void runAbandonedCartWorker();

  setInterval(() => {
    void runAbandonedCartWorker();
  }, 5 * 60 * 1000);
});
import { Router } from "express";
import { orchestrateGrowth } from "../growth/orchestrator.js";
import {
  createGrowthOffer,
  getGrowthOffer,
  acceptGrowthOffer,
  declineGrowthOffer,
} from "../growth/offer.js";
import { applyGrowthOfferToCart } from "../growth/cartAction.js";
import { recordGrowthAudit } from "../growth/audit.js";

const router = Router();

router.post("/recommendation", async (req, res) => {
  try {
    const {
      productId,
      currentProductPrice,
      maxPrice,
      category,
      inStockOnly,
    } = req.body;

    if (!productId || currentProductPrice === undefined) {
      return res.status(400).json({
        success: false,
        error: "productId and currentProductPrice are required",
      });
    }

    const decision = await orchestrateGrowth({
      productId,
      currentProductPrice,
      maxPrice,
      category,
      inStockOnly,
    });

    await recordGrowthAudit({
      event: "GROWTH_RECOMMENDATION",
      sessionId: req.sessionID,
      userId: (req.session as any)?.userId,
      productId,
      recommendedProductId: decision.recommendedProductId,
      action: decision.action,
      reason: decision.reason,
      amount: decision.recommendedProductPrice,
      currency: "INR",
      metadata: {
        currentProductPrice,
        maxPrice,
        category,
        inStockOnly,
      },
    });

    return res.json({
      success: true,
      decision,
    });
  } catch (error) {
    console.error("Growth orchestration failed:", error);

    try {
      await recordGrowthAudit({
        event: "GROWTH_FAILURE",
        sessionId: req.sessionID,
        userId: (req.session as any)?.userId,
        metadata: {
          operation: "recommendation",
          error:
            error instanceof Error
              ? error.message
              : "Growth orchestration failed",
        },
      });
    } catch (auditError) {
      console.error("Growth audit failed:", auditError);
    }

    return res.status(500).json({
      success: false,
      error: "Growth orchestration failed",
    });
  }
});

router.post("/offer", async (req, res) => {
  try {
    const {
      productId,
      currentProductPrice,
      maxPrice,
      category,
      inStockOnly,
    } = req.body;

    if (!productId || currentProductPrice === undefined) {
      return res.status(400).json({
        success: false,
        error: "productId and currentProductPrice are required",
      });
    }

    const decision = await orchestrateGrowth({
      productId,
      currentProductPrice,
      maxPrice,
      category,
      inStockOnly,
    });

    let recommendedProductName: string | undefined;

    if (decision.recommendedProductId) {
      try {
        const recommendedProduct = await import(
          "../adapters/commerce/medusa.js"
        ).then(({ default: adapter }) =>
          adapter.getProduct(decision.recommendedProductId!)
        );

        recommendedProductName =
          (recommendedProduct as any)?.title ??
          (recommendedProduct as any)?.name ??
          undefined;
      } catch (error) {
        console.error(
          "Unable to retrieve recommended product:",
          error
        );
      }
    }

    const offer = createGrowthOffer(
      decision,
      recommendedProductName
    );

    await recordGrowthAudit({
      event: "GROWTH_OFFER_CREATED",
      offerId: offer.offerId,
      sessionId: req.sessionID,
      userId: (req.session as any)?.userId,
      productId: decision.baseProductId,
      recommendedProductId: decision.recommendedProductId,
      action: decision.action,
      reason: decision.reason,
      amount: decision.recommendedProductPrice,
      currency: "INR",
      metadata: {
        currentProductPrice,
        maxPrice,
        category,
        inStockOnly,
        expiresAt: offer.expiresAt,
      },
    });

    return res.status(201).json({
      success: true,
      offer,
    });
  } catch (error) {
    console.error("Growth offer creation failed:", error);

    return res.status(500).json({
      success: false,
      error: "Growth offer creation failed",
    });
  }
});

router.get("/offer/:offerId", (req, res) => {
  const offer = getGrowthOffer(req.params.offerId);

  if (!offer) {
    return res.status(404).json({
      success: false,
      error: "Offer not found",
    });
  }

  return res.json({
    success: true,
    offer,
  });
});

router.post("/offer/:offerId/accept", async (req, res) => {
  try {
    const offer = acceptGrowthOffer(req.params.offerId);

    await recordGrowthAudit({
      event: "GROWTH_OFFER_ACCEPTED",
      offerId: offer.offerId,
      sessionId: req.sessionID,
      userId: (req.session as any)?.userId,
      productId: offer.baseProductId,
      recommendedProductId: offer.recommendedProductId,
      action: offer.action,
      reason: offer.reason,
      amount: offer.recommendedPrice,
      currency: "INR",
    });

    return res.json({
      success: true,
      offer,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to accept offer",
    });
  }
});

router.post("/offer/:offerId/apply", async (req, res) => {
  try {
    const { cartId } = req.body;

    if (!cartId) {
      return res.status(400).json({
        success: false,
        error: "cartId is required",
      });
    }

    const result = await applyGrowthOfferToCart(
      req.params.offerId,
      cartId
    );

    const offer = getGrowthOffer(req.params.offerId);

    await recordGrowthAudit({
      event: "GROWTH_CART_MUTATION",
      offerId: req.params.offerId,
      sessionId: req.sessionID,
      userId: (req.session as any)?.userId,
      productId: offer?.baseProductId,
      recommendedProductId: result.productId,
      action: offer?.action,
      reason: offer?.reason,
      amount: result.cart.total,
      currency: result.cart.currency_code,
      metadata: {
        cartId,
        variantId: result.variantId,
        quantity: 1,
        cartTotal: result.cart.total,
      },
    });

    await recordGrowthAudit({
      event: "GROWTH_OFFER_ACCEPTED",
      offerId: req.params.offerId,
      sessionId: req.sessionID,
      userId: (req.session as any)?.userId,
      productId: offer?.baseProductId,
      recommendedProductId: result.productId,
      action: offer?.action,
      reason: offer?.reason,
      amount: offer?.recommendedPrice,
      currency: result.cart.currency_code,
      metadata: {
        acceptedThrough: "apply",
        cartId,
      },
    });

    return res.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Growth offer application failed:", error);

    try {
      await recordGrowthAudit({
        event: "GROWTH_FAILURE",
        offerId: req.params.offerId,
        sessionId: req.sessionID,
        userId: (req.session as any)?.userId,
        metadata: {
          operation: "apply",
          cartId: req.body?.cartId,
          error:
            error instanceof Error
              ? error.message
              : "Unable to apply growth offer",
        },
      });
    } catch (auditError) {
      console.error("Growth audit failed:", auditError);
    }

    return res.status(400).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to apply growth offer",
    });
  }
});

router.post("/offer/:offerId/decline", async (req, res) => {
  try {
    const offer = declineGrowthOffer(req.params.offerId);

    await recordGrowthAudit({
      event: "GROWTH_OFFER_DECLINED",
      offerId: offer.offerId,
      sessionId: req.sessionID,
      userId: (req.session as any)?.userId,
      productId: offer.baseProductId,
      recommendedProductId: offer.recommendedProductId,
      action: offer.action,
      reason: offer.reason,
      amount: offer.recommendedPrice,
      currency: "INR",
    });

    return res.json({
      success: true,
      offer,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to decline offer",
    });
  }
});

export default router;
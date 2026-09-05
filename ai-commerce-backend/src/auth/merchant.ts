import type { Request, Response, NextFunction } from "express";

export function requireMerchant(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const userId = (req.session as any)?.userId;

  if (!userId) {
    return res.status(401).json({
      success: false,
      error: "AUTHENTICATION_REQUIRED",
    });
  }

  const merchantEmail = process.env.MERCHANT_EMAIL?.trim().toLowerCase();

  if (!merchantEmail) {
    return res.status(500).json({
      success: false,
      error: "MERCHANT_ACCESS_NOT_CONFIGURED",
    });
  }

  const userEmail = (req.session as any)?.email?.trim().toLowerCase();

  if (!userEmail || userEmail !== merchantEmail) {
    return res.status(403).json({
      success: false,
      error: "MERCHANT_ACCESS_REQUIRED",
    });
  }

  next();
}
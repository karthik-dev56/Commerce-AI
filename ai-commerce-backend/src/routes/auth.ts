import { Router } from "express";
import { OAuth2Client } from "google-auth-library";
import { pool } from "../db/database.js";

const router = Router();

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CALLBACK_URL
);

router.get("/google", (_req, res) => {
  const authorizationUrl = googleClient.generateAuthUrl({
    access_type: "offline",
    scope: [
      "openid",
      "email",
      "profile",
    ],
    prompt: "select_account",
  });

  res.redirect(authorizationUrl);
});

router.get(
  "/google/callback",
  async (req, res) => {
    try {
      const { code } = req.query;

      if (!code || typeof code !== "string") {
        return res.status(400).json({
          error: "Authorization code is required",
        });
      }

      const { tokens } = await googleClient.getToken(code);

      if (!tokens.id_token) {
        return res.status(401).json({
          error: "Google did not return an ID token",
        });
      }

      const ticket = await googleClient.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();

      if (!payload?.sub || !payload.email) {
        return res.status(401).json({
          error: "Invalid Google identity",
        });
      }

      const googleId = payload.sub;
      const email = payload.email;
      const name = payload.name ?? null;
      const picture = payload.picture ?? null;

      let result = await pool.query(
        `
        SELECT id, google_id, email, name, picture
        FROM users
        WHERE google_id = $1
        `,
        [googleId]
      );

      let user;

      if (result.rows.length > 0) {
        user = result.rows[0];

        result = await pool.query(
          `
          UPDATE users
          SET
            email = $1,
            name = $2,
            picture = $3,
            updated_at = NOW()
          WHERE id = $4
          RETURNING id, google_id, email, name, picture
          `,
          [
            email,
            name,
            picture,
            user.id,
          ]
        );

        user = result.rows[0];
      } else {
        result = await pool.query(
          `
          INSERT INTO users (
            google_id,
            email,
            name,
            picture
          )
          VALUES ($1, $2, $3, $4)
          RETURNING id, google_id, email, name, picture
          `,
          [
            googleId,
            email,
            name,
            picture,
          ]
        );

        user = result.rows[0];
      }

      req.session.user = {
        googleId: user.google_id,
        email: user.email,
        name: user.name,
        picture: user.picture,
      };

      req.session.userId = user.id;
      (req.session as any).email = user.email;

      req.session.save((sessionError) => {
        if (sessionError) {
          console.error(
            "Failed to save authentication session:",
            sessionError
          );

          return res.status(500).json({
            error: "Failed to save authentication session",
          });
        }

        return res.redirect(
          process.env.FRONTEND_URL ||
            "http://localhost:8080"
        );
      });
    } catch (error) {
      console.error(
        "Google authentication failed:",
        error
      );

      res.status(500).json({
        error: "Google authentication failed",
      });
    }
  }
);

router.get("/me", async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({
        authenticated: false,
      });
    }

    const result = await pool.query(
      `
      SELECT
        id,
        email,
        name,
        picture
      FROM users
      WHERE id = $1
      `,
      [userId]
    );

    if (result.rows.length === 0) {
      req.session.destroy(() => {});

      return res.status(401).json({
        authenticated: false,
      });
    }

    res.json({
      authenticated: true,
      user: result.rows[0],
    });
  } catch (error) {
    console.error(
      "Authentication session check failed:",
      error
    );

    res.status(500).json({
      error: "Failed to check authentication",
    });
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      console.error("Logout failed:", error);

      return res.status(500).json({
        success: false,
        error: "Failed to logout",
      });
    }

    res.clearCookie("connect.sid", {
      path: "/",
    });

    return res.status(200).json({
      success: true,
    });
  });
});

export default router;
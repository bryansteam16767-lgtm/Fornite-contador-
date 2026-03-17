import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";
const ALLOWED_EMAIL = process.env.ALLOWED_CREATOR_EMAIL || "bryancreador16767@gmail.com";

const oauth2Client = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET
);

async function startServer() {
  const app = express();
  const PORT = 3000;

  let twitchAccessToken: string | null = null;
  let tokenExpiry: number = 0;
  let manualLiveOverride: boolean | null = null; // null = auto, true = forced live, false = forced offline

  app.use(express.json());
  app.use(cookieParser());

  // Helper to get redirect URI
  const getRedirectUri = (req: express.Request) => {
    const origin = req.get('origin') || req.get('referer') || process.env.APP_URL || `http://localhost:${PORT}`;
    const url = new URL(origin);
    return `${url.origin}/api/auth/google/callback`;
  };

  async function getTwitchToken() {
    const clientId = process.env.TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.warn("TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET not set");
      return null;
    }

    if (twitchAccessToken && Date.now() < tokenExpiry) {
      return twitchAccessToken;
    }

    try {
      const response = await fetch("https://id.twitch.tv/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "client_credentials",
        }),
      });

      const data = await response.json();
      if (data.access_token) {
        twitchAccessToken = data.access_token;
        tokenExpiry = Date.now() + (data.expires_in - 60) * 1000; // Buffer of 60 seconds
        return twitchAccessToken;
      }
    } catch (error) {
      console.error("Error fetching Twitch token:", error);
    }
    return null;
  }

  // API route to check Twitch status
  app.get("/api/twitch/status", async (req, res) => {
    if (manualLiveOverride !== null) {
      return res.json({ isLive: manualLiveOverride, isManual: true });
    }

    const username = "bryan16767";
    const clientId = process.env.TWITCH_CLIENT_ID;
    const token = await getTwitchToken();

    if (!clientId || !token) {
      return res.json({ isLive: false, error: "Twitch API not configured" });
    }

    try {
      const response = await fetch(`https://api.twitch.tv/helix/streams?user_login=${username}`, {
        headers: {
          "Client-ID": clientId,
          "Authorization": `Bearer ${token}`,
        },
      });

      const data = await response.json();
      const isLive = data.data && data.data.length > 0;
      const streamInfo = isLive ? data.data[0] : null;

      res.json({ 
        isLive, 
        isManual: false,
        title: streamInfo?.title || null,
        game: streamInfo?.game_name || null
      });
    } catch (error) {
      console.error("Error checking Twitch status:", error);
      res.status(500).json({ isLive: false, error: "Internal server error" });
    }
  });

  // Google Auth Routes
  app.get("/api/auth/google/url", (req, res) => {
    const redirectUri = getRedirectUri(req);
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/userinfo.email"],
      redirect_uri: redirectUri,
    });
    res.json({ url });
  });

  app.get("/api/auth/google/callback", async (req, res) => {
    const { code } = req.query;
    const redirectUri = getRedirectUri(req);

    try {
      const { tokens } = await oauth2Client.getToken({
        code: code as string,
        redirect_uri: redirectUri,
      });
      oauth2Client.setCredentials(tokens);

      const ticket = await oauth2Client.verifyIdToken({
        idToken: tokens.id_token!,
        audience: GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();

      if (payload?.email !== ALLOWED_EMAIL) {
        return res.send(`
          <html>
            <body>
              <script>
                alert("Acceso denegado: Solo ${ALLOWED_EMAIL} puede acceder.");
                window.close();
              </script>
            </body>
          </html>
        `);
      }

      // Create JWT
      const token = jwt.sign({ email: payload.email }, JWT_SECRET, { expiresIn: "24h" });

      res.cookie("creator_token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 24 * 60 * 60 * 1000,
      });

      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: "OAUTH_AUTH_SUCCESS" }, "*");
                window.close();
              } else {
                window.location.href = "/";
              }
            </script>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Error in Google Auth callback:", error);
      res.status(500).send("Authentication failed");
    }
  });

  app.get("/api/auth/me", (req, res) => {
    const token = req.cookies.creator_token;
    if (!token) return res.json({ authenticated: false });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { email: string };
      res.json({ authenticated: true, email: decoded.email });
    } catch (error) {
      res.json({ authenticated: false });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("creator_token");
    res.json({ success: true });
  });

  // API route to set manual override (Creator Mode)
  app.post("/api/creator/status", (req, res) => {
    const { status } = req.body; // status: true, false, or null (for auto)
    const token = req.cookies.creator_token;

    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      jwt.verify(token, JWT_SECRET);
      manualLiveOverride = status;
      res.json({ success: true, manualLiveOverride });
    } catch (error) {
      res.status(401).json({ error: "Invalid token" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

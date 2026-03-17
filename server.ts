import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  let twitchAccessToken: string | null = null;
  let tokenExpiry: number = 0;
  let manualLiveOverride: boolean | null = null; // null = auto, true = forced live, false = forced offline

  app.use(express.json());

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

  // API route to set manual override (Creator Mode)
  app.post("/api/creator/status", (req, res) => {
    const { password, status } = req.body; // status: true, false, or null (for auto)
    const correctPassword = process.env.CREATOR_PASSWORD || "bryan16767";
    
    if (password !== correctPassword) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    manualLiveOverride = status;
    res.json({ success: true, manualLiveOverride });
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

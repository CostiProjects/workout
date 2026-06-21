import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy load Gemini Client to catch missing API Key gracefully
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not defined. Please set it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// REST route for testing and text generation with configurable parameters and safety thresholds
app.post("/api/chat", async (req, res): Promise<any> => {
  try {
    const {
      prompt,
      model = "gemini-3.5-flash",
      temperature,
      topP,
      maxOutputTokens,
      systemInstruction,
      safetySettings,
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required." });
    }

    const ai = getGenAI();

    // Build configuration object
    const config: any = {};

    if (temperature !== undefined) config.temperature = Number(temperature);
    if (topP !== undefined) config.topP = Number(topP);
    if (maxOutputTokens !== undefined) config.maxOutputTokens = Number(maxOutputTokens);
    if (systemInstruction) config.systemInstruction = String(systemInstruction);
    if (Array.isArray(safetySettings) && safetySettings.length > 0) {
      config.safetySettings = safetySettings;
    }

    // Call generateContent with configured parameters
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config,
    });

    // Check if the response was blocked or has other issues
    const candidate = response.candidates?.[0];
    const finishReason = candidate?.finishReason;

    res.json({
      success: true,
      text: response.text || "",
      finishReason: finishReason || "UNKNOWN",
      rawResponse: response,
      safetyRatings: candidate?.safetyRatings || [],
    });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "An unexpected error occurred during processing.",
    });
  }
});

// Setup Vite Dev Server / Static files handler
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    // Dynamically import Vite package only in development environment to avoid bundle/dependency size bloat
    const { createServer: createViteServer } = await import("vite");
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
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

setupServer().catch((err) => {
  console.error("Failed to start server:", err);
});

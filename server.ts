import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
const port = parseInt(process.env.PORT || '3000', 10);

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // Endpoint 1: Analyze Reference Look (Multimodal image or description)
  app.post('/api/analyze-look', async (req, res) => {
    try {
      const { imageBase64, mimeType, description, targetFormat } = req.body;

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error: 'GEMINI_API_KEY is not configured in the server environment.',
        });
      }

      const prompt = `You are a Principal Color Scientist and Film Emulation Specialist.
Analyze the target look reference provided ${imageBase64 ? 'in the attached image' : 'in the prompt description'}.
User goal / context: ${description || 'Deconstruct this look into sensitometric tone curves, dye coupler cross-talk matrix, and film emulation parameters.'}

Return your response in STRICT JSON format with this schema:
{
  "lookName": "string, e.g. Kodak Portra 400 Warm Sunset or Cineon Log High Latitude",
  "stockFamily": "string, e.g. Kodak Portra / Vision3 / Fuji Superia / Fuji Velvia / Kodachrome / Cineon Log / Agfa",
  "sensitometry": {
    "toeLift": number between 0.00 and 0.20 (shadow density / black floor lift),
    "shadowGamma": number between 0.8 and 1.6 (contrast in shadows),
    "midtoneContrast": number between 0.8 and 1.8 (1.0 = neutral linear),
    "shoulderRollOff": number between 0.5 and 1.5 (soft highlight compression),
    "highlightClip": number between 0.85 and 1.0 (white point ceiling)
  },
  "colorMatrix": [
    [number around 1.0, number around 0.0, number around 0.0],
    [number around 0.0, number around 1.0, number around 0.0],
    [number around 0.0, number around 0.0, number around 1.0]
  ],
  "colorGrading": {
    "shadowTint": {"r": number (-0.2 to 0.2), "g": number (-0.2 to 0.2), "b": number (-0.2 to 0.2)},
    "highlightTint": {"r": number (-0.2 to 0.2), "g": number (-0.2 to 0.2), "b": number (-0.2 to 0.2)},
    "globalSaturation": number between 0.6 and 1.6 (1.0 = normal),
    "shadowSaturation": number between 0.5 and 1.3,
    "highlightSaturation": number between 0.4 and 1.2 (film highlights typically desaturate)
  },
  "opticalArtifacts": {
    "halationIntensity": number between 0.0 and 0.8 (red/orange diffusion glow at high contrast transitions),
    "halationThreshold": number between 0.65 and 0.95,
    "grainIntensity": number between 0.0 and 0.6 (organic silver halide grain),
    "grainRoughness": number between 0.2 and 0.8
  },
  "analysis": {
    "rgbDistribution": "Detailed scientific analysis of chromatic balance, primary dye densities, and hue shifts",
    "highlightCompression": "Analysis of dynamic range rolloff, specular knee, and highlight desaturation",
    "shadowLifting": "Analysis of toe curvature, flare factor, and shadow color cast (e.g. teal/cyan or warm density)",
    "skinToneReproduction": "Spectral response across Caucasian/Melanated skin tones, melanin protection",
    "practicalGradingAdvice": "Key technical notes for reproducing this in DaVinci Resolve, Baselight, or code"
  }
}
Output valid JSON only with no markdown backticks, or pure JSON enclosed in \`\`\`json.`;

      let contents: any;
      if (imageBase64) {
        // Strip data:image/...;base64, prefix if present
        const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
        contents = {
          parts: [
            {
              inlineData: {
                mimeType: mimeType || 'image/jpeg',
                data: cleanBase64,
              },
            },
            {
              text: prompt,
            },
          ],
        };
      } else {
        contents = prompt;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
      });

      const responseText = response.text || '';
      // Parse JSON safely
      let parsedData;
      try {
        const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        parsedData = JSON.parse(cleaned);
      } catch (parseErr) {
        // Fallback: extract first JSON block
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Could not parse JSON response from Color Science model: ' + responseText.slice(0, 200));
        }
      }

      return res.json(parsedData);
    } catch (err: any) {
      console.error('Error in /api/analyze-look:', err);
      return res.status(500).json({
        error: err.message || 'Failed to analyze color reference look.',
      });
    }
  });

  // Endpoint 2: Expert Color Science Consultation & Shader/Code Synthesis
  app.post('/api/consult-scientist', async (req, res) => {
    try {
      const { message, activeParameters, history } = req.body;

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error: 'GEMINI_API_KEY is not configured in the server environment.',
        });
      }

      const systemInstruction = `You are a Senior Color Scientist, Cinematographer, and Film Emulation Systems Architect with deep expertise in:
- Sensitometry (Hurter-Driffield H&D curves, density vs log exposure, D-Max, D-Min, Gamma, Toe, Shoulder).
- Color Spaces & Transforms (sRGB, Rec.709, Cineon Log, ACEScc/ACEScct, ARRI LogC3/LogC4, REDWideGamutRGB, DCI-P3).
- 3D LUT engineering (standard Adobe / DaVinci .cube format, tetrahedral vs trilinear interpolation, HaldCLUT matrices Level 8 / Level 12).
- Production-grade code synthesis in:
  1. Python (OpenCV, Pillow, NumPy for LUT generation and pixel manipulation).
  2. GLSL (OpenGL / WebGL fragment shaders for real-time mobile/web rendering).
  3. Apple Metal Shading Language (MSL for iOS/macOS 3D texture lookup).
  4. Apple CoreImage (CIColorKernel / CIKernel).
- Film stocks characteristics: Kodak Portra (160/400/800), Kodak Vision3 (50D, 250D, 500T 5219), Fujifilm Superia, Fuji Velvia 50, Kodachrome 64, Tri-X 400, Ilford HP5.
- Optical physics: Anti-halation layer light scatter, dye couplers non-ideal absorption overlaps, chemical adjacency effects.

Tone: Developer-centric, rigorous, mathematically sound, providing exact formulas and production-ready copy-pasteable code blocks.
Whenever code is requested, provide full, runnable, un-truncated scripts with comments explaining the color science principles.`;

      let contextPrompt = message;
      if (activeParameters) {
        contextPrompt += `\n\n[Active Film Emulation Studio Parameters]:\n${JSON.stringify(activeParameters, null, 2)}`;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: contextPrompt,
        config: {
          systemInstruction,
        },
      });

      return res.json({
        response: response.text || 'No response generated.',
      });
    } catch (err: any) {
      console.error('Error in /api/consult-scientist:', err);
      return res.status(500).json({
        error: err.message || 'Failed to complete color science consultation.',
      });
    }
  });

  // Catch-all for any unhandled /api/* routes so they NEVER return HTML
  app.all('/api/*', (req, res) => {
    res.status(404).json({
      error: `API endpoint not found: ${req.method} ${req.originalUrl}`,
    });
  });

  // Express error handler to ensure all errors return JSON instead of HTML
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Server error encountered:', err);
    if (res.headersSent) {
      return next(err);
    }
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error occurred.',
    });
  });

  // Setup Vite dev server or static files
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`ChromaFilm Color Science Server running on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

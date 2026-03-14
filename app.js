const express = require('express');
const multer = require('multer');
const fs = require('fs');
const { GoogleGenAI } = require("@google/genai");
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Initialize the Gemini client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const upload = multer({ dest: 'uploads/' });

app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use(express.json());

app.post('/analyze', upload.single('artifact'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No image provided.' });

        const base64Image = fs.readFileSync(req.file.path).toString("base64");

        // Calling Gemini 2.5 Flash
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: "Identify this museum artifact. Respond ONLY in this format: Title: [Name] | Info: [Short Description]" },
                        { inlineData: { data: base64Image, mimeType: req.file.mimetype } }
                    ]
                }
            ]
        });

        const text = response.text || "";
        let title = "Artifact Identified", info = text;

        // Smart parsing to avoid the "Unknown" error
        if (text.includes('|')) {
            const parts = text.split('|');
            title = parts[0].replace(/Title:/i, '').trim();
            info = parts[1].replace(/Info:/i, '').trim();
        } else if (text.length > 5) {
            title = "Historical Artifact"; // Generic title if format is weird but description exists
        }

        res.json({ title, info, imageUrl: `/uploads/${req.file.filename}` });

    } catch (error) {
        console.error("AI Error:", error);
        res.status(500).json({ title: "Scanner Error", info: "The AI is currently unavailable." });
    }
});

app.listen(port, () => console.log(`🚀 Server active on port ${port}`));
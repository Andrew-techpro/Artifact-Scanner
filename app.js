const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { GoogleGenAI } = require("@google/genai");
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Initialize the new Gemini 3 SDK
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Set up image storage
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, 'artifact-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use(express.json());

// AI Analysis Route
app.post('/analyze', upload.single('artifact'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No image uploaded.' });

        const base64Image = fs.readFileSync(req.file.path).toString("base64");

        // Using the latest Gemini 3 Flash model for speed
        const response = await ai.interactions.create({
            model: 'gemini-3-flash',
            input: [
                { type: 'text', text: 'Identify this artifact. Provide a name and history. Format: Title: [Name] | Info: [Description]' },
                { type: 'image', data: base64Image, mime_type: req.file.mimetype },
            ],
        });

        const text = response.output_text || "";
        let title = "Unknown Artifact", info = text;

        if (text.includes('|')) {
            const parts = text.split('|');
            title = parts[0].replace(/Title:/i, '').trim();
            info = parts[1].replace(/Info:/i, '').trim();
        }

        res.json({ title, info, imageUrl: `/uploads/${req.file.filename}` });

    } catch (error) {
        console.error("AI Error:", error);
        res.status(500).json({ error: "AI Analysis failed." });
    }
});

app.listen(port, () => console.log(`🚀 Server live at port ${port}`));
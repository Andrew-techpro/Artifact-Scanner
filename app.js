const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require("@google/genai");
require('dotenv').config();

const app = express();
const port = process.env.PORT || 10000;

// Uses your Render Environment Variable
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

app.post('/analyze', upload.single('artifact'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No image provided.' });

        const base64Image = fs.readFileSync(req.file.path).toString("base64");

        // Fixed for Gemini 2.5 Flash SDK 1.44.0
        const interaction = await ai.interactions.create({
            model: 'gemini-2.5-flash',
            input: [
                { 
                    type: 'text', 
                    text: "Act as a professional museum curator. Identify this artifact. Provide a bold Title. Then, write a detailed 4-sentence historical description. Format: Title: [Name] | Info: [Detailed History]" 
                },
                { 
                    type: 'image', 
                    data: base64Image, 
                    mime_type: req.file.mimetype 
                }
            ]
        });

        // Clean up temp file
        fs.unlinkSync(req.file.path);

        const text = interaction.text || "";
        let title = "Ancient Discovery", info = text;

        if (text.includes('|')) {
            const parts = text.split('|');
            title = parts[0].replace(/Title:/i, '').trim();
            info = parts[1].replace(/Info:/i, '').trim();
        }

        res.json({ title, info, imageUrl: `/uploads/${req.file.filename}` });

    } catch (error) {
        console.error("AI Error:", error);
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(500).json({ title: "Scanner Offline", info: "The curator is currently unavailable." });
    }
});

app.listen(port, () => console.log(`🚀 Server on port ${port}`));
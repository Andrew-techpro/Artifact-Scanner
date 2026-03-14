const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { GoogleGenAI } = require("@google/genai");
require('dotenv').config();

const app = express();
// Uses Render's port or 3000 locally
const port = process.env.PORT || 3000;

// Initialize Gemini with the API Key from Environment Variables
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Configure where uploaded images are stored
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, 'artifact-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Middleware
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use(express.json());

// Main AI Analysis Route
app.post('/analyze', upload.single('artifact'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Please upload an image.' });
        }

        const base64Image = fs.readFileSync(req.file.path).toString("base64");

        // Calling Gemini 2.5 Flash for high-quality identification
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: "Act as a professional museum curator. Identify this artifact. Provide a bold, catchy Title. Then, write a detailed, 3-4 sentence historical description including its likely origin, time period, and cultural significance. Format your response exactly like this: Title: [Name] | Info: [Detailed History]" },
                        { inlineData: { data: base64Image, mimeType: req.file.mimetype } }
                    ]
                }
            ]
        });

        const text = response.text || "";
        
        // Default values in case the AI format is slightly off
        let title = "Ancient Discovery";
        let info = text;

        // Splitting the AI response into Title and Info using the Pipe (|)
        if (text.includes('|')) {
            const parts = text.split('|');
            title = parts[0].replace(/Title:/i, '').trim();
            info = parts[1].replace(/Info:/i, '').trim();
        }

        res.json({
            title,
            info,
            imageUrl: `/uploads/${req.file.filename}`
        });

    } catch (error) {
        console.error("AI Analysis Error:", error);
        res.status(500).json({ 
            title: "Scanner Offline", 
            info: "The curator is currently unavailable. Please check your API key and try again." 
        });
    }
});

app.listen(port, () => {
    console.log(`🚀 Artifact Scanner live at http://localhost:${port}`);
});
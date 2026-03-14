const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require("@google/genai");
require('dotenv').config();

const app = express();
const port = process.env.PORT || 10000;

// Initialize the Gemini client using your Render Environment Variable
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const upload = multer({ dest: 'uploads/' });

app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use(express.json());

app.post('/analyze', upload.single('artifact'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No image provided.' });

        const base64Image = fs.readFileSync(req.file.path).toString("base64");

        // Using Gemini 2.5 Flash for high-quality identification
        const interaction = await ai.interactions.create({
            model: 'gemini-2.5-flash',
            input: [
                { 
                    type: 'text', 
                    text: "Act as a professional museum curator. Identify this artifact. Provide a bold, catchy Title. Then, write a detailed, 4-sentence historical description including its likely origin, time period, and cultural significance. Format your response exactly like this: Title: [Name] | Info: [Detailed History]" 
                },
                { 
                    type: 'image', 
                    data: base64Image, 
                    mime_type: req.file.mimetype 
                }
            ]
        });

        // The response text is now in interaction.text
        const text = interaction.text || "";
        
        // Clean up the temp file from the server
        fs.unlinkSync(req.file.path);

        let title = "Ancient Discovery";
        let info = text;

        // Parsing the "Title | Info" format
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
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(500).json({ 
            title: "Scanner Offline", 
            info: "The curator is currently unavailable. Check your API key and try again." 
        });
    }
});

app.listen(port, () => console.log(`🚀 Artifact Scanner live on port ${port}`));
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path'); // Added for safer path handling
const { GoogleGenAI } = require("@google/genai");
require('dotenv').config();

const app = express();
const port = process.env.PORT || 10000; // Render usually uses 10000

// Initialize the Gemini client - it automatically looks for GEMINI_API_KEY env var
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const upload = multer({ dest: 'uploads/' });

app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use(express.json());

app.post('/analyze', upload.single('artifact'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No image provided.' });

        const base64Image = fs.readFileSync(req.file.path).toString("base64");

        // Calling Gemini 2.5 Flash - The unified SDK way
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: "Identify this museum artifact. Respond ONLY in this format: Title: [Name] | Info: [Short Description]" },
                        { 
                            inlineData: { 
                                data: base64Image, 
                                mimeType: req.file.mimetype 
                            } 
                        }
                    ]
                }
            ]
        });

        // The new SDK returns text directly on the response object
        const text = response.text || "";
        
        // Clean up the temp file immediately
        fs.unlinkSync(req.file.path);

        let title = "Historical Artifact";
        let info = text;

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
        console.error("AI Error:", error);
        // Clean up file even if AI fails
        if (req.file) fs.unlinkSync(req.file.path);
        
        res.status(500).json({ 
            title: "Scanner Offline", 
            info: "The curator is currently unavailable. Please check your Render logs." 
        });
    }
});

app.listen(port, () => console.log(`🚀 Artifact Scanner live on port ${port}`));
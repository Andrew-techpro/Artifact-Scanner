const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { GoogleGenAI } = require("@google/genai");
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

const app = express();
const port = process.env.PORT || 10000;

// 1. Cloudinary Config (Uses Environment Variables)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// 2. Gemini Config (Uses Environment Variable)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const upload = multer({ dest: 'uploads/' });

app.use(express.static('public'));
app.use(express.json());

app.post('/analyze', upload.single('artifact'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file.' });

        // A. Upload to Cloudinary for permanent storage
        const cloudRes = await cloudinary.uploader.upload(req.file.path, {
            folder: 'artifacts'
        });

        // B. Call Gemini for detailed analysis
        const modelName = "gemini-1.5-flash"; // Stable version for production
        const imageData = fs.readFileSync(req.file.path).toString("base64");

        const response = await ai.models.generateContent({
            model: modelName,
            contents: [{
                role: 'user',
                parts: [
                    { text: "Act as an expert museum curator. Identify this artifact. Format exactly as: Title: [Name] | Info: [4-sentence historical context]" },
                    { inlineData: { data: imageData, mimeType: req.file.mimetype } }
                ]
            }]
        });

        // Clean up the local temp file
        fs.unlinkSync(req.file.path);

        const text = response.text();
        let title = "Unidentified Artifact", info = text;

        if (text.includes('|')) {
            const parts = text.split('|');
            title = parts[0].replace(/Title:/i, '').trim();
            info = parts[1].replace(/Info:/i, '').trim();
        }

        res.json({ 
            title, 
            info, 
            imageUrl: cloudRes.secure_url // Permanent Cloudinary link
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Scanner Offline" });
    }
});

app.listen(port, () => console.log(`🚀 Live on port ${port}`));
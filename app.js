const express = require('express');
const multer = require('multer');
const fs = require('fs');
const { GoogleGenAI } = require("@google/genai");
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

const app = express();
const port = process.env.PORT || 10000;

// This "grabs" the variables you already put in Render
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const upload = multer({ dest: 'uploads/' });

app.use(express.static('public'));
app.use(express.json());

app.post('/analyze', upload.single('artifact'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file.' });

        // Upload to Cloudinary so images don't disappear
        const cloudRes = await cloudinary.uploader.upload(req.file.path, { folder: 'artifacts' });

        const imageData = fs.readFileSync(req.file.path).toString("base64");
        const result = await ai.models.generateContent({
            model: "gemini-1.5-flash",
            contents: [{
                role: 'user',
                parts: [
                    { text: "Identify this artifact. Format: Title: [Name] | Info: [4-sentence history]" },
                    { inlineData: { data: imageData, mimeType: req.file.mimetype } }
                ]
            }]
        });

        fs.unlinkSync(req.file.path);
        const text = result.response.text();
        
        let title = "Artifact", info = text;
        if (text.includes('|')) {
            const parts = text.split('|');
            title = parts[0].replace(/Title:/i, '').trim();
            info = parts[1].replace(/Info:/i, '').trim();
        }

        res.json({ title, info, imageUrl: cloudRes.secure_url });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Analysis failed" });
    }
});

app.listen(port, () => console.log(`🚀 Live on ${port}`));
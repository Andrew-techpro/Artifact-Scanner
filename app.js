const express = require('express');
const multer = require('multer');
const fs = require('fs');
const { GoogleGenAI } = require("@google/genai");
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Cloudinary connection
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
        if (!req.file) return res.status(400).json({ error: 'No image provided.' });

        // Upload to Cloudinary for permanent storage
        const cloudResult = await cloudinary.uploader.upload(req.file.path, {
            folder: 'artifacts'
        });

        const base64Image = fs.readFileSync(req.file.path).toString("base64");

        // Use gemini-1.5-flash for the most stable connection
        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: [{
                role: 'user',
                parts: [
                    { text: "Identify this museum artifact. Provide a bold title and a detailed 3-4 sentence historical description. Format: Title: [Name] | Info: [Detailed History]" },
                    { inlineData: { data: base64Image, mimeType: req.file.mimetype } }
                ]
            }]
        });

        fs.unlinkSync(req.file.path);

        const text = response.text || "";
        let title = "Historical Artifact", info = text;

        if (text.includes('|')) {
            const parts = text.split('|');
            title = parts[0].replace(/Title:/i, '').trim();
            info = parts[1].replace(/Info:/i, '').trim();
        }

        res.json({ title, info, imageUrl: cloudResult.secure_url });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ title: "Scanner Offline", info: "Check Render Environment settings." });
    }
});

app.listen(port, () => console.log(`🚀 Artifact Expert active on port ${port}`));
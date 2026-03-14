const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { GoogleGenAI } = require("@google/genai");
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

const app = express();
const port = process.env.PORT || 10000;

// Cloudinary Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// FIX: Pulls the key from Render's Environment Variables (GEMINI_API_KEY)
const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);

const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, 'art-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

app.use(express.static('public'));
app.use(express.json());

app.post('/analyze', upload.single('artifact'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file.' });

        // 1. Permanent storage in Cloudinary
        const cloudResult = await cloudinary.uploader.upload(req.file.path);

        // 2. AI Analysis using stable gemini-1.5-flash
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const imageData = fs.readFileSync(req.file.path).toString("base64");

        const result = await model.generateContent([
            "Act as an expert museum curator. Identify this artifact. Format exactly as: Title: [Name] | Info: [4-5 sentence historical context]",
            { inlineData: { data: imageData, mimeType: req.file.mimetype } }
        ]);

        const text = result.response.text();
        
        // Clean up the local temp file
        fs.unlinkSync(req.file.path);

        // Parse the AI response
        let title = "Unidentified Artifact", info = text;
        if (text.includes('|')) {
            const parts = text.split('|');
            title = parts[0].replace(/Title:/i, '').trim();
            info = parts[1].replace(/Info:/i, '').trim();
        }

        // Send back the Cloudinary URL and the parsed text
        res.json({ title, info, imageUrl: cloudResult.secure_url });

    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
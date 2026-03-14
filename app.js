const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { GoogleGenAI } = require("@google/genai");
require('dotenv').config();

const app = express();

// Use the port provided by the hosting service, or 3000 locally
const port = process.env.PORT || 3000;

// Use the API Key from environment variables for security
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenAI(apiKey);

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

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const imageData = fs.readFileSync(req.file.path).toString("base64");

        const prompt = "Act as an expert museum curator. Identify this artifact. Provide a name and a detailed history. Format the response strictly as: Title: [Name] | Info: [Description]";

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: imageData,
                    mimeType: req.file.mimetype
                }
            }
        ]);

        const response = await result.response;
        const text = response.text();

        // Splitting the AI response into Title and Info
        let title = "Unknown Artifact";
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
        console.error("AI Analysis Error:", error);
        res.status(500).json({ error: "Failed to analyze the artifact." });
    }
});

app.listen(port, () => {
    console.log(`🚀 Server is running at http://localhost:${port}`);
});
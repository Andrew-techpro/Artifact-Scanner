const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const app = express();
const port = process.env.PORT || 10000;

// Correct SDK initialization to prevent "is not a function" error
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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
        if (!req.file) return res.status(400).json({ error: 'Please upload an image.' });

        // Using the 2.5 Flash model as you requested
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const base64Image = fs.readFileSync(req.file.path).toString("base64");

        const result = await model.generateContent([
            "Act as a professional museum curator. Identify this artifact. Format: Title: [Name] | Info: [Detailed History]",
            { inlineData: { data: base64Image, mimeType: req.file.mimetype } }
        ]);

        const response = await result.response;
        const text = response.text();
        
        // Clean up local file after processing
        fs.unlinkSync(req.file.path);

        let title = "Ancient Discovery";
        let info = text;

        if (text.includes('|')) {
            const parts = text.split('|');
            title = parts[0].replace(/Title:/i, '').trim();
            info = parts[1].replace(/Info:/i, '').trim();
        }

        res.json({ title, info, imageUrl: `/uploads/${req.file.filename}` });

    } catch (error) {
        console.error("AI Analysis Error:", error);
        res.status(500).json({ 
            title: "Scanner Offline", 
            info: "The curator is currently unavailable. Check your API key." 
        });
    }
});

app.listen(port, () => console.log(`🚀 Artifact Scanner live on port ${port}`));
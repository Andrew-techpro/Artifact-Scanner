const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { GoogleGenAI } = require("@google/genai");

const app = express();
const port = process.env.PORT || 3000;

// Use process.env for security on Render
const apiKey = process.env.GEMINI_API_KEY || "AIzaSyBWFGa0KLEJ2KqoVIcktx199B2dlUydkv0";
const ai = new GoogleGenAI(apiKey);

const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, 'art-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use(express.json());

app.post('/analyze', upload.single('artifact'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file.' });
        
        // Using stable model name
        const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
        const imageData = fs.readFileSync(req.file.path).toString("base64");

        const result = await model.generateContent([
            "Act as an expert museum curator and historian. Identify this artifact's specific academic or museum title. Format exactly as: Title: [Academic Name] | Info: [4-5 sentence historical context]",
            { inlineData: { data: imageData, mimeType: req.file.mimetype } }
        ]);

        const text = result.response.text();
        let title = "Unidentified Artifact", info = text;
        
        if (text.includes('|')) {
            const parts = text.split('|');
            title = parts[0].replace(/Title:/i, '').trim();
            info = parts[1].replace(/Info:/i, '').trim();
        }
        
        res.json({ title, info, imageUrl: `/uploads/${req.file.filename}` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => console.log(`🚀 http://localhost:${port}`));
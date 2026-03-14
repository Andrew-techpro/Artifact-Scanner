const express = require('express');
const multer = require('multer');
const fs = require('fs');
const { GoogleGenAI } = require("@google/genai");
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Cloudinary Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);
const upload = multer({ dest: 'uploads/' });

app.use(express.static('public'));
app.use(express.json());

app.post('/analyze', upload.single('artifact'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No image uploaded.' });

        // 1. Permanent storage in Cloudinary
        const cloudResult = await cloudinary.uploader.upload(req.file.path);

        // 2. AI Analysis for Detailed Description
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const imageData = {
            inlineData: {
                data: Buffer.from(fs.readFileSync(req.file.path)).toString("base64"),
                mimeType: req.file.mimetype
            }
        };

        const prompt = "Identify this artifact. Provide a bold Title and a detailed 3-sentence history. Format: Title: [Name] | Info: [Description]";
        const result = await model.generateContent([prompt, imageData]);
        const text = result.response.text();

        fs.unlinkSync(req.file.path); // Clean up temp file

        const [titlePart, infoPart] = text.split('|').map(s => s.trim());
        
        res.json({ 
            title: titlePart.replace(/Title:/i, ''), 
            info: infoPart.replace(/Info:/i, ''), 
            imageUrl: cloudResult.secure_url 
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ title: "Error", info: "Check your API keys in Render." });
    }
});

app.listen(port, () => console.log(`Server live on port ${port}`));
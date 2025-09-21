const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json()); // Middleware to parse JSON bodies

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({ storage: storage });

const PYTHON_API_URL = 'http://localhost:8000/api';

// === API ENDPOINTS ===

// Endpoint to serve the documents for the viewer
app.get('/api/documents/:filename', (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(__dirname, 'uploads', filename);
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send('Document not found');
    }
});

// 1. UPDATED UPLOAD AND PROCESS ENDPOINT
app.post('/api/upload', upload.single('document'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  console.log(`File '${req.file.filename}' saved. Forwarding to Python for processing...`);

  const form = new FormData();
  form.append('file', fs.createReadStream(req.file.path), {
    filename: req.file.originalname,
    contentType: req.file.mimetype,
  });

  try {
    // Call the Python AI engine's /process-document endpoint
    const processResponse = await axios.post(`${PYTHON_API_URL}/process-document`, form, {
      headers: {
        ...form.getHeaders()
      }
    });

    console.log('Python processing successful. Document ID:', processResponse.data.document_id);

    // Send a complete response to the frontend
    res.json({
      message: 'File processed successfully!',
      filePath: `/api/documents/${req.file.filename}`,
      documentId: processResponse.data.document_id,
      summary: processResponse.data.summary,
      sections: processResponse.data.sections
    });

  } catch (error) {
    console.error("Error calling Python AI for processing:", error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Failed to process document with AI engine.' });
  }
});

// 2. UPDATED CHAT ENDPOINT
app.post('/api/chat', async (req, res) => {
    const { question, documentId } = req.body;

    if (!question || !documentId) {
        return res.status(400).json({ error: 'Question and documentId are required.' });
    }

    console.log(`Forwarding question to Python AI for doc ID ${documentId}`);

    try {
        // Call the Python AI engine's /ask endpoint
        const pythonResponse = await axios.post(`${PYTHON_API_URL}/ask`, {
            question: question,
            document_id: documentId
        });

        res.json(pythonResponse.data);

    } catch (error) {
        console.error("Error calling Python AI for chat:", error.response ? error.response.data : error.message);
        const errorDetail = error.response ? error.response.data.detail : "AI service is unavailable.";
        res.status(500).json({ error: "Failed to get response from AI engine.", detail: errorDetail });
    }
});

app.listen(port, () => {
  console.log(`Node.js backend is running on http://localhost:${port}`);
});
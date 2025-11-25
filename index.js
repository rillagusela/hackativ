// Import library yang diperlukan
import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';

// Inisialisasi Express dan Multer
const app = express();
const upload = multer();

// Inisialisasi Google GenAI dengan API Key dari environment variables
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Atur model Gemini yang akan digunakan
const GEMINI_MODEL = "gemini-1.5-flash";

// Middleware untuk parsing JSON body
app.use(express.json());

// === FUNGSI-FUNGSI HANDLER ===

/**
 * Handler umum untuk memproses permintaan generate content dari teks atau file.
 * @param {string} prompt - Teks prompt dari user.
 * @param {object} [file] - File yang di-upload (opsional) dari multer.
 * @returns {Promise<string>} - Hasil teks yang digenerate oleh model.
 */
const generateContentHandler = async (prompt, file) => {
  const model = ai.getGenerativeModel({ model: GEMINI_MODEL });

  const contentParts = [prompt];

  if (file) {
    contentParts.push({
      inlineData: {
        data: file.buffer.toString("base64"),
        mimeType: file.mimetype,
      },
    });
  }

  const result = await model.generateContent(contentParts);
  const response = await result.response;
  return response.text();
};

/**
 * Middleware untuk menangani upload file dan memanggil generator.
 * @param {string} defaultPrompt - Prompt default jika tidak disediakan oleh user.
 */
const fileUploadHandler = (defaultPrompt) => async (req, res) => {
  const { prompt } = req.body;

  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }

  try {
    const resultText = await generateContentHandler(prompt || defaultPrompt, req.file);
    res.status(200).json({ result: resultText });
  } catch (error) {
    console.error('Error generating content from file:', error);
    res.status(500).json({ message: error.message });
  }
};

// === ROUTES ===

// Endpoint untuk generate content dari teks
app.post('/generate-text', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ message: 'Prompt is required.' });
  }

  try {
    const resultText = await generateContentHandler(prompt);
    res.status(200).json({ result: resultText });
  } catch (error) {
    console.error('Error generating text:', error);
    res.status(500).json({ message: error.message });
  }
});

// Endpoint untuk generate content dari gambar
app.post('/generate-from-image', upload.single('image'), fileUploadHandler("What is in this picture?"));

// Endpoint untuk generate content dari dokumen
app.post('/generate-from-document', upload.single('document'), fileUploadHandler("Please summarize the following document in English:"));

// Endpoint untuk generate content dari audio
app.post('/generate-from-audio', upload.single('audio'), fileUploadHandler("Please provide a transcript for the following recording."));

// Menjalankan server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server ready on http://localhost:${PORT}`));

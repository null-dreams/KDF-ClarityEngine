# Clarity Engine: AI-Powered Document Analysis and Q&A

Clarity Engine is a full-stack web application designed to demystify complex documents. Users can upload a PDF, and a sophisticated AI pipeline will automatically process it to provide a high-level summary, an interactive section-by-section breakdown with executive summaries, and a conversational chat interface to ask specific questions about the content.

This project serves as a powerful demonstration of a modern, multi-service architecture for building advanced AI applications.

---

## Features

*   **Secure File Upload:** Upload PDF documents to a secure Node.js backend.
*   **Advanced AI Processing Pipeline:**
    *   **Text Extraction:** Uses Google Cloud's **Document AI** for highly accurate text extraction.
    *   **AI-Powered Summarization:** Generates a concise, high-level summary of the entire document using **Gemini 1.5 Pro**.
    *   **Dynamic Sectioning & Summarization:** Intelligently identifies the main sections of the document and generates a unique executive summary for each part.
    *   **Vectorization for Q&A:** Chunks the document semantically and stores embeddings in a **FAISS** vector store for fast, relevant context retrieval.
*   **Interactive Document Viewer:**
    *   View the uploaded PDF directly in the browser via an `<iframe>`.
    *   An integrated **AI Chat Assistant** allows users to ask questions in natural language and receive context-aware answers.
*   **Rich UI & UX:**
    *   A clean, responsive, dark-mode interface built with **React** and **Tailwind CSS**.
    *   **Auto-Generated Document Thumbnails** created dynamically on the frontend.
    *   Interactive accordion for navigating document section summaries.
    *   **Markdown Support** for beautifully formatted AI responses in the chat.
*   **Persistent State:** The list of uploaded and processed documents is saved in the browser's `localStorage`, persisting between sessions.

## Technology Stack

| Service | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | **React (Vite)**, **Tailwind CSS** | The user interface for uploading, viewing, and interacting with documents. |
| **Web Backend** | **Node.js**, **Express**, Multer | Handles file uploads, user requests, and acts as a secure proxy to the AI engine. |
| **AI Engine** | **Python**, **FastAPI**, **Gemini 2.5 Pro** | All heavy AI tasks: text extraction, summarization, and Q&A logic. |

---

## Project Structure

```
KDF/
├── 📁 backend/
│   ├── uploads/
│   ├── node_modules/
│   ├── server.js
│   └── package.json
│
├── 📁 clarityEngine/
│   ├── 📁 app/
│   │   ├── 📁 api/
│   │   ├── 📁 core/
│   │   └── 📁 tests/
│   ├── 📄 cache.py
│   ├── 📄 config.py
│   ├── 📄 main.py
│   ├── 📄 .env
│   └── 📄 requirements.txt
│
└── 📁 frontend/
    ├── 📁 src/
    ├── 📁 public/
    ├── 📁 node_modules/
    ├── 📄 package.json
    └── 📄 vite.config.js
```

---

## Setup and Installation Guide

Follow these steps carefully to get the entire application running locally.

### Prerequisites

1.  **Node.js and npm:** [Download & Install Node.js](https://nodejs.org/) (v18 or higher recommended).
2.  **Python:** [Download & Install Python](https://www.python.org/downloads/) (v3.9 or higher recommended).
3.  **Google Cloud Account & Project:**
    *   You must have a Google Cloud account with billing enabled.
    *   Create a new project in the Google Cloud Console.
    *   Enable the **Document AI API** and the **Gemini API keys** (which grants access to Gemini models) for your project.
4.  **Authentication:**
    *   Create a service account in your Google Cloud project.
    *   Grant it the "Document AI Administrator" role.
    *   Download the JSON key file for this service account.

### Step 1: Environment Variables

You need to configure API keys for the AI engine to work.

1.  **Google Cloud Credentials:**
    *   Set an environment variable on your system that points to the location of your downloaded Google Cloud JSON key file. This is required for Document AI.
    *   **Linux/macOS:** In your `.bashrc` or `.zshrc`, add: `export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/gcp-key.json"`
    *   **Windows (PowerShell):** `[System.Environment]::SetEnvironmentVariable('GOOGLE_APPLICATION_CREDENTIALS', 'C:\path\to\your\gcp-key.json', 'User')`
    *   **Important:** You must **restart your terminal/VS Code** after setting this variable for it to take effect.

2.  **Gemini API Key:**
    *   In the `clarityEngine/` directory, create a file named `.env`.
    *   Add your Gemini API key to this file. You can generate one from [Google AI Studio](https://aistudio.google.com/app/apikey).
    ```
    # clarityEngine/.env
    GEMINI_API_KEY="your_gemini_api_key_here"
    ```

### Step 2: Install Dependencies

You will need to run install commands in all three project folders.

#### A. AI Engine (Python)

```bash
# Navigate to the Python server directory
cd clarityEngine

# Create and activate a virtual environment (highly recommended)
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate

# Install all required Python packages
pip install -r requirements.txt
```

#### B. Backend (Node.js)

```bash
# From the root, navigate to the Node.js server directory
cd backend

# Install Node.js dependencies
npm install
```

#### C. Frontend (React)

```bash
# From the root, navigate to the React app directory
cd frontend

# Install Node.js dependencies
npm install
```

---

## Running the Application

You must have **three separate terminals** open to run all services simultaneously.

### ➡️ Terminal 1: Start the Python AI Engine

```bash
# Navigate to the clarityEngine/ directory
cd clarityEngine

# Activate the virtual environment if you're in a new terminal
source venv/bin/activate

# Start the FastAPI server
uvicorn main:app --reload --port 8000
```
✅ You should see a message indicating the server is running on `http://127.0.0.1:8000`.

### ➡️ Terminal 2: Start the Node.js Backend

```bash
# Navigate to the backend/ directory
cd backend

# Start the server
node server.js
```
✅ You should see the message: `Node.js backend is running on http://localhost:5000`.

### ➡️ Terminal 3: Start the React Frontend

```bash
# Navigate to the frontend/ directory
cd frontend

# Start the Vite development server
npm run dev
```
✅ Vite will provide a local URL, typically `http://localhost:5173`.

### Accessing the App

🎉 Open **`http://localhost:5173`** in your web browser to use the application.

---

## How to Use

1.  Click the "New Document" card to open the upload modal.
2.  Select a PDF file from your computer and click "Upload & Process".
3.  Wait for the AI pipeline to complete (you'll see a loading state). The new document will appear in the list.
4.  Click the **eye icon** on the document card to see the high-level summary and the interactive section breakdown.
5.  Click the **document card image** to navigate to the full viewer page.
6.  In the viewer, use the chat panel on the right to ask specific questions about the document's content.

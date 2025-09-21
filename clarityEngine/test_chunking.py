# test_chunking.py
import os
import requests
import io
from pypdf import PdfReader, PdfWriter
from dotenv import load_dotenv

# We are importing the actual functions from our main application.
from app.core.document_processor import process_document_with_docai
from app.core.clarity_engine import get_semantic_chunks_from_gemini

# --- CONFIGURATION ---
# We can now use the original large document without fear of errors.
PDF_URL = "https://www.legalaidofnebraska.org/wp-content/uploads/2021/09/2021-LLT-Handbook-1.pdf"

# The synchronous limit for the Document AI API. We'll use 25 as a safe margin.
DOCAI_PAGE_LIMIT = 12

# For quicker tests, you can still limit the amount of text sent to Gemini.
MAX_TEXT_LENGTH = 20000
# --- END CONFIGURATION ---


def get_text_from_pdf(url: str) -> str | None:
    """
    Downloads a PDF, slices it to fit API limits if necessary,
    and extracts its text using our Document AI processor.
    """
    print(f"1. Downloading PDF from: {url}")
    try:
        response = requests.get(url, stream=True)
        response.raise_for_status()
        original_pdf_bytes = response.content
        print("   ✅ PDF downloaded successfully.")

        # --- NEW PDF SLICING LOGIC ---
        pdf_stream = io.BytesIO(original_pdf_bytes)
        reader = PdfReader(pdf_stream)
        num_pages = len(reader.pages)
        print(f"   - Original PDF has {num_pages} pages.")

        file_content_for_docai = original_pdf_bytes
        if num_pages > DOCAI_PAGE_LIMIT:
            print(f"   ✂️  PDF exceeds limit. Slicing to the first {DOCAI_PAGE_LIMIT} pages for the test.")
            writer = PdfWriter()
            for i in range(DOCAI_PAGE_LIMIT):
                writer.add_page(reader.pages[i])

            # Save the sliced PDF to a new in-memory byte stream
            sliced_pdf_stream = io.BytesIO()
            writer.write(sliced_pdf_stream)
            sliced_pdf_stream.seek(0) # IMPORTANT: Rewind the stream to the beginning
            file_content_for_docai = sliced_pdf_stream.getvalue()
        # --- END OF NEW LOGIC ---

        print("2. Extracting text with Document AI...")
        extracted_text = process_document_with_docai(
            file_content=file_content_for_docai,
            mime_type="application/pdf"
        )
        print("   ✅ Text extracted successfully.")
        return extracted_text

    except requests.exceptions.RequestException as e:
        print(f"❌ ERROR: Failed to download the PDF. Details: {e}")
        return None
    except Exception as e:
        print(f"❌ ERROR: An error occurred during Document AI or PDF slicing. Details: {e}")
        return None


def run_chunking_test():
    """
    Runs an end-to-end test of the document processing and semantic chunking pipeline.
    """
    print("--- Starting Document Chunking Test ---")
    
    load_dotenv()

    # --- STAGE 1: Get Text ---
    extracted_text = get_text_from_pdf(PDF_URL)
    if not extracted_text:
        print("\n--- Test Failed: Could not get text from PDF. Aborting. ---")
        return

    print(f"   (Extracted {len(extracted_text)} characters from the first {DOCAI_PAGE_LIMIT} pages)")

    text_for_chunking = extracted_text
    if MAX_TEXT_LENGTH != -1 and len(extracted_text) > MAX_TEXT_LENGTH:
        print(f"   ✂️  Slicing extracted text to {MAX_TEXT_LENGTH} characters for the Gemini call.")
        text_for_chunking = extracted_text[:MAX_TEXT_LENGTH]

    # --- STAGE 2: Get Chunks ---
    print("\n3. Sending extracted text to Gemini for semantic chunking...")
    chunks = get_semantic_chunks_from_gemini(text_for_chunking)

    # --- STAGE 3: Display and Analyze Results ---
    # (This section remains unchanged from the previous "sanity check" version)
    print("\n" + "#"*20 + " CHUNKING SANITY CHECK " + "#"*20)
    if chunks and "Error processing document" not in chunks[0]:
        print(f"\n✅ Success! Generated {len(chunks)} semantic chunks.")
        chunk_lengths = [len(chunk) for chunk in chunks]
        avg_length = sum(chunk_lengths) / len(chunk_lengths)
        print("\n--- Quantitative Analysis ---")
        print(f"   - Average Chunk Length: {avg_length:.2f} characters")
        print(f"   - Longest Chunk: {max(chunk_lengths)} characters")
        print(f"   - Shortest Chunk: {min(chunk_lengths)} characters")
        print("\n" + "="*20 + " REVIEWING FIRST 5 CHUNKS " + "="*20)
        for i, chunk in enumerate(chunks[:5]):
            print("\n" + "-"*15 + f" Chunk {i+1} (Length: {len(chunk)}) " + "-"*15)
            print(chunk)
        print("\n" + "="*60)
        print("\n--- Evaluation Checklist ---")
        print("1. Cohesion: Does each chunk represent a single, complete thought?")
        print("2. Separation: Are the breaks between chunks at logical points?")
        print("3. Completeness: Are sentences being cut in half?")
        print("4. Size: Are the chunks a reasonable size?")
    else:
        print("\n❌ Failed to generate chunks.")
        if chunks:
            print(f"   Error message: {chunks[0]}")
    print("\n--- Sanity Check Complete ---")


if __name__ == "__main__":
    run_chunking_test()
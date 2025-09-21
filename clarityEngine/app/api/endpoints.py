from fastapi import APIRouter, UploadFile, File, HTTPException
import uuid
from app.core.document_processor import process_document_with_docai
from app.core.clarity_engine import (
    get_semantic_chunks_from_gemini, 
    get_answer_from_gemini, 
    get_summary_from_gemini,
    get_document_structure_from_gemini,
    get_summary_for_section_from_gemini
)
from app.core.vector_store import embed_and_store_chunks, query_vector_store
from app.cache import document_chunk_cache
from pydantic import BaseModel

class AskRequest(BaseModel):
    question: str
    document_id: str

router = APIRouter()

@router.get("/", tags=["API Root"])
def api_root():
    return {"message": "This is the root of the Clarity Engine API"}

@router.post("/process-document", tags=["Document Processing"])
async def process_document(file: UploadFile = File(...)):
    """
    Accepts a document, extracts text, generates a high-level summary,
    identifies and summarizes sections, and prepares the document for Q&A.
    """
    if not file.content_type == "application/pdf":
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a PDF.")

    try:
        file_content = await file.read()

        # --- STAGE 1: Text Extraction with Document AI ---
        print("Stage 1: Extracting text with Document AI...")
        extracted_text = process_document_with_docai(
            file_content=file_content,
            mime_type=file.content_type
        )
        print("Text extraction complete.")

        # --- STAGE 2: High-Level Summary Generation ---
        print("Stage 2: Generating high-level summary...")
        summary = get_summary_from_gemini(extracted_text)
        
        # --- STAGE 3: Section Identification & Summarization ---
        print("Stage 3: Identifying and summarizing document sections...")
        document_sections = get_document_structure_from_gemini(extracted_text)
        
        structured_summaries = []
        for title, text in document_sections:
            section_summary = get_summary_for_section_from_gemini(title, text)
            structured_summaries.append({
                "title": title,
                "summary": section_summary
            })
        print("Section summarization complete.")

        # --- STAGE 4: Semantic Chunking for Q&A ---
        print("Stage 4: Generating semantic chunks for Q&A...")
        semantic_chunks = get_semantic_chunks_from_gemini(extracted_text)
        print("Semantic chunking complete.")

        # --- STAGE 5: Embed and Store in Vector Search ---
        if semantic_chunks:
            document_id = str(uuid.uuid4())
            print(f"Stage 5: Embedding and storing chunks for document ID: {document_id}")
            
            # Cache the text chunks for later retrieval during Q&A
            document_chunk_cache[document_id] = semantic_chunks
            embed_and_store_chunks(chunks=semantic_chunks)
            print("Knowledge storing complete.")
        else:
            document_id = None
            print("No chunks were generated for Q&A, skipping embedding stage.")

        return {
            "message": "Document processed successfully.",
            "document_id": document_id,
            "filename": file.filename,
            "summary": summary,
            "sections": structured_summaries,
            "chunk_count": len(semantic_chunks)
        }
    
    except Exception as e:
        print(f"An error occurred in the processing pipeline: {e}")
        raise HTTPException(status_code=500, detail=f"An error occurred in the processing pipeline: {str(e)}")
    
@router.post("/ask", tags=["Q&A"])
async def ask_question(request: AskRequest):
    """
    Receives a question, retrieves context using FAISS, and generates a final answer.
    """
    print(f"Received question for document ID {request.document_id}: '{request.question}'")

    # --- STAGE 1: Retrieve chunk INDICES from the vector store ---
    relevant_chunk_indices = query_vector_store(request.question)

    if not relevant_chunk_indices:
        return {
            "question": request.question,
            "answer": "Could not find any relevant information in the document to answer this question."
        }

    # --- STAGE 2: Map INDICES back to Text using the cache ---
    retrieved_chunks_text = []
    cached_chunks = document_chunk_cache.get(request.document_id, [])

    if not cached_chunks:
         raise HTTPException(
             status_code=404,
             detail="Document ID not found or chunks are not cached. Please re-process the document."
         )

    print(f"Mapping indices to text chunks: {relevant_chunk_indices}")
    for index in relevant_chunk_indices:
        if index < len(cached_chunks):
            retrieved_chunks_text.append(cached_chunks[index])

    if not retrieved_chunks_text:
        return {
            "question": request.question,
            "answer": "Found some related sections, but could not retrieve specific text to form an answer. The document might be structured in an unusual way."
        }

    # --- STAGE 3: Generate the Final Answer ---
    print(f"Generating final answer with {len(retrieved_chunks_text)} context chunks...")
    final_answer = get_answer_from_gemini(
        context=retrieved_chunks_text,
        question=request.question
    )

    return {
        "question": request.question,
        "answer": final_answer,
        "retrieved_context": retrieved_chunks_text
    }
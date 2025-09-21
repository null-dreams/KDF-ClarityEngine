import os
import google.generativeai as genai
import json
import re
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=api_key)

LATEST_MODEL = 'gemini-2.5-pro'

def get_summary_from_gemini(full_text: str) -> str:
    """
    Generates a high-level summary of the provided text using the Gemini API.
    """
    print("Generating document summary with Gemini...")
    
    # Limit the text to avoid exceeding model token limits for very large documents
    max_chars = 100000
    truncated_text = full_text[:max_chars]

    model = genai.GenerativeModel(LATEST_MODEL)
    
    prompt = f"""
        You are an expert document analyst. 
        Summarize the following document in a **concise, high-level way**.

        Instructions:
        - Do NOT define or explain what the document type is.
        - Clearly state the **document type** at the start (e.g., "Lease Agreement", "Résumé", "Policy Document").
        - Identify the **primary purpose** of the document.
        - List the **key parties** (if applicable).
        - Highlight the **most important terms, obligations, dates, or details**.
        - Use Markdown with headings, bullet points, and **bold text** for readability.
        - Keep it professional, neutral, and free of filler phrases (e.g., avoid "Of course," "I have analyzed," etc.).
        - Do not add commentary or interpretations beyond the text.

        Here is the document text:
        ---
        {truncated_text}
        ---
        """

    
    try:
        response = model.generate_content(prompt)
        summary = response.text
        print("Summary generation successful.")
        return summary
    except Exception as e:
        print(f"An error occurred during summary generation: {e}")
        return "Could not generate a summary for this document."

def get_document_structure_from_gemini(full_text: str) -> list:
    """
    Analyzes the full text to identify and extract the main sections.
    Returns a list of tuples, where each tuple is (section_title, section_text).
    """
    print("Identifying document structure with Gemini...")
    model = genai.GenerativeModel(LATEST_MODEL)

    # Limit text to a reasonable size to ensure performance and avoid token limits
    truncated_text = full_text[:100000]

    prompt = f"""
    Analyze the following document text and identify its primary sections.
    Your task is to act as a document parser. List the titles of the main sections you find.

    RULES:
    - Return ONLY a numbered list of the section titles. Do not add any commentary before or after the list.
    - If a section seems very long (more than 1000 words), break it down into logical parts, like "Section Title (Part 1)", "Section Title (Part 2)".
    - Omit any table of contents or indexes. Focus on the main body of the document.
    - If the document is short and has no clear sections, return a single item named "Overall Summary".

    EXAMPLE OUTPUT:
    1. Introduction and Purpose
    2. Confidentiality Obligations
    3. Term and Termination (Part 1)
    4. Term and Termination (Part 2)
    5. Governing Law

    DOCUMENT TEXT:
    ---
    {truncated_text}
    ---
    """

    try:
        response = model.generate_content(prompt)
        # Use regex to find all lines that start with a number, a dot, and a space
        section_titles = re.findall(r"^\s*\d+\.\s*(.+)$", response.text, re.MULTILINE)

        if not section_titles:
            return [("Overall Summary", full_text)]

        structured_content = []
        # Create a regex pattern to split the text by any of the found titles
        split_pattern = '|'.join([re.escape(title.strip()) for title in section_titles])
        
        parts = re.split(f'({split_pattern})', full_text, flags=re.IGNORECASE)
        
        content_cursor = 0
        if len(parts) > 1:
            # The first part is everything before the first title
            content_cursor = parts.index(next((s for s in parts if s.strip() in section_titles), None)) + 1

        for title in section_titles:
            title = title.strip()
            # Find the index of the title in the split parts list
            try:
                # Find the title (case-insensitive) in the parts list starting from the cursor
                temp_parts = [p.lower().strip() for p in parts[content_cursor:]]
                title_index_in_temp = temp_parts.index(title.lower())
                title_index_in_parts = content_cursor + title_index_in_temp

                # The content is the very next item in the list
                content = parts[title_index_in_parts + 1]
                structured_content.append((title, content))
                content_cursor = title_index_in_parts + 2
            except (ValueError, IndexError):
                continue

        print(f"Successfully identified {len(structured_content)} sections.")
        return structured_content

    except Exception as e:
        print(f"An error occurred during structure identification: {e}")
        return [("Overall Summary", full_text)]


def get_summary_for_section_from_gemini(section_title: str, section_text: str) -> str:
    """
    Generates a concise summary for a specific section of the document.
    """
    print(f"Summarizing section: '{section_title}'...")
    model = genai.GenerativeModel(LATEST_MODEL)

    prompt = f"""
        You are an expert legal assistant. Provide a **concise, executive-level summary** of the following document section. 

        **Instructions:**
        - Focus only on the key points, obligations, and takeaways from this section.
        - Include a final **Conclusion** section summarizing the overall implications or action items.
        - Do not include any filler text, introductions, or phrases like "Here is the summary..."
        - Format the summary using **Markdown** (lists, bolding) for clarity.
        - Keep it strictly professional, precise, and actionable.

        **SECTION TITLE:** "{section_title}"

        **SECTION TEXT:**
        ---
        {section_text[:8000]} 
        ---
        """


    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Could not summarize section '{section_title}': {e}")
        return "Summary could not be generated for this section."

def get_semantic_chunks_from_gemini(text_content: str) -> list[str]:
    
    try:
        model = genai.GenerativeModel(
            LATEST_MODEL,
            generation_config={"response_mime_type": "application/json"}
        )

        prompt = f"""
        You are an expert AI assistant specializing in legal document processing.
        Your task is to break down the following legal document into its core semantic chunks.

        SPECIAL INSTRUCTIONS: Your primary goal is to chunk the document by its clauses, articles, and numbered or lettered sections. Each distinct legal clause (e.g., 'Termination', 'Confidentiality', 'Governing Law') must be its own separate chunk.

        Follow these general rules precisely:
        1.  Each chunk must represent a single, distinct legal concept.
        2.  Never split a single sentence across two different chunks.

        Provide the output as a single, valid JSON object with one key, "chunks", which is an array of strings.

        Document Text:
        ---
        {text_content}
        ---
        """

        response = model.generate_content(prompt)
        chunks_data = json.loads(response.text)
        return chunks_data.get("chunks", [])
    except Exception as e:
        print(f"An error occurred while calling the Gemini API: {e}")
        return [f"Error processing document: {e}"]
    
def get_answer_from_gemini(context: list[str], question: str) -> str:
    try:
        model = genai.GenerativeModel(LATEST_MODEL)
        context_string = "\n\n---\n\n".join(context)

        prompt = f"""
        You are a helpful AI advisor named "Clarity," explaining a legal document to a client.
        Your purpose is to help users understand complex legal information in simple terms.
        You will be given a context containing relevant excerpts from a document and a user's question.
        Your task is to synthesize an answer based **exclusively** on the provided context.

        Follow these rules strictly:
        1.  Analyze the provided context thoroughly.
        2.  Formulate a clear, concise, and easy-to-understand answer to the user's question.
        3.  Your answer MUST be directly supported by the information within the context.
        4.  If the context does not contain the information needed to answer the question, you MUST state: "The provided document does not contain information on this topic."
        5.  Do not use any external knowledge or make assumptions beyond what is explicitly stated in the context.
        6.  When appropriate, cite the source of your answer by quoting the most relevant sentence from the context.

        Here is the data:
        ---
        CONTEXT:
        {context_string}
        ---
        QUESTION:
        {question}
        ---
        ANSWER:
        """

        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"An error occurred during final answer generation: {e}")
        return "An error occurred while generating the answer. Please try again."
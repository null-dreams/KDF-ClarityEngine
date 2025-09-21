from google.cloud import documentai
from app.config import settings

def process_document_with_docai(
    file_content: bytes,
    mime_type: str,
) -> str:
    """
    Processes a document with Google Document AI to extract its text.

    Args:
        file_content: The raw bytes of the file.
        mime_type: The MIME type of the file (e.g., 'application/pdf')
    
    Returns:
        The extracted text content of the document as a single string.
    """
    opts = {"api_endpoint": f"{settings.google_cloud_location}-documentai.googleapis.com"}
    

    client = documentai.DocumentProcessorServiceClient(client_options=opts)

    name = client.processor_path(
        settings.google_cloud_project, settings.google_cloud_location, settings.docai_processor_id
    )
    raw_document = documentai.RawDocument(content=file_content, mime_type=mime_type)

    request = documentai.ProcessRequest(name=name, raw_document=raw_document)
    result = client.process_document(request=request)

    document = result.document
    return document.text
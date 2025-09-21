import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

# --- In-memory Database ---
faiss_index = None
embedding_model = None

def initialize_embedding_model():
    global embedding_model
    if embedding_model is None:
        print("Loading local embedding model (all-MiniLM-L6-v2)...")
        embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        print("Embedding model loaded.")

def embed_and_store_chunks(chunks: list[str]):
    global faiss_index, embedding_model

    initialize_embedding_model()
    print(f"Embedding {len(chunks)} chunks for FAISS index...")
    embeddings = embedding_model.encode(chunks, show_progress_bar=True, convert_to_numpy=True)
    
    embeddings = np.array(embeddings).astype('float32')

    print("Building FAISS index...")
    index = faiss.IndexFlatL2(embeddings.shape[1])
    index.add(embeddings)

    faiss_index = index
    print("FAISS index built successfully and is now in memory.")

def query_vector_store(query_text: str, num_neighbours: int = 25) -> list[int]:
    global faiss_index, embedding_model

    if faiss_index is None:
        print("Error: FAISS index is not available. Please process a document first.")
        return []
    
    initialize_embedding_model()
    print(f"Embedding query for FAISS search: '{query_text}'")
    query_embedding = embedding_model.encode([query_text], convert_to_numpy=True).astype('float32')

    print(f"Searching FAISS index for {num_neighbours} nearest neighbours...")
    distances, indices = faiss_index.search(query_embedding, num_neighbours)


    if indices.size > 0:
        return indices[0].tolist()
    else:
        return []

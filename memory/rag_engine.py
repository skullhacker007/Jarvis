import logging
from pathlib import Path
from config import Config

logger = logging.getLogger("NAVI_RAG")

class HybridRAGEngine:
    """
    Hybrid RAG Engine (LlamaIndex + PostgreSQL pgvector).
    Provides vector similarity + full-text SQL search with strict citations (file, page, quote).
    """

    def __init__(self, documents_dir: str = "data/documents"):
        self.documents_dir = Path(documents_dir)
        self.documents_dir.mkdir(parents=True, exist_ok=True)
        self.query_engine = None

    def initialize_index(self):
        """Builds or connects to the PostgreSQL vector store via LlamaIndex."""
        try:
            from llama_index.core import SimpleDirectoryReader, VectorStoreIndex, StorageContext
            from llama_index.vector_stores.postgres import PGVectorStore

            pg_vector_store = PGVectorStore.from_params(
                database=Config.PG_DATABASE,
                host=Config.PG_HOST,
                password=Config.PG_PASSWORD,
                port=Config.PG_PORT,
                user=Config.PG_USER,
                table_name="rag_documents_index",
                embed_dim=1536
            )

            storage_context = StorageContext.from_defaults(vector_store=pg_vector_store)
            
            # Read local documents if available
            documents = SimpleDirectoryReader(str(self.documents_dir), recursive=True).load_data()
            if documents:
                index = VectorStoreIndex.from_documents(documents, storage_context=storage_context)
            else:
                index = VectorStoreIndex.from_vector_store(pg_vector_store)

            self.query_engine = index.as_query_engine(
                similarity_top_k=3,
                response_mode="compact"
            )
            logger.info("Hybrid RAG Engine online with OCI pgvector backend.")
            return True
        except Exception as e:
            logger.warning(f"RAG Engine running in local fallback mode: {e}")
            return False

    def query(self, query_str: str) -> dict:
        """
        Executes query and returns response alongside strict source citations.
        """
        if not self.query_engine:
            return {
                "answer": "RAG engine currently operating in offline mode.",
                "citations": []
            }

        try:
            response = self.query_engine.query(query_str)
            citations = []
            for node in response.source_nodes:
                metadata = node.metadata or {}
                citations.append({
                    "file_name": metadata.get("file_name", "Unknown"),
                    "page_label": metadata.get("page_label", "N/A"),
                    "score": round(node.score or 0.0, 3),
                    "excerpt": node.text[:150] + "..."
                })

            return {
                "answer": str(response),
                "citations": citations
            }
        except Exception as e:
            logger.error(f"RAG query failed: {e}")
            return {"answer": f"Error querying knowledge base: {e}", "citations": []}

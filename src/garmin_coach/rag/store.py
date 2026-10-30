"""ChromaDB Vector Store and Specialized RAG Engine for Coaching Doctrine."""

import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional
import chromadb
from chromadb.config import Settings

DOCTRINE_DIR = Path(__file__).resolve().parents[3] / "knowledge" / "doctrine"
CHROMA_DATA_DIR = Path(__file__).resolve().parents[3] / "data" / "chroma"


class DoctrineStore:
    """Manages indexing and targeted semantic retrieval of expert coaching doctrine."""

    def __init__(self, persist_dir: Optional[Path] = None):
        self.persist_dir = persist_dir or CHROMA_DATA_DIR
        self.persist_dir.mkdir(parents=True, exist_ok=True)

        self.client = chromadb.PersistentClient(path=str(self.persist_dir))
        self.collection = self.client.get_or_create_collection(
            name="garmin_coach_doctrine",
            metadata={"description": "Jack Daniels, Seiler 80/20, HRV and Duo Pacing Doctrine"},
        )
        self._ensure_doctrine_indexed()

    def reindex_all(self) -> int:
        """Forces full re-indexing of all markdown files in knowledge/doctrine/."""
        return self._ensure_doctrine_indexed(force=True)

    def _ensure_doctrine_indexed(self, force: bool = False) -> int:
        """Parses markdown files in knowledge/doctrine/ by H2 (##) and indexes into Chroma."""
        count = self.collection.count()
        if count > 0 and not force:
            return count

        if not DOCTRINE_DIR.exists():
            print(f"Warning: Doctrine directory not found at {DOCTRINE_DIR}")
            return 0

        documents = []
        metadatas = []
        ids = []

        md_files = list(DOCTRINE_DIR.glob("*.md"))
        for file_path in md_files:
            file_topic = "general"
            fname = file_path.stem.lower()
            if "daniels" in fname:
                file_topic = "volume"
            elif "seiler" in fname or "polariz" in fname:
                file_topic = "polarization"
            elif "hrv" in fname or "recovery" in fname:
                file_topic = "hrv"
            elif "duo" in fname or "crossover" in fname:
                file_topic = "duo"

            content = file_path.read_text(encoding="utf-8")
            # Split by markdown H2 (## )
            sections = re.split(r'\n(?=##\s+)', content)

            for idx, sec in enumerate(sections):
                sec_clean = sec.strip()
                if not sec_clean:
                    continue

                # Extract title from first line
                lines = sec_clean.split("\n")
                first_line = lines[0].replace("#", "").strip()

                chunk_id = f"{file_path.stem}_{idx}"
                documents.append(sec_clean)
                metadatas.append({
                    "source": file_path.name,
                    "topic": file_topic,
                    "title": first_line,
                })
                ids.append(chunk_id)

        if documents:
            self.collection.upsert(
                ids=ids,
                documents=documents,
                metadatas=metadatas,
            )
            print(f"✅ RAG Doctrine : {len(documents)} fiches expertes indexées dans ChromaDB.")

    def query(
        self,
        query_texts: List[str],
        where: Optional[Dict[str, Any]] = None,
        n_results: int = 2,
    ) -> List[Dict[str, Any]]:
        """Queries the doctrine store with optional topic filtering."""
        try:
            results = self.collection.query(
                query_texts=query_texts,
                where=where,
                n_results=min(n_results, max(1, self.collection.count())),
            )
            output = []
            docs = results.get("documents", [[]])[0]
            metas = results.get("metadatas", [[]])[0]
            distances = results.get("distances", [[]])[0] if "distances" in results else []

            for i in range(len(docs)):
                meta = metas[i] if i < len(metas) else {}
                output.append({
                    "content": docs[i],
                    "metadata": meta,
                    "title": meta.get("title", ""),
                    "topic": meta.get("topic", ""),
                    "source": meta.get("source", ""),
                    "distance": distances[i] if i < len(distances) else None,
                })
            return output
        except Exception as e:
            print(f"Doctrine query warning: {e}")
            return []


# Global singleton instance
_doctrine_store_instance: Optional[DoctrineStore] = None


def get_doctrine_store() -> DoctrineStore:
    """Returns singleton instance of DoctrineStore."""
    global _doctrine_store_instance
    if _doctrine_store_instance is None:
        _doctrine_store_instance = DoctrineStore()
    return _doctrine_store_instance


def query_doctrine(
    query_texts: Any,
    topic: Optional[str] = None,
    n_results: int = 2,
) -> List[Dict[str, Any]]:
    """Convenience helper to query doctrine store (accepts str or list of str)."""
    store = get_doctrine_store()
    where = {"topic": topic} if topic else None
    if isinstance(query_texts, str):
        query_list = [query_texts]
    else:
        query_list = list(query_texts)
    return store.query(query_texts=query_list, where=where, n_results=n_results)

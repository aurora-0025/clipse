from collections import OrderedDict
import os
import lancedb
import numpy as np
from pydantic import BaseModel
from PIL import Image
import pyarrow as pa
from fastapi import FastAPI, HTTPException

from embedding import embed, embed_txt
from ocr import embed_ocr_text

app = FastAPI()

DB_CONNECTION_URI = 'data/test.lancedb'
db = lancedb.connect(DB_CONNECTION_URI)


schema = pa.schema(
  [
        pa.field("embedding", pa.list_(pa.float32(), 512)),
        pa.field("ocr_content", pa.string()),
        pa.field("path", pa.string()),
        pa.field("filename", pa.string())
  ])

try:
    # db.drop_table("image_data")
    tbl = db.create_table("image_data", schema=schema, mode="overwrite")
except Exception as e:
    print("Table already exists. Opening the existing table.")
    tbl = db.open_table("image_data")

# Define a Pydantic model for the indexing request
class IndexRequest(BaseModel):
    paths: list[str]


# Define a Pydantic model for the search request
class SearchRequest(BaseModel):
    query: str

@app.post("/index")
async def index_images(request: IndexRequest):
    paths = request.paths
    not_to_remove = ", ".join(["'" + str(p) + "'" for p in paths])
    
    # Remove any entries not in the provided paths list
    tbl.delete(f"path NOT IN ({not_to_remove})")
    print("Executed DELETE for paths not in the list.")

    for path in paths:
        try:
            file_name = os.path.splitext(os.path.basename(path))[0]
            img_emb = embed(Image.open(path))
            ocr_emb = embed_ocr_text(path)
            # print(img_emb, ocr_emb)
            
            data = {
                "embedding": img_emb,
                "ocr_content": ocr_emb if ocr_emb else "",
                "path": path,
                "filename": file_name
            }

            # Upsert data
            tbl.merge_insert("path").when_matched_update_all().when_not_matched_insert_all().execute([data])
            print(f"Upserted data for {file_name}")
        except Exception as e:
            print(f"Failed to process {path}: {str(e)}")
            # raise HTTPException(status_code=500, detail=f"Failed to process {path}: {str(e)}")
    # tbl.create_index(vector_column_name="embedding")
    tbl.create_fts_index("ocr_content", replace=True)
    return {"message": "Indexing completed"}


@app.post("/search")
async def search_images(request: SearchRequest):
    query = request.query
    text_emb = embed_txt(query)  # Convert query into text embedding

    try:
        top_k = 10
        max_distance = 0.75

        # Search in image embeddings
        image_results = tbl.search(text_emb, vector_column_name="embedding").metric('cosine').limit(top_k).to_list()

        # Search in OCR embeddings
        ocr_results = tbl.search(query, query_type="fts", fts_columns="ocr_content").to_list()

        combined_results = OrderedDict()  # To maintain order and uniqueness

        print(ocr_results)
        for r in ocr_results:
            path = r.get("path")
            if path and path not in combined_results:
                combined_results[path] = {
                    "path": path,
                    "mode": "OCR",
                    "distance": 0.0
                }
                print(f"[OCR] {path}")

        for r in image_results:
            path = r.get("path")
            if path and path not in combined_results and r["_distance"] < max_distance:
                combined_results[path] = {
                    "path": path,
                    "mode": "CLIP",
                    "distance": r["_distance"]
                }
                print(f"[CLIP] {path}")

        return {"results": list(combined_results.values())}

    except Exception as e:
        print(f"Search failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")
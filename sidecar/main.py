from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from PIL import Image
from sentence_transformers import SentenceTransformer
import lancedb
import pyarrow as pa
import os

app = FastAPI()

DB_CONNECTION_URI = 'data/test.lancedb'
db = lancedb.connect(DB_CONNECTION_URI)
schema = pa.schema([
    pa.field("embedding", pa.list_(pa.float32(), list_size=768)),
    pa.field("path", pa.string()),
    pa.field("filename", pa.string())
])

try:
    db.drop_table("image_data")
    tbl = db.create_table("image_data", schema=schema)
except Exception as e:
    print("Table already exists. Opening the existing table.")
    tbl = db.open_table("image_data")

model = SentenceTransformer('clip-ViT-L-14')


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
            img_emb = model.encode(Image.open(path)).tolist()
            data = {
                "embedding": img_emb,
                "path": path,
                "filename": file_name
            }

            # Upsert data
            tbl.merge_insert("path").when_matched_update_all().when_not_matched_insert_all().execute([data])
            print(f"Upserted data for {file_name}")
        except Exception as e:
            print(f"Failed to process {path}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to process {path}: {str(e)}")
    tbl.create_index(vector_column_name="embedding")
    return {"message": "Indexing completed"}


@app.post("/search")
async def search_images(request: SearchRequest):
    query = request.query
    search_model = SentenceTransformer('clip-ViT-L-14')
    text_emb = search_model.encode(query)

    try:
        results = tbl.search(text_emb).limit(3).to_list()
        paths = [result.get("path") for result in results]
        return {"path": paths}
    except Exception as e:
        print(f"Search failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

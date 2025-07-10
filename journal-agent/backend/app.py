from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import uvicorn

app = FastAPI()

# Optional: Configure CORS settings (adjust allowed origins in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/process")
async def process_input(data: dict):
    # Here you would integrate with your multi-modal large language model.
    # For example, process the image, audio, and text inputs.
    response = {
        "message": "Input processed successfully",
        "data": data  # Replace with actual processing results.
    }
    return response

if __name__ == '__main__':
    uvicorn.run("app:app", host="0.0.0.0", port=int(os.environ.get("PORT", 8000)), reload=True)
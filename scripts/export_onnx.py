import os
from pathlib import Path
from optimum.onnxruntime import ORTModelForFeatureExtraction
from transformers import AutoTokenizer

# Configuration
MODEL_ID = "sentence-transformers/all-MiniLM-L6-v2"
OUTPUT_DIR = Path("../src-tauri/assets")

def main():
    print(f"Downloading and exporting {MODEL_ID} to ONNX...")
    
    # Ensure output directory exists
    if not OUTPUT_DIR.exists():
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        print(f"Created directory: {OUTPUT_DIR}")

    # Load and export to ONNX
    # ORTModelForFeatureExtraction handles the export automatically with export=True
    model = ORTModelForFeatureExtraction.from_pretrained(MODEL_ID, export=True)
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)

    # Save model
    model_path = OUTPUT_DIR / "model.onnx"
    model.save_pretrained(OUTPUT_DIR)
    print(f"Model saved to {model_path}")

    # Save tokenizer
    tokenizer.save_pretrained(OUTPUT_DIR)
    print(f"Tokenizer saved to {OUTPUT_DIR}")

    # Rename model.onnx if optimum saved it differently (usually it saves as model.onnx)
    # Optimum saves as: model.onnx, config.json, tokenizer.json, etc.
    
    print("Done! Assets are ready in src-tauri/assets/")

if __name__ == "__main__":
    main()

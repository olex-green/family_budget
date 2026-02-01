import os
from pathlib import Path
from optimum.exporters.onnx import export
from optimum.exporters.onnx.model_configs import BertOnnxConfig
from transformers import BertConfig, BertModel, AutoTokenizer, AutoConfig

# Configuration
MODEL_ID = "Snowflake/snowflake-arctic-embed-m-v2.0"
OUTPUT_DIR = Path(__file__).parent.parent / "src-tauri/assets"

def main():
    print(f"Downloading and exporting {MODEL_ID} to ONNX (Force BERT Mode)...")
    
    # Ensure output directory exists
    if not OUTPUT_DIR.exists():
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        print(f"Created directory: {OUTPUT_DIR}")

    try:
        # 1. Load Config
        # We try to use BertConfig. If it fails (missing keys), we use AutoConfig but force it into BertModel.
        print("Loading config...")
        config = BertConfig.from_pretrained(MODEL_ID, trust_remote_code=False)

        # PATCH: Fix IndexError during export.
        # GTE models often use type_vocab_size=1 or 0, but standard BERT export tracer assumes 2.
        # We force it to 2 so the tracer can perform its dummy pass with token_type_id=1 without crashing.
        if hasattr(config, "type_vocab_size") and config.type_vocab_size < 2:
            print(f"Patching type_vocab_size from {config.type_vocab_size} to 2 for export compatibility...")
            config.type_vocab_size = 2
        
        # 2. Load Model as BERT
        print("Loading model as BertModel (ignoring mismatched sizes due to patching)...")
        model = BertModel.from_pretrained(
            MODEL_ID, 
            config=config, 
            trust_remote_code=False,
            ignore_mismatched_sizes=True
        )
        
        # 3. Load Tokenizer
        tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, trust_remote_code=False)

        # 4. Define ONNX Config
        onnx_config = BertOnnxConfig(config, task="feature-extraction")

        # 5. Export
        print("Exporting model object to ONNX...")
        output_path = OUTPUT_DIR / "model.onnx"
        export(
            model=model,
            config=onnx_config,
            output=output_path,
            opset=14, # Standard stable opset
        )
        print(f"Model exported to {output_path}")

        # 6. Save Tokenizer
        tokenizer.save_pretrained(OUTPUT_DIR)
        print(f"Tokenizer saved to {OUTPUT_DIR}")
        print("Done! Assets are ready in src-tauri/assets/")

    except Exception as e:
        print(f"\nCRITICAL ERROR during export: {e}")
        import traceback
        traceback.print_exc()
        exit(1)

if __name__ == "__main__":
    main()

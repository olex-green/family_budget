from transformers import AutoConfig

MODEL_ID = "Snowflake/snowflake-arctic-embed-m-v2.0"
config = AutoConfig.from_pretrained(MODEL_ID, trust_remote_code=True)

print(f"Model Type: {config.model_type}")
print(f"Vocab Size: {getattr(config, 'vocab_size', 'N/A')}")
print(f"Type Vocab Size: {getattr(config, 'type_vocab_size', 'N/A')}")
print(f"Max Position Embeddings: {getattr(config, 'max_position_embeddings', 'N/A')}")
print(f"Hidden Size: {getattr(config, 'hidden_size', 'N/A')}")
print(f"Architectures: {getattr(config, 'architectures', 'N/A')}")

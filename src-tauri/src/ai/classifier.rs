use std::path::Path;
use tokenizers::Tokenizer;
// use burn::tensor::backend::Backend; // Will use when model is ready

pub struct SemanticClassifier {
    tokenizer: Tokenizer,
    // model: TextEmbeddingModel<B>, // Commented out until model.rs is populated
}

impl SemanticClassifier {
    pub fn new<P: AsRef<Path>>(model_dir: P) -> Result<Self, Box<dyn std::error::Error>> {
        let tokenizer_path = model_dir.as_ref().join("tokenizer.json");
        let tokenizer = Tokenizer::from_file(tokenizer_path).map_err(|e| e.to_string())?;

        // Load model weights here

        Ok(Self { tokenizer })
    }

    pub fn embed(&self, text: &str) -> Vec<f32> {
        // Tokenize
        let encoding = self.tokenizer.encode(text, true).unwrap();

        // Pass to model (Placeholder)
        // let input = Tensor::from_data(encoding.get_ids());
        // let output = self.model.forward(input);

        // Return dummy vector for now to ensure compilation of flow
        vec![0.0; 384]
    }

    pub fn classify(&self, text: &str, categories: &[String]) -> (String, f32) {
        let text_embedding = self.embed(text);

        let mut best_category = "Uncategorized".to_string();
        let mut best_score = -1.0;

        for category in categories {
            // In a real app, category embeddings should be pre-computed and cached!
            let cat_embedding = self.embed(category);
            let score = cosine_similarity(&text_embedding, &cat_embedding);

            if score > best_score {
                best_score = score;
                best_category = category.clone();
            }
        }

        // Thresholding could happen here
        if best_score < 0.4 {
            ("Uncategorized".to_string(), best_score)
        } else {
            (best_category, best_score)
        }
    }
}

fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    let dot_product: f32 = a.iter().zip(b).map(|(x, y)| x * y).sum();
    let norm_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
    let norm_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();

    if norm_a == 0.0 || norm_b == 0.0 {
        0.0
    } else {
        dot_product / (norm_a * norm_b)
    }
}

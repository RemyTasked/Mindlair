/**
 * ML Model Loader for Level 2 Cue Companion
 * 
 * Loads and manages ONNX models for advanced speech pattern detection.
 * Gracefully degrades to rule-based system if model loading fails.
 * 
 * Model Architecture (Placeholder - to be trained):
 * - Input: 32-dimensional feature vector (MFCCs + spectral + prosodic)
 * - Hidden: 2 layers of 64 units each (LSTM or Dense)
 * - Output: 5 classes (calm, pace_spike, volume_spike, breathless, monologue)
 * 
 * The model would be trained on labeled speech data, but for now we use
 * rule-based heuristics as a fallback.
 */

import * as ort from 'onnxruntime-web';

export interface ModelPrediction {
  class: 'calm' | 'pace_spike' | 'volume_spike' | 'breathless' | 'monologue';
  confidence: number;
  probabilities: {
    calm: number;
    pace_spike: number;
    volume_spike: number;
    breathless: number;
    monologue: number;
  };
}

export class MLModelLoader {
  private session: ort.InferenceSession | null = null;
  private modelLoaded = false;
  private loadingFailed = false;
  private loadingPromise: Promise<void> | null = null;
  
  constructor() {
    // Configure ONNX Runtime for browser
    ort.env.wasm.numThreads = 1; // Single thread for better mobile compatibility
    ort.env.wasm.simd = true;    // Enable SIMD if available
  }
  
  /**
   * Load the ONNX model
   * 
   * In production, this would load a trained model from /public/models/
   * For now, we'll gracefully handle the missing model.
   */
  async loadModel(): Promise<boolean> {
    if (this.modelLoaded) return true;
    if (this.loadingFailed) return false;
    if (this.loadingPromise) {
      await this.loadingPromise;
      return this.modelLoaded;
    }
    
    this.loadingPromise = this.doLoadModel();
    await this.loadingPromise;
    return this.modelLoaded;
  }
  
  private async doLoadModel(): Promise<void> {
    try {
      console.log('🤖 Attempting to load Level 2 ML model...');
      
      // Try to load model from public directory
      // In production, you would train and export a model to:
      // /public/models/level2-composure-v1.onnx
      const modelPath = '/models/level2-composure-v1.onnx';
      
      this.session = await ort.InferenceSession.create(modelPath, {
        executionProviders: ['wasm'], // Use WebAssembly backend
        graphOptimizationLevel: 'all',
      });
      
      this.modelLoaded = true;
      console.log('✅ ML model loaded successfully');
      
    } catch (error) {
      console.log('ℹ️ ML model not available, using rule-based system:', error);
      this.loadingFailed = true;
      this.modelLoaded = false;
      
      // This is expected - we don't have a trained model yet
      // The system will fall back to rule-based detection
    }
  }
  
  /**
   * Run inference on feature vector
   * 
   * Returns null if model not loaded (caller should use rule-based fallback)
   */
  async predict(features: Float32Array): Promise<ModelPrediction | null> {
    if (!this.modelLoaded || !this.session) {
      return null;
    }
    
    try {
      // Reshape features to [1, 32] (batch size 1, 32 features)
      const inputTensor = new ort.Tensor('float32', features, [1, 32]);
      
      // Run inference
      const results = await this.session.run({ input: inputTensor });
      
      // Get output tensor (shape: [1, 5] for 5 classes)
      const outputTensor = results.output;
      const probabilities = Array.from(outputTensor.data as Float32Array);
      
      // Find class with highest probability
      const maxIndex = probabilities.indexOf(Math.max(...probabilities));
      const classes: ModelPrediction['class'][] = [
        'calm',
        'pace_spike',
        'volume_spike',
        'breathless',
        'monologue',
      ];
      
      return {
        class: classes[maxIndex],
        confidence: probabilities[maxIndex],
        probabilities: {
          calm: probabilities[0],
          pace_spike: probabilities[1],
          volume_spike: probabilities[2],
          breathless: probabilities[3],
          monologue: probabilities[4],
        },
      };
      
    } catch (error) {
      console.error('❌ ML inference failed:', error);
      return null;
    }
  }
  
  /**
   * Check if model is ready
   */
  isReady(): boolean {
    return this.modelLoaded;
  }
  
  /**
   * Check if model loading failed
   */
  hasFailed(): boolean {
    return this.loadingFailed;
  }
  
  /**
   * Unload model to free memory
   */
  async unload(): Promise<void> {
    if (this.session) {
      // ONNX Runtime Web doesn't have explicit dispose yet
      this.session = null;
      this.modelLoaded = false;
      console.log('🗑️ ML model unloaded');
    }
  }
}

// Singleton instance
let modelLoaderInstance: MLModelLoader | null = null;

export function getMLModelLoader(): MLModelLoader {
  if (!modelLoaderInstance) {
    modelLoaderInstance = new MLModelLoader();
  }
  return modelLoaderInstance;
}

/**
 * Rule-based fallback predictor
 * 
 * This is used when the ML model is not available.
 * It uses heuristics based on the extracted features.
 */
export function ruleBasedPredict(
  features: Float32Array,
  baseline: { avgRMS: number; avgSpeechRate: number; avgPauseRatio: number; stdRMS: number; stdSpeechRate: number; stdPauseRatio: number }
): ModelPrediction {
  // Extract key features from vector
  // (This assumes the feature vector layout from mlFeatureExtractor.ts)
  const rmsEnergy = features[14]; // Index 14 is RMS after normalization
  const zcr = features[15];       // Index 15 is ZCR
  
  // Calculate z-scores (simplified)
  const rmsZ = baseline.stdRMS > 0 ? (rmsEnergy * 10 - baseline.avgRMS) / baseline.stdRMS : 0;
  
  // Heuristic classification
  let predictedClass: ModelPrediction['class'] = 'calm';
  let confidence = 0.5;
  
  // High RMS = volume spike
  if (rmsZ > 1.0) {
    predictedClass = 'volume_spike';
    confidence = Math.min(0.6 + rmsZ * 0.1, 0.95);
  }
  // High ZCR = breathless
  else if (zcr > 0.15) {
    predictedClass = 'breathless';
    confidence = Math.min(0.6 + zcr * 2, 0.95);
  }
  // Otherwise calm
  else {
    predictedClass = 'calm';
    confidence = 0.7;
  }
  
  // Create probability distribution
  const probabilities = {
    calm: 0.2,
    pace_spike: 0.2,
    volume_spike: 0.2,
    breathless: 0.2,
    monologue: 0.2,
  };
  probabilities[predictedClass] = confidence;
  
  // Normalize probabilities
  const total = Object.values(probabilities).reduce((sum, p) => sum + p, 0);
  Object.keys(probabilities).forEach(key => {
    probabilities[key as keyof typeof probabilities] /= total;
  });
  
  return {
    class: predictedClass,
    confidence,
    probabilities,
  };
}


# Level 2 Cue Companion - ML Model Architecture

## Overview

This document describes the machine learning model architecture for the Level 2 Cue Companion's advanced speech pattern detection system.

**Current Status**: The system is fully functional using rule-based heuristics. The ML model is **optional** and provides enhanced accuracy when available.

## Model Purpose

Detect subtle speech patterns that indicate:
- **Pace spikes**: Speaking too quickly due to nervousness or excitement
- **Volume spikes**: Getting louder (escalation, defensiveness)
- **Breathlessness**: Running out of breath, not pausing enough
- **Stuck patterns**: Too many pauses, hesitation, losing train of thought
- **Monologuing**: Talking too long without inviting dialogue

## Input Features (32-dimensional vector)

### 1. MFCCs (13 coefficients)
Mel-Frequency Cepstral Coefficients - the industry standard for speech/audio ML
- Captures spectral envelope in compact form
- Approximates human perception of sound
- Normalized by dividing by 100

### 2. Spectral Features (4 dimensions)
- **Spectral Centroid**: "Brightness" of sound (normalized to 0-1)
- **Spectral Rolloff**: Frequency below which 85% of energy is contained
- **Spectral Flux**: Rate of change in spectrum (×10 for scaling)
- **Spectral Bandwidth**: Width of spectrum (÷100 for normalization)

### 3. Prosodic Features (3 dimensions)
- **Pitch Estimate**: Fundamental frequency F0 (÷500 for normalization)
- **RMS Energy**: Overall volume (×10 for scaling)
- **Zero Crossing Rate**: Voicing indicator (already 0-1)

### 4. Temporal Context (5 dimensions)
- **Energy Contour**: Last 5 energy values (×10 for scaling)
- Provides temporal context for detecting escalation patterns

## Model Architecture (Placeholder)

### Option A: Simple Dense Network (Baseline)
```
Input Layer: 32 features
  ↓
Dense Layer: 64 units, ReLU activation
  ↓
Dropout: 0.3
  ↓
Dense Layer: 64 units, ReLU activation
  ↓
Dropout: 0.3
  ↓
Output Layer: 5 units, Softmax activation
```

**Classes**:
1. `calm` - Normal, composed speech
2. `pace_spike` - Speaking too fast
3. `volume_spike` - Getting too loud
4. `breathless` - Not pausing enough
5. `monologue` - Talking too long

### Option B: LSTM Network (Advanced)
For better temporal pattern recognition:
```
Input Layer: 32 features × sequence length (e.g., 10 frames)
  ↓
LSTM Layer: 64 units
  ↓
Dropout: 0.3
  ↓
LSTM Layer: 64 units
  ↓
Dropout: 0.3
  ↓
Dense Layer: 32 units, ReLU activation
  ↓
Output Layer: 5 units, Softmax activation
```

## Training Data Requirements

### Data Collection
To train this model, you would need:

1. **Labeled Speech Recordings** (~100+ hours):
   - Meetings where speakers exhibit different patterns
   - Labeled segments: "calm", "pace_spike", "volume_spike", etc.
   - Diverse speakers (gender, age, accent, language)

2. **Annotation Guidelines**:
   - `calm`: Normal, composed, well-paced speech
   - `pace_spike`: Noticeably faster than baseline, rushed
   - `volume_spike`: Louder than baseline, escalating
   - `breathless`: Long stretches without pauses, running out of breath
   - `monologue`: Speaking for >90 seconds without inviting response

3. **Data Augmentation**:
   - Time stretching (±10% speed)
   - Pitch shifting (±2 semitones)
   - Background noise addition
   - Room reverb simulation

### Training Process
```python
# Pseudocode for training

import tensorflow as tf
from tensorflow import keras

# 1. Load and preprocess data
X_train, y_train = load_labeled_audio_data()
X_train = extract_ml_features(X_train)  # 32-dim vectors
y_train = keras.utils.to_categorical(y_train, num_classes=5)

# 2. Define model
model = keras.Sequential([
    keras.layers.Dense(64, activation='relu', input_shape=(32,)),
    keras.layers.Dropout(0.3),
    keras.layers.Dense(64, activation='relu'),
    keras.layers.Dropout(0.3),
    keras.layers.Dense(5, activation='softmax')
])

# 3. Compile
model.compile(
    optimizer='adam',
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

# 4. Train
model.fit(
    X_train, y_train,
    batch_size=32,
    epochs=50,
    validation_split=0.2,
    callbacks=[
        keras.callbacks.EarlyStopping(patience=5),
        keras.callbacks.ModelCheckpoint('best_model.h5')
    ]
)

# 5. Export to ONNX
import tf2onnx
onnx_model = tf2onnx.convert.from_keras(model)
with open('level2-composure-v1.onnx', 'wb') as f:
    f.write(onnx_model.SerializeToString())
```

## Deployment

### Model File Location
Place the trained ONNX model at:
```
src/frontend/public/models/level2-composure-v1.onnx
```

### Model Loading
The system automatically attempts to load the model on initialization:
- If successful: ML-enhanced detection is enabled
- If failed: Gracefully falls back to rule-based system
- No user-facing errors - seamless degradation

### Performance Targets
- **Inference time**: <10ms per frame on mid-range laptop
- **CPU usage**: <10% when active
- **Memory**: <50MB for model + runtime
- **Accuracy**: >80% on validation set

## Hybrid System (Current Implementation)

The system uses a **hybrid approach**:

### 1. ML Prediction (when model available)
```typescript
const mlPrediction = await mlModelLoader.predict(normalizedFeatures);
if (mlPrediction.confidence > 0.7 && mlPrediction.class !== 'calm') {
  // ML detected a pattern
  // Combine with z-score logic for final decision
}
```

### 2. Z-Score Rules (always active)
```typescript
const rmsZ = (current_rms - baseline_mean) / baseline_std;
if (rmsZ > 1.0 && persisted_for >= 3_seconds) {
  // Trigger "Softer tone" cue
}
```

### 3. Fusion Logic
- ML predictions **boost confidence** in z-score triggers
- ML can detect patterns that rules might miss (e.g., subtle escalation)
- Z-scores provide **persistence checking** (must persist for X seconds)
- Final decision combines both signals

## Rule-Based Fallback

When ML model is not available, the system uses sophisticated heuristics:

```typescript
function ruleBasedPredict(features, baseline) {
  const rmsZ = calculateZScore(features.rms, baseline);
  const zcr = features.zeroCrossingRate;
  
  if (rmsZ > 1.0) {
    return { class: 'volume_spike', confidence: 0.6 + rmsZ * 0.1 };
  } else if (zcr > 0.15) {
    return { class: 'breathless', confidence: 0.6 + zcr * 2 };
  } else {
    return { class: 'calm', confidence: 0.7 };
  }
}
```

## Future Improvements

### Phase 7: Adaptive Learning
- Track which cues are most helpful for each user
- Adjust cue frequency based on user patterns
- Predict spike moments before they happen
- Personalize thresholds over time

### Advanced Features
- **Multi-speaker detection**: Distinguish user from others
- **Emotion recognition**: Detect stress, frustration, excitement
- **Context awareness**: Different thresholds for presentations vs 1:1s
- **Real-time adaptation**: Adjust during meeting based on dynamics

## Privacy & Ethics

### Privacy Guarantees
✅ **100% on-device processing** - Audio never leaves the device  
✅ **No recording** - Only ephemeral feature vectors  
✅ **No transcription** - Content is never analyzed  
✅ **No cloud uploads** - Model runs entirely in browser  
✅ **User control** - One-tap disable at any time  

### Ethical Considerations
- The system provides **coaching**, not **surveillance**
- Cues are **suggestions**, not commands
- Users maintain full autonomy
- No data shared with employers or third parties
- Transparent about what's being analyzed (prosody, not content)

## Technical Stack

- **ONNX Runtime Web**: Cross-platform ML inference in browser
- **WebAssembly**: Fast, secure execution
- **WebAudio API**: Real-time audio processing
- **TypeScript**: Type-safe implementation
- **Framer Motion**: Smooth UI animations

## References

- [ONNX Runtime Web Documentation](https://onnxruntime.ai/docs/tutorials/web/)
- [MFCCs Explained](https://en.wikipedia.org/wiki/Mel-frequency_cepstrum)
- [Speech Emotion Recognition](https://arxiv.org/abs/2001.11293)
- [WebAudio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

---

**Status**: ✅ Infrastructure complete, ready for model training  
**Next Step**: Collect and label training data, or continue with rule-based system


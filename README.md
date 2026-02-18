# @xhiti/local-ai

> **Privacy-first AI skills for React applications.**  
> Zero backend. Zero costs. 100% privacy.  
> Run AI entirely in the browser with offline support.

[![npm version](https://badge.fury.io/js/@xhiti%2Flocal-ai.svg)](https://badge.fury.io/js/@xhiti%2Flocal-ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🚀 The Vision

**@xhiti/local-ai** is a comprehensive React hook library that enables developers to add powerful AI capabilities to their applications **without any backend infrastructure**. All AI inference runs directly in the user's browser using Web Workers, ensuring:

- **🔒 100% Privacy** - Data never leaves the user's device
- **💸 Zero Costs** - No API calls, no server costs, no rate limits
- **⚡ Instant Response** - No network latency
- **📴 Offline-First** - Works without internet after initial model download
- **🌐 Edge-Compatible** - Deploy anywhere, no server dependencies

---

## 📦 Installation

```bash
npm install @xhiti/local-ai
# or
yarn add @xhiti/local-ai
# or
pnpm add @xhiti/local-ai
```

---

## 🎯 Quick Start

```tsx
import { LocalAIProvider, useSummarize, AIStatus } from '@xhiti/local-ai';

function App() {
  return (
    <LocalAIProvider config={{ defaultTier: 'lite' }}>
      <Summarizer />
      <AIStatus detailed />
    </LocalAIProvider>
  );
}

function Summarizer() {
  const { summarize, summary, isLoading, progress } = useSummarize();

  return (
    <div>
      <button
        onClick={() => summarize(longArticle)}
        disabled={isLoading}
      >
        {isLoading ? `Loading ${progress}%` : 'Summarize'}
      </button>
      {summary && <p>{summary}</p>}
    </div>
  );
}
```

---

## 🧠 Available Skills

### Text Processing

| Skill | Description | Hook |
|-------|-------------|------|
| **Summarization** | Reduce long text to concise summaries | `useSummarize()` |
| **Translation** | Translate between 100+ languages | `useTranslate()` |
| **Classification** | Zero-shot text classification | `useClassify()` |

### Data Intelligence

| Skill | Description | Hook |
|-------|-------------|------|
| **Semantic Search** | Search by meaning, not keywords | `useSemanticSearch()` |

### Audio & Speech

| Skill | Description | Hook |
|-------|-------------|------|
| **Speech-to-Text** | Whisper-based transcription | `useTranscribe()` |
| **Text-to-Speech** | Natural voice synthesis | `useLocalTTS()` |

### Vision & Media

| Skill | Description | Hook |
|-------|-------------|------|
| **Object Detection** | Real-time object detection | `useObjectDetection()` |
| **OCR** | Extract text from images | `useOCR()` |
| **Smart Crop** | AI-powered image cropping | `useSmartCrop()` |

---

## 📚 Detailed Usage

### Summarization

```tsx
const { summarize, summary, isLoading, progress } = useSummarize({
  tier: 'lite', // 'lite' | 'standard' | 'pro'
  defaultMaxLength: 150,
  defaultMinLength: 30,
});

// Simple usage
const result = await summarize(longText);

// With options
const result = await summarize(longText, {
  maxLength: 100,
  minLength: 20,
});
```

### Translation

```tsx
import { useTranslate, LANGUAGE_CODES } from '@xhiti/local-ai';

const { translate, translation } = useTranslate();

// Translate to French
const french = await translate('Hello world', LANGUAGE_CODES.french);

// Auto-detect source language
const result = await translate('Bonjour', LANGUAGE_CODES.english);
```

### Semantic Search

```tsx
const { search, index, results } = useSemanticSearch();

const documents = [
  { title: 'Machine Learning Basics', content: 'Introduction to ML...' },
  { title: 'Cooking Tips', content: 'How to make pasta...' },
];

// Pre-index for faster searches
await index(documents);

// Search by meaning
const matches = await search('artificial intelligence', documents, {
  topK: 5,
  threshold: 0.7,
});
```

### Speech Recognition

```tsx
const { transcribe, transcribeFromMic, transcript } = useTranscribe();

// From audio file
const text = await transcribe(audioBlob);

// From microphone (5 seconds)
const text = await transcribeFromMic(5000);

// With options
const text = await transcribe(audioBuffer, {
  language: 'en',
  removeFillers: true, // Remove "um", "uh", etc.
});
```

### Text-to-Speech

```tsx
const { speak, speakAndPlay, stop, isPlaying } = useLocalTTS();

// Speak and play
await speakAndPlay('Hello, world!', {
  rate: 1.0,
  pitch: 1.0,
});

// Just generate audio
const audio = await speak('Hello');

// Control playback
stop();
```

### Object Detection

```tsx
const { detect, startWebcam, stopWebcam, objects } = useObjectDetection({
  continuous: true,
  onDetect: (objs) => console.log('Detected:', objs),
});

// From image
const objects = await detect(imageBlob);

// From webcam
await startWebcam(videoElement);
// ... objects are updated in real-time
stopWebcam();
```

### OCR

```tsx
const { extract, text } = useOCR();

// Extract text from image
const text = await extract(imageBlob);

// With bounding boxes
const result = await extractDetailed({
  image: imageBlob,
  returnBoundingBoxes: true,
});
```

---

## ⚙️ Configuration

### Provider Config

```tsx
<LocalAIProvider
  config={{
    // Default model tier
    defaultTier: 'standard',
    
    // Preferred execution backend
    preferredBackend: 'webgpu',
    
    // Maximum memory to use (MB)
    maxMemoryMB: 2048,
    
    // Enable debug logging
    debug: true,
    
    // Pre-load models on mount
    preloadModels: ['summarization', 'feature-extraction'],
    
    // Override default models
    modelOverrides: {
      summarization: {
        hfModelId: 'custom/model-id',
      },
    },
    
    // Cache configuration
    cacheConfig: {
      enabled: true,
      maxSizeMB: 2048,
    },
  }}
>
  <App />
</LocalAIProvider>
```

### Model Tiers

| Tier | Size | Speed | Accuracy | Use Case |
|------|------|-------|----------|----------|
| `lite` | ~20-50MB | Fastest | Good | Mobile, quick responses |
| `standard` | ~100-200MB | Balanced | Better | Most applications |
| `pro` | ~300-500MB | Slower | Best | High-accuracy needs |

---

## 🏗️ Architecture

### Off-Main-Thread Execution

All AI inference runs in a dedicated Web Worker, ensuring the UI stays at 60fps even during heavy model processing.

```
┌─────────────────┐     ┌─────────────────────┐
│   Main Thread   │     │    Web Worker       │
│                 │     │                     │
│  React UI       │◄───►│  AI Inference       │
│  LocalAIProvider│     │  Model Management   │
│  useSkill Hooks │     │  Transformers.js    │
└─────────────────┘     └─────────────────────┘
```

### Smart Caching

Models are cached in IndexedDB on first download and persist across sessions:

```
First Visit:
  ┌─────────┐    ┌─────────┐    ┌──────────┐
  │ Request │───►│ Download│───►│ IndexedDB│
  └─────────┘    └─────────┘    └──────────┘

Subsequent Visits:
  ┌─────────┐    ┌──────────┐    ┌─────────┐
  │ Request │───►│ IndexedDB│───►│ Instant │
  └─────────┘    └──────────┘    └─────────┘
```

### Adaptive Performance

The library automatically detects device capabilities and selects the optimal backend:

```
┌──────────────────┐
│ WebGPU Support?  │──Yes──► Use WebGPU (GPU acceleration)
└────────┬─────────┘
         │ No
         ▼
┌──────────────────┐
│ WASM SIMD?       │──Yes──► Use WASM (optimized CPU)
└────────┬─────────┘
         │ No
         ▼
┌──────────────────┐
│ CPU Fallback     │───► Use CPU (slower but universal)
└──────────────────┘
```

---

## 🎨 Visual Components

### AIStatus Component

A pre-built status indicator showing AI health:

```tsx
import { AIStatus } from '@xhiti/local-ai';

// Inline variant
<AIStatus variant="inline" />

// Compact variant
<AIStatus compact />

// Full variant with details
<AIStatus 
  detailed 
  showMemory 
  showModels 
  showCapabilities 
/>
```

---

## 🔧 API Reference

### Hooks API

All skill hooks follow a consistent API:

```tsx
const {
  // Main execution function
  execute,           // Execute the skill
  
  // Result state
  result,            // Full result object
  isLoading,         // Loading state
  progress,          // Download/execution progress (0-100)
  status,            // Current status string
  error,             // Error if any
  
  // Utilities
  reset,             // Reset state
  abort,             // Abort current operation
} = useSkill(config);
```

### useAIState Hook

Access global AI state:

```tsx
const {
  isInitialized,
  capabilities,
  currentBackend,
  loadedModels,
  memoryUsage,
  loadModel,
  clearCache,
} = useAIState();
```

---

## 🌐 Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| WebGPU | ✅ 113+ | 🔄 In development | ✅ 17+ | ✅ 113+ |
| WASM SIMD | ✅ 91+ | ✅ 89+ | ✅ 15+ | ✅ 91+ |
| CPU Fallback | ✅ | ✅ | ✅ | ✅ |

---

## 📊 Bundle Size

The library itself is tiny:

| Package | Size (minified + gzip) |
|---------|----------------------|
| Core | ~5KB |
| Hooks | ~8KB |
| Components | ~3KB |
| **Total** | **~16KB** |

*Note: AI models are downloaded separately and cached in IndexedDB.*

---

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

---

## 📄 License

MIT © [xhiti](https://github.com/xhiti)

---

## 🙏 Acknowledgments

- [🤗 Hugging Face Transformers.js](https://github.com/xenova/transformers.js) - Transformers for the browser
- [ONNX Runtime Web](https://github.com/microsoft/onnxruntime) - ML inference runtime
- The open-source AI community

---

<p align="center">
  <strong>Built with ❤️ by <a href="https://github.com/xhiti">xhiti</a></strong>
</p>

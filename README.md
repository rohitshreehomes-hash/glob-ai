# 🌍 Glob AI - Multimodal AI Framework

A powerful, unified AI platform combining **LLM (Language Model)**, **Computer Vision**, and **Voice/Audio AI** - all in one application.

## 🎯 Features

### 🗣️ **LLM (Language Generation)**
- Advanced text generation using Llama 2 / Mistral
- Fine-tuned for custom domains
- Context-aware conversations
- Multi-language support

### 👁️ **Computer Vision**
- Real-time object detection (YOLOv8)
- Image classification (ResNet)
- Image generation capabilities
- Face recognition

### 🎙️ **Voice & Audio AI**
- Speech-to-text (Whisper)
- Text-to-speech (Tacotron2, Glow-TTS)
- Voice synthesis
- Audio analysis

## 🏗️ Architecture

```
Glob AI
├── Backend (FastAPI + Python)
│   ├── LLM Module
│   ├── Vision Module
│   ├── Audio Module
│   └── API Server
├── Frontend (Multi-platform)
│   ├── Web (React.js)
│   ├── Mobile (React Native)
│   └── Desktop (Electron)
└── Deployment (Docker + Cloud)
```

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- GPU (NVIDIA recommended)
- 8GB+ RAM
- Node.js 18+ (for frontend)

### Installation

```bash
# Clone repository
git clone https://github.com/rohitshreehomes-hash/glob-ai.git
cd glob-ai

# Setup backend
cd backend
pip install -r requirements.txt

# Download models
python scripts/download_models.py

# Start API server
python main.py
```

### Usage

```python
from glob_ai import GlobAI

ai = GlobAI()

# Text Generation
response = ai.generate_text("What is AI?")

# Image Analysis
analysis = ai.analyze_image("path/to/image.jpg")

# Speech-to-Text
text = ai.speech_to_text("path/to/audio.wav")

# Text-to-Speech
ai.text_to_speech("Hello World", "output.mp3")
```

## 📁 Project Structure

```
glob-ai/
├── backend/
│   ├── llm/
│   │   ├── model.py          # LLM model interface
│   │   ├── config.yaml       # LLM configuration
│   │   └── utils.py
│   ├── vision/
│   │   ├── model.py          # Vision model interface
│   │   ├── config.yaml
│   │   └── utils.py
│   ├── audio/
│   │   ├── model.py          # Audio model interface
│   │   ├── config.yaml
│   │   └── utils.py
│   ├── api/
│   │   ├── main.py           # FastAPI server
│   │   ├── routes.py         # API endpoints
│   │   └── middleware.py
│   ├── models/               # Pre-trained models
│   ├── data/                 # Datasets
│   ├── scripts/
│   │   ├── download_models.py
│   │   └── train.py
│   ├── main.py               # Entry point
│   └── requirements.txt
├── frontend/
│   ├── web/                  # React app
│   ├── mobile/               # React Native app
│   └── desktop/              # Electron app
├── docker/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── .dockerignore
├── configs/
│   └── config.yaml
├── docs/
│   ├── setup.md
│   ├── api.md
│   └── training.md
└── .gitignore
```

## 🔧 Configuration

Edit `configs/config.yaml` to customize:

```yaml
llm:
  model: "mistral"
  max_tokens: 2048
  temperature: 0.7

vision:
  model: "yolov8"
  confidence: 0.5

audio:
  sample_rate: 16000
  model: "whisper-base"
```

## 📚 API Documentation

### LLM Endpoint
```
POST /api/llm/generate
{
  "prompt": "Your text here",
  "max_tokens": 100
}
```

### Vision Endpoint
```
POST /api/vision/analyze
{
  "image_url": "path/to/image.jpg"
}
```

### Audio Endpoint
```
POST /api/audio/transcribe
{
  "audio_url": "path/to/audio.wav"
}
```

## 🔄 Supported Models

| Component | Model | Status |
|-----------|-------|--------|
| LLM | Llama 2 | ✅ |
| LLM | Mistral | ✅ |
| Vision | YOLOv8 | ✅ |
| Vision | ResNet | ✅ |
| Audio | Whisper | ✅ |
| Audio | Tacotron2 | 🔄 |

## 🚢 Deployment

### Docker
```bash
docker build -f docker/Dockerfile -t glob-ai .
docker run -p 8000:8000 glob-ai
```

### Cloud Deployment
- AWS EC2 / SageMaker
- Google Cloud / Vertex AI
- Azure ML
- Hugging Face Spaces

## 📖 Documentation

- [Setup Guide](docs/setup.md)
- [API Documentation](docs/api.md)
- [Training Guide](docs/training.md)
- [Architecture](docs/architecture.md)

## 📈 Pine Script — Trading Tools

`pine/` folder me TradingView ke liye ready-made scripts hain:

| Script | Kaam |
|---|---|
| [`pine/SBE_Swing_Indicator.pine`](pine/SBE_Swing_Indicator.pine) | **SALE • BUY • EXIT — Swing + Side Base** indicator (labels + base box + alerts) |
| [`pine/SBE_Swing_Strategy.pine`](pine/SBE_Swing_Strategy.pine) | Wahi logic ka backtest strategy (Strategy Tester) |

Setup, settings aur tuning: **[pine/README.md](pine/README.md)**

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## 📜 License

MIT License - see LICENSE file

## 📧 Contact

- **GitHub:** [@rohitshreehomes-hash](https://github.com/rohitshreehomes-hash)
- **Email:** your-email@example.com

## 🙏 Acknowledgments

Built with:
- [Hugging Face Transformers](https://huggingface.co/)
- [PyTorch](https://pytorch.org/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [OpenAI Whisper](https://github.com/openai/whisper)

---

**Status:** 🚀 Active Development

**Last Updated:** 2026-05-24

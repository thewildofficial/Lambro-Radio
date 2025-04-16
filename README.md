# 🎵 Lambro Radio

A powerful web application for retuning and processing audio from YouTube videos. Transform your audio to specific frequencies with real-time visualization and effects.

## ✨ Features

- **YouTube Integration**: Load any YouTube video and extract high-quality audio
- **Frequency Retuning**: Retune audio to specific frequencies:
  - 432 Hz (Earth Frequency)
  - 440 Hz (Standard Concert Pitch)
  - 444 Hz (Solfeggio Related)
  - 528 Hz (DNA Repair Frequency)
- **Real-time Visualization**: Beautiful waveform display with wavesurfer.js
- **Audio Processing**:
  - Precise pitch shifting with pyrubberband
  - Real-time waveform visualization
  - Time display and seeking
- **Sharing & Export**:
  - Generate shareable links with frequency settings
  - Download processed audio in WAV format
  - Copy link functionality
- **Modern UI/UX**:
  - Responsive design
  - Dark theme
  - Loading states and animations
  - Touch-friendly controls

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- FFmpeg (for audio processing)

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install fastapi uvicorn yt-dlp numpy soundfile pyrubberband
   ```

4. Start the server:
   ```bash
   python main.py
   ```

Server will run on http://localhost:8000

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

Application will run on http://localhost:3000

## 🎹 Usage

1. Enter a YouTube URL
2. Click "Load Audio" to fetch and process
3. Choose your desired frequency from the dropdown
4. Use the play/pause button or click the waveform to control playback
5. Share or download your retuned audio

## 🛠️ Tech Stack

### Backend
- FastAPI - Modern Python web framework
- yt-dlp - YouTube download library
- pyrubberband - High-quality pitch shifting
- soundfile - Audio file handling
- numpy - Numerical processing

### Frontend
- Next.js 13+ (App Router)
- TypeScript
- Tailwind CSS
- wavesurfer.js - Waveform visualization
- Hero Icons - Beautiful SVG icons

## 🎯 Roadmap

See our [checklist.md](checklist.md) for detailed development plans including:
- Reverb effects with multiple presets
- Tempo control
- User accounts
- AI-generated cover art
- Advanced audio processing features

## 📦 Project Structure

```
.
├── backend/              # FastAPI backend
│   └── main.py          # Main server file
└── frontend/            # Next.js frontend
    ├── src/
    │   ├── app/        # Next.js app router
    │   └── components/ # React components
    └── public/         # Static assets
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgements

- [Rubber Band Library](https://breakfastquay.com/rubberband/) - High-quality audio processing
- [wavesurfer.js](https://wavesurfer-js.org/) - Audio visualization
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - YouTube download library
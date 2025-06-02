# Clueless

A real-time AI-powered open-source assistant built with Electron, React, and Google's Gemini AI.

## 🚀 Features

- **Real-time Voice Interaction**: Speak naturally to the AI assistant and receive immediate responses
- **Advanced Audio Processing**: High-quality audio capture and processing with real-time analysis
- **Modern Desktop UI**: Beautiful, responsive interface built with React and Tailwind CSS
- **Cross-platform**: Runs on Windows, macOS, and Linux
- **Privacy-focused**: Open-source with transparent data handling
- **Customizable**: Configurable AI model parameters and audio settings

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Electron, Node.js
- **AI Integration**: Google Gemini 2.0 Flash Live API
- **Audio Processing**: Audify (RtAudio), libsamplerate-js
- **State Management**: Zustand
- **Build Tools**: Vite, Electron Builder

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Google AI API key (Gemini)

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd clueless
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_MODEL=gemini-2.0-flash-live-001
   GEMINI_TEMPERATURE=0.7
   ```

4. **Run the application**
   ```bash
   npm run dev
   ```

## 🚀 Usage

### Development Mode
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Create Portable Package
```bash
npm run package:portable
```

### Available Scripts

- `npm run clean` - Clean the dist folder
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview the built application
- `npm start` - Start the built application
- `npm run package:portable` - Create a portable executable

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Your Google AI API key | Required |
| `GEMINI_MODEL` | Gemini model to use | `gemini-2.0-flash-live-001` |
| `GEMINI_TEMPERATURE` | AI response creativity (0-1) | `0.7` |

### Audio Settings

The application automatically configures audio processing:
- **Sample Rate**: 16kHz (optimized for AI processing)
- **Channels**: Mono
- **Format**: 16-bit signed integer PCM
- **Frame Size**: 40ms chunks for real-time processing

## 🎯 Key Features Explained

### Real-time Audio Processing
- Captures audio from your microphone in real-time
- Processes audio in 40ms chunks for minimal latency
- Automatically handles sample rate conversion and format optimization

### AI Integration
- Uses Google's latest Gemini 2.0 Flash Live model
- Supports real-time conversational AI
- Configurable temperature for response creativity

### Modern UI/UX
- Responsive design with Tailwind CSS
- Smooth animations with Framer Motion
- Dark/light theme support
- Intuitive voice interaction indicators

## 📁 Project Structure

```
clueless/
├── src/
│   ├── main.ts          # Electron main process
│   ├── preload.ts       # Electron preload script
│   ├── renderer.tsx     # React frontend
│   └── renderer.css     # Styles
├── dist/                # Built application
├── electron-builder.json # Build configuration
├── electron.vite.config.ts # Vite configuration
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
└── .env                 # Environment variables
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Google AI Studio](https://aistudio.google.com/) - Get your Gemini API key
- [Electron Documentation](https://www.electronjs.org/docs)
- [React Documentation](https://react.dev/)

## ⚠️ Troubleshooting

### Common Issues

**Audio not working**: Ensure your microphone permissions are granted and the device is not being used by another application.

**API errors**: Verify your Gemini API key is valid and has sufficient quota.

**Build failures**: Make sure all dependencies are installed and Node.js version is 18+.

### Getting Help

- Check the [Issues](../../issues) page for known problems
- Create a new issue if you encounter a bug
- Contribute to discussions in the [Discussions](../../discussions) section

---

Built with ❤️ using modern web technologies and AI
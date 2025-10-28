# Video to Text - YouTube Transcription App

A complete video-to-text application that can process local video/audio files and YouTube videos, with AI-powered transcription and summarization.

## ✨ Features

- 📹 **Video Processing**: Upload and process video files (MP4, MOV, AVI, etc.)
- 🎵 **Audio Processing**: Direct audio file upload (MP3, WAV, etc.)  
- 🎬 **YouTube Integration**: Extract audio from YouTube videos for transcription
- 🤖 **AI Transcription**: Powered by Google Gemini AI
- 📝 **AI Summarization**: Generate intelligent summaries of transcribed content
- 🌐 **Network-Aware**: Handles offline scenarios gracefully
- ⚡ **Fast Processing**: Optimized for performance with progress tracking

## 🚀 Production Deployment

### Recommended: Split Deployment

**Frontend → Vercel** ✅
```bash
npm i -g vercel
vercel
# Set in Vercel dashboard:
# VITE_API_URL=https://your-backend.railway.app
```

**Backend → Railway** ✅
```bash
# Connect repo to Railway
# Auto-deploys Python Flask app
# FFmpeg included, no timeouts
```

### Environment Variables

**Vercel (Frontend):**
- `VITE_GEMINI_API_KEY`: Your Google Gemini API key
- `VITE_API_URL`: Your backend URL (Railway app URL)

**Railway (Backend):**
- `PORT`: Auto-set by Railway
- `FLASK_ENV`: production
- Download transcription as a text file
- Support for various video formats
- Browser-based processing (no server required)

## Technologies Used

- React 18
- FFmpeg.wasm for video processing
- Google Generative AI (Gemini) for transcription
- Vite for build tooling

## Demo
<img width="987" height="625" alt="Screenshot 2025-10-17 at 12 12 30 PM" src="https://github.com/user-attachments/assets/8f3bb3b7-5269-44b6-a2dc-3e46d82a4dc5" />
<img width="999" height="621" alt="Screenshot 2025-10-17 at 12 12 37 PM" src="https://github.com/user-attachments/assets/bf221cd9-0f9d-4c00-90fd-8ba4d7991907" />
<img width="935" height="640" alt="Screenshot 2025-10-17 at 12 13 45 PM" src="https://github.com/user-attachments/assets/6f790267-f8e0-4ca2-a760-afd31caff772" />
<img width="1041" height="640" alt="Screenshot 2025-10-17 at 12 13 51 PM" src="https://github.com/user-attachments/assets/96bacd9f-40f7-4cbf-937f-8c38ec038f10" />


## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- A Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/xshirl1027/video-to-text.git
cd video-to-text
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```
Then edit the `.env` file and replace `your_actual_gemini_api_key_here` with your actual Gemini API key.

4. Start the development server:
```bash
npm run dev
```

**Alternative clean start** (kills any existing processes first):
```bash
npm run dev:clean
# OR
./start-clean.sh
```

**To stop the server:**
```bash
npm run stop
# OR
Ctrl+C in the terminal running the server
```

5. Open your browser and navigate to `http://localhost:5173`

### Usage

1. Make sure your Gemini API key is configured in the `.env` file
2. Select a video file (recommended: under 50MB)
3. Click "Convert to Text" to start the process
4. Wait for the conversion and transcription to complete
5. Download the transcription as a text file

## File Size Recommendations & Troubleshooting

### Recommended File Sizes
- **✅ Small files (< 5MB)**: Fast processing, best experience
- **💡 Medium files (5-10MB)**: Good processing speed (2-5 minutes)
- **⚠️ Large files (10-20MB)**: Slower processing, may take 5-15 minutes
- **❌ Very large files (> 20MB)**: May cause memory errors or "Maximum call stack size exceeded"

### Common Issues and Solutions

#### "Network error: Please check your internet connection and try again"
This error can occur for several reasons. Try these solutions in order:

1. **Check internet connectivity**:
   - Verify you have a stable internet connection
   - Try visiting other websites to confirm connectivity
   - Use the "Test Network" button in the app for diagnostics

2. **Browser-specific solutions**:
   - **Clear browser cache and cookies** for the site
   - **Disable browser extensions** (especially ad blockers, VPNs)
   - **Try incognito/private browsing mode**
   - **Switch browsers** (Chrome and Firefox work best)

3. **Network configuration**:
   - **Disable VPN** temporarily if using one
   - **Check firewall settings** - ensure it's not blocking the app
   - **Try different network** (mobile hotspot, different WiFi)

4. **API-specific issues**:
   - **Verify Gemini API key** is correct and active
   - **Check API quotas** in Google AI Studio
   - **Ensure API key has proper permissions**

5. **CDN and resource loading**:
   - The app loads FFmpeg from external CDNs (unpkg, jsDelivr)
   - **Corporate networks** may block these resources
   - **Try refreshing the page** multiple times

**📋 For detailed network troubleshooting, see [NETWORK_TROUBLESHOOTING.md](NETWORK_TROUBLESHOOTING.md)**

#### "Maximum call stack size exceeded" Error
This error typically occurs with large video files (> 10MB). Here are solutions:

1. **Reduce file size**: Use video editing software to:
   - Trim the video to shorter segments (recommended: < 5 minutes)
   - Reduce video resolution (720p or lower)
   - Compress the video with lower bitrate

2. **Browser optimization**:
   - Close other tabs and applications
   - Refresh the page before processing large files
   - Use Chrome or Firefox (better WebAssembly performance)
   - Ensure you have at least 4GB RAM available

3. **Processing in chunks**:
   - For long videos, split them into smaller segments
   - Process each segment separately
   - Combine transcriptions manually if needed

#### Memory Issues
- Clear browser cache and cookies
- Close unnecessary browser tabs
- Restart the browser
- Use Incognito/Private mode for clean memory state

#### Slow Processing
- Check internet connection stability
- Ensure sufficient system resources
- Consider processing during off-peak hours

### Technical Limitations

- **Gemini API**: 20MB limit for audio files
- **Browser memory**: Varies by device (4GB+ RAM recommended)
- **WebAssembly**: Performance depends on browser and system specs

## Browser Requirements

- Modern browser with WebAssembly support
- Sufficient RAM (recommended: 4GB+ for large files)
- Stable internet connection for API calls

## API Key Setup

### Environment Configuration

This application uses environment variables to store the Gemini API key securely.

1. **Get your API key**: Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. **Sign in** with your Google account
3. **Create a new API key**
4. **Copy the `.env.example` file** to `.env`:
   ```bash
   cp .env.example .env
   ```
5. **Edit the `.env` file** and replace `your_actual_gemini_api_key_here` with your actual API key
6. **Restart the development server** if it's already running

### Security Notes

- The `.env` file is automatically ignored by Git (listed in `.gitignore`)
- Never commit your actual API key to version control
- The API key is only used in the browser for direct API calls to Gemini
- In production, consider using a backend server to secure the API key

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## License

This project is licensed under the ISC License.

## Supported Video Formats

The application supports most common video formats including:
- MP4
- AVI
- MOV
- MKV
- WebM
- And many others supported by FFmpeg

## Technical Details

### Technologies Used

- **React 18**: Modern React with hooks
- **Vite**: Fast build tool and development server
- **FFmpeg.wasm**: Client-side video processing
- **Google Generative AI**: Gemini AI for transcription
- **CSS3**: Modern styling with gradients and animations

### Architecture

1. **File Upload**: Users select video files through a styled file input
2. **Video Processing**: FFmpeg.wasm converts video to MP3 in the browser
3. **AI Transcription**: Audio is sent to Gemini AI for text conversion
4. **Download**: Transcribed text is offered as a downloadable TXT file

### Security Considerations

- API keys are stored only in browser memory (not persisted)
- All video processing happens client-side
- Only audio data is sent to Gemini AI
- No server-side storage of user files

## Browser Compatibility

The app requires a modern browser that supports:
- WebAssembly (for FFmpeg.wasm)
- ES6+ JavaScript features
- Cross-Origin-Embedder-Policy headers

Recommended browsers:
- Chrome 88+
- Firefox 89+
- Safari 15.2+
- Edge 88+

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Project Structure

```
src/
  ├── App.jsx          # Main application component
  ├── App.css          # Application styles
  ├── main.jsx         # React app entry point
  └── index.css        # Global styles
```

## Limitations

- Maximum video file size depends on browser memory
- Processing time varies based on video length and device performance
- Gemini AI has usage limits (check your API quota)
- Large videos may take several minutes to process

## Troubleshooting

### Common Issues

1. **FFmpeg fails to load**: Ensure your browser supports WebAssembly and COOP/COEP headers
2. **API key errors**: Verify your Gemini API key is valid and has quota remaining
3. **Large file issues**: Try with smaller video files first
4. **Browser crashes**: Close other tabs to free up memory

### Error Messages

- "Please select a valid video file": Only video files are supported
- "Please provide a Gemini API key": Enter a valid API key
- "Error processing video": Check browser console for detailed errors

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Commit your changes: `git commit -am 'Add feature'`
5. Push to the branch: `git push origin feature-name`
6. Submit a pull request

## License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [FFmpeg.wasm](https://ffmpegwasm.netlify.app/) for client-side video processing
- [Google Generative AI](https://ai.google.dev/) for transcription capabilities
- [React](https://reactjs.org/) for the UI framework
- [Vite](https://vitejs.dev/) for the build system

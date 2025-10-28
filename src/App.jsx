import React, { useState, useRef, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import './App.css';

function App() {
  // API Configuration
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002';
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [transcriptionText, setTranscriptionText] = useState('');
  const [summaryText, setSummaryText] = useState('');
  const [networkStatus, setNetworkStatus] = useState('online'); // online, offline, testing
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isAudioFile, setIsAudioFile] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isProcessingYoutube, setIsProcessingYoutube] = useState(false);
  const [youtubeDownloadData, setYoutubeDownloadData] = useState(null); // Store download info
  const ffmpegRef = useRef(new FFmpeg());
  const messageRef = useRef(null);

  // Get API key from environment variables
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const isDevelopment = import.meta.env.VITE_APP_ENV === 'development';

  // Log API key status in development
  useEffect(() => {
    if (isDevelopment) {
      console.log('Environment check:');
      console.log('- API Key configured:', !!apiKey && apiKey !== 'your_api_key_here');
      console.log('- API Key length:', apiKey?.length || 0);
      console.log('- Environment:', import.meta.env.VITE_APP_ENV);
    }
  }, [apiKey, isDevelopment]);

  // Memory monitoring and cleanup
  useEffect(() => {
    const checkMemoryUsage = () => {
      if (performance.memory) {
        const memoryInfo = performance.memory;
        const usedMB = memoryInfo.usedJSHeapSize / 1024 / 1024;
        const limitMB = memoryInfo.jsHeapSizeLimit / 1024 / 1024;
        
        console.log(`Memory: ${usedMB.toFixed(2)}MB / ${limitMB.toFixed(2)}MB`);
        
        // Warn if memory usage is high
        if (usedMB > limitMB * 0.8) {
          console.warn('High memory usage detected. Consider refreshing the page.');
        }
      }
    };

    // Monitor network status
    const handleOnline = () => setNetworkStatus('online');
    const handleOffline = () => setNetworkStatus('offline');
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const interval = setInterval(checkMemoryUsage, 30000); // Check every 30 seconds
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Network connectivity test with browser-specific handling
  const testNetworkConnectivity = async () => {
    try {
      setNetworkStatus('testing');
      setCurrentStep('Testing network connectivity...');
      
      // Test basic internet connectivity first
      console.log('🔍 Starting network connectivity tests...');
      
      // Test 1: Use a simpler approach that works better with restrictive networks
      try {
        // Try with a simpler endpoint and longer timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const basicTest = await fetch('https://httpbin.org/get', { 
          method: 'GET',
          signal: controller.signal,
          mode: 'cors',
          headers: {
            'Accept': 'application/json',
          }
        });
        
        clearTimeout(timeoutId);
        
        if (basicTest.ok) {
          console.log('✅ Basic internet connectivity: OK');
        } else {
          throw new Error(`HTTP ${basicTest.status}`);
        }
      } catch (error) {
        console.log('❌ Basic internet connectivity failed:', error.message);
        
        // Try alternative endpoint
        try {
          const fallbackTest = await fetch('https://jsonplaceholder.typicode.com/posts/1', {
            method: 'GET',
            signal: AbortSignal.timeout(8000),
            mode: 'cors'
          });
          
          if (fallbackTest.ok) {
            console.log('✅ Fallback connectivity test: OK');
          } else {
            throw new Error('All connectivity tests failed');
          }
        } catch (fallbackError) {
          console.log('❌ Fallback test also failed:', fallbackError.message);
          throw new Error(`Network connectivity failed. Your browser may be blocking requests due to security settings, firewall, or VPN interference. Error: ${error.message}`);
        }
      }
      
      // Test 2: CDN connectivity with better error handling
      const cdnResults = [];
      const testEndpoints = [
        { name: 'unpkg', url: 'https://unpkg.com/@ffmpeg/core@0.12.6/package.json' },
        { name: 'jsDelivr', url: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/package.json' }
      ];
      
      let cdnWorking = false;
      
      for (const endpoint of testEndpoints) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);
          
          const response = await fetch(endpoint.url, { 
            method: 'GET',
            signal: controller.signal,
            mode: 'cors'
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            console.log(`✅ ${endpoint.name} CDN: ${response.status}`);
            cdnResults.push({ name: endpoint.name, success: true, status: response.status });
            cdnWorking = true;
          } else {
            throw new Error(`HTTP ${response.status}`);
          }
        } catch (error) {
          console.log(`❌ ${endpoint.name} CDN failed:`, error.message);
          cdnResults.push({ name: endpoint.name, success: false, error: error.message });
        }
      }
      
      if (!cdnWorking) {
        throw new Error('CDN connectivity failed. This is likely due to browser security restrictions, firewall settings, or VPN interference blocking external resource loading.');
      }
      
      // Test 3: Gemini API connectivity (if API key is available)
      if (apiKey && apiKey !== 'your_api_key_here') {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);
          
          const geminiTest = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
            method: 'GET',
            headers: {
              'x-goog-api-key': apiKey
            },
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (geminiTest.ok) {
            console.log('✅ Gemini API connectivity: OK');
          } else {
            console.log(`⚠️ Gemini API returned: ${geminiTest.status} ${geminiTest.statusText}`);
          }
        } catch (error) {
          console.log('❌ Gemini API connectivity failed:', error.message);
          // Don't throw here as this might be an API key issue, not network
        }
      }
      
      setNetworkStatus('online');
      setCurrentStep('Network connectivity verified.');
      console.log('🎉 Network connectivity tests completed successfully');
      return true;
      
    } catch (error) {
      console.error('🚨 Network connectivity test failed:', error);
      setNetworkStatus('offline');
      
      // Provide specific guidance based on the error
      let errorMessage = 'Network connectivity test failed.\n\n';
      
      if (error.message.includes('timeout') || error.message.includes('signal timed out')) {
        errorMessage += 'Issue: Browser requests are timing out.\n\n';
        errorMessage += 'This is usually caused by:\n';
        errorMessage += '• Firewall blocking browser requests\n';
        errorMessage += '• VPN interfering with browser traffic\n';
        errorMessage += '• macOS security settings\n';
        errorMessage += '• Corporate network restrictions\n\n';
        errorMessage += 'Solutions:\n';
        errorMessage += '• Temporarily disable VPN/proxy\n';
        errorMessage += '• Try using different browser\n';
        errorMessage += '• Check macOS firewall settings\n';
        errorMessage += '• Try mobile hotspot to bypass network restrictions';
      } else if (error.message.includes('blocked') || error.message.includes('CORS')) {
        errorMessage += 'Issue: Browser security is blocking requests.\n\n';
        errorMessage += 'Solutions:\n';
        errorMessage += '• Try incognito/private browsing mode\n';
        errorMessage += '• Disable browser extensions\n';
        errorMessage += '• Clear browser cache and cookies\n';
        errorMessage += '• Try different browser (Chrome/Firefox)';
      } else {
        errorMessage += error.message;
      }
      
      throw new Error(errorMessage);
    }
  };

  // Comprehensive network diagnostics
  const runComprehensiveNetworkDiagnostics = async () => {
    console.log('🔬 Starting comprehensive network diagnostics...');
    console.log('='.repeat(50));
    
    // Browser and environment info
    console.log('🌐 Browser Information:');
    console.log('- User Agent:', navigator.userAgent);
    console.log('- Online Status:', navigator.onLine);
    console.log('- Connection Type:', navigator.connection?.effectiveType || 'unknown');
    console.log('- Downlink Speed:', navigator.connection?.downlink || 'unknown', 'Mbps');
    console.log('- API Key Configured:', !!apiKey && apiKey !== 'your_api_key_here');
    console.log('');
    
    // Test different protocols and endpoints
    const diagnosticTests = [
      {
        name: 'Basic HTTP Test',
        url: 'https://httpbin.org/status/200',
        method: 'GET',
        timeout: 5000
      },
      {
        name: 'CORS Test',
        url: 'https://httpbin.org/headers',
        method: 'GET',
        timeout: 5000,
        mode: 'cors'
      },
      {
        name: 'unpkg CDN',
        url: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js',
        method: 'HEAD',
        timeout: 10000
      },
      {
        name: 'jsDelivr CDN',
        url: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js',
        method: 'HEAD',
        timeout: 10000
      },
      {
        name: 'Google DNS',
        url: 'https://dns.google/resolve?name=google.com&type=A',
        method: 'GET',
        timeout: 5000
      }
    ];
    
    for (const test of diagnosticTests) {
      try {
        const startTime = Date.now();
        const response = await fetch(test.url, {
          method: test.method,
          signal: AbortSignal.timeout(test.timeout),
          mode: test.mode || 'no-cors'
        });
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log(`✅ ${test.name}: ${response.status} (${duration}ms)`);
      } catch (error) {
        console.log(`❌ ${test.name}: ${error.message}`);
      }
    }
    
    // Test Gemini API if key is available
    if (apiKey && apiKey !== 'your_api_key_here') {
      try {
        console.log('🤖 Testing Gemini API...');
        const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
          headers: { 'x-goog-api-key': apiKey },
          signal: AbortSignal.timeout(10000)
        });
        
        if (geminiResponse.ok) {
          console.log('✅ Gemini API: Authentication successful');
        } else {
          const errorText = await geminiResponse.text();
          console.log(`❌ Gemini API: ${geminiResponse.status} - ${errorText}`);
        }
      } catch (error) {
        console.log(`❌ Gemini API: ${error.message}`);
      }
    } else {
      console.log('⚠️ Gemini API: No valid API key configured');
    }
    
    console.log('='.repeat(50));
    console.log('🔬 Diagnostics completed. Check the results above.');
  };

  // Utility function to prevent stack overflow by breaking execution into chunks
  const asyncChunkProcessor = (fn) => {
    return (...args) => new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          const result = fn.apply(this, args);
          if (result instanceof Promise) {
            result.then(resolve).catch(reject);
          } else {
            resolve(result);
          }
        } catch (error) {
          reject(error);
        }
      }, 0);
    });
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('video/')) {
      alert('Please select a valid video file.');
      return;
    }
    
    // Reduced max file size to prevent memory issues and stack overflow
    const maxSizeMB = 50;
    const fileSizeMB = file.size / 1024 / 1024;
    
    if (fileSizeMB > maxSizeMB) {
      alert(`File is too large (${fileSizeMB.toFixed(1)}MB). Please select a file smaller than ${maxSizeMB}MB to prevent memory issues and ensure stable processing.`);
      return;
    }
    
    if (fileSizeMB > 20) {
      const proceed = confirm(`This is a large file (${fileSizeMB.toFixed(1)}MB). Processing may take several minutes and use significant memory. For files over 10MB, we recommend using shorter video clips to prevent errors. Do you want to continue?`);
      if (!proceed) return;
    }
    
    setSelectedFile(file);
    setIsAudioFile(false);
    setTranscriptionText('');
  };

  const handleAudioUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.onchange = (event) => {
      const file = event.target.files[0];
      if (!file) return;
      
      if (!file.type.startsWith('audio/')) {
        alert('Please select a valid audio file (MP3, WAV, etc.).');
        return;
      }
      
      const maxSizeMB = 25;
      const fileSizeMB = file.size / 1024 / 1024;
      
      if (fileSizeMB > maxSizeMB) {
        alert(`Audio file is too large (${fileSizeMB.toFixed(1)}MB). Please select a file smaller than ${maxSizeMB}MB.`);
        return;
      }
      
      setSelectedFile(file);
      setIsAudioFile(true);
      setTranscriptionText('');
    };
    input.click();
  };

  const handleYouTubeProcess = async () => {
    if (!youtubeUrl.trim()) {
      alert('Please enter a YouTube URL');
      return;
    }

    try {
      setIsProcessingYoutube(true);
      setCurrentStep('Extracting audio from YouTube video...');
      setTranscriptionText('');
      setSummaryText('');
      setSelectedFile(null);
      setIsAudioFile(false);

      // Call Flask API to extract audio
      const response = await fetch(`${API_BASE_URL}/api/extract-audio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: youtubeUrl.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to extract audio from YouTube video');
      }

      const data = await response.json();
      setCurrentStep('YouTube audio extracted successfully! Starting transcription...');

      // Download the audio file
      const audioResponse = await fetch(`${API_BASE_URL}/api/download-audio/${data.request_id}/${data.audio_filename}`);
      if (!audioResponse.ok) {
        throw new Error('Failed to download extracted audio');
      }

      const audioBlob = await audioResponse.blob();
      // Use the video title for better UX, fallback to filename
      const displayName = data.metadata?.title || data.audio_filename || 'YouTube Audio';
      const audioFile = new File([audioBlob], displayName, { type: 'audio/mpeg' });

      // Store download data for later use
      setYoutubeDownloadData({
        filename: data.audio_filename,
        title: data.metadata?.title || displayName,
        blob: audioBlob,
        requestId: data.request_id
      });

      // Set the audio file for transcription
      setSelectedFile(audioFile);
      setIsAudioFile(true);
      
      setCurrentStep('Ready to transcribe. Processing...');
      
      // Auto-start transcription
      setTimeout(() => {
        transcribeAudio(audioFile);
      }, 500);

    } catch (error) {
      console.error('YouTube processing error:', error);
      alert(`Error processing YouTube video: ${error.message}`);
      setCurrentStep('');
    } finally {
      setIsProcessingYoutube(false);
    }
  };

  const handleDownloadYouTubeAudio = () => {
    if (!youtubeDownloadData || !youtubeDownloadData.blob) {
      alert('No YouTube audio file available for download');
      return;
    }

    try {
      // Create download URL and trigger download
      const url = URL.createObjectURL(youtubeDownloadData.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = youtubeDownloadData.filename || `${youtubeDownloadData.title}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download the audio file');
    }
  };

  const loadFFmpeg = async () => {
    const ffmpeg = ffmpegRef.current;
    
    if (!ffmpeg.loaded) {
      // Browser-friendly CDN sources with fallbacks
      const cdnSources = [
        {
          name: 'unpkg',
          baseURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm',
          testURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/package.json'
        },
        {
          name: 'jsDelivr',
          baseURL: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm',
          testURL: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/package.json'
        }
      ];
      
      ffmpeg.on('log', ({ message }) => {
        if (messageRef.current) {
          messageRef.current.innerHTML = message;
        }
      });
      
      let lastError = null;
      let loadedSuccessfully = false;
      
      for (const source of cdnSources) {
        try {
          setCurrentStep(`Testing ${source.name} CDN availability...`);
          console.log(`🔄 Testing ${source.name} CDN...`);
          
          // Test CDN availability with a smaller file first
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000);
          
          const testResponse = await fetch(source.testURL, { 
            method: 'GET',
            signal: controller.signal,
            mode: 'cors'
          });
          
          clearTimeout(timeoutId);
          
          if (!testResponse.ok) {
            throw new Error(`${source.name} CDN test failed with status: ${testResponse.status}`);
          }
          
          console.log(`✅ ${source.name} CDN is accessible`);
          setCurrentStep(`Loading FFmpeg from ${source.name}...`);
          
          // Now try to load the actual FFmpeg files
          const coreURL = `${source.baseURL}/ffmpeg-core.js`;
          const wasmURL = `${source.baseURL}/ffmpeg-core.wasm`;
          
          console.log(`📦 Creating blob URLs for ${source.name}...`);
          
          // Load files with better error handling
          const [coreBlobURL, wasmBlobURL] = await Promise.all([
            toBlobURL(coreURL, 'text/javascript').catch(err => {
              throw new Error(`Failed to load core JS: ${err.message}`);
            }),
            toBlobURL(wasmURL, 'application/wasm').catch(err => {
              throw new Error(`Failed to load WASM: ${err.message}`);
            })
          ]);
          
          console.log(`� Initializing FFmpeg with ${source.name} resources...`);
          setCurrentStep(`Initializing FFmpeg...`);
          
          // Initialize FFmpeg with timeout protection
          const loadPromise = ffmpeg.load({ 
            coreURL: coreBlobURL, 
            wasmURL: wasmBlobURL 
          });
          
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('FFmpeg initialization timeout')), 30000)
          );
          
          await Promise.race([loadPromise, timeoutPromise]);
          
          console.log(`🎉 FFmpeg loaded successfully from: ${source.name}`);
          setCurrentStep(`FFmpeg ready from ${source.name}`);
          loadedSuccessfully = true;
          break; // Success, exit the loop
          
        } catch (error) {
          console.warn(`❌ Failed to load FFmpeg from ${source.name}:`, error.message);
          lastError = error;
          
          // If this is the last CDN and we haven't loaded successfully
          if (source === cdnSources[cdnSources.length - 1] && !loadedSuccessfully) {
            // Provide detailed error information with browser-specific guidance
            const errorDetails = {
              message: error.message,
              network: navigator.onLine ? 'online' : 'offline',
              connection: navigator.connection?.effectiveType || 'unknown',
              userAgent: navigator.userAgent.includes('Chrome') ? 'Chrome' : 
                         navigator.userAgent.includes('Firefox') ? 'Firefox' : 
                         navigator.userAgent.includes('Safari') ? 'Safari' : 'Other',
              timestamp: new Date().toISOString()
            };
            
            console.error('🚨 All CDN sources failed:', errorDetails);
            
            let troubleshootingGuide = `Failed to load FFmpeg from all CDN sources.\n\n`;
            troubleshootingGuide += `Environment Details:\n`;
            troubleshootingGuide += `• Network Status: ${errorDetails.network}\n`;
            troubleshootingGuide += `• Connection Type: ${errorDetails.connection}\n`;
            troubleshootingGuide += `• Browser: ${errorDetails.userAgent}\n`;
            troubleshootingGuide += `• Last Error: ${error.message}\n\n`;
            
            troubleshootingGuide += `This error typically indicates browser security restrictions.\n\n`;
            
            troubleshootingGuide += `Quick Fixes to Try:\n`;
            troubleshootingGuide += `1. DISABLE VPN/PROXY temporarily\n`;
            troubleshootingGuide += `2. Try INCOGNITO/PRIVATE browsing mode\n`;
            troubleshootingGuide += `3. DISABLE browser extensions (especially ad blockers)\n`;
            troubleshootingGuide += `4. CLEAR browser cache and cookies\n`;
            troubleshootingGuide += `5. Try a DIFFERENT BROWSER (Chrome recommended)\n`;
            troubleshootingGuide += `6. Use MOBILE HOTSPOT to bypass network restrictions\n\n`;
            
            if (errorDetails.userAgent === 'Safari') {
              troubleshootingGuide += `Safari-specific fixes:\n`;
              troubleshootingGuide += `• Disable "Prevent cross-site tracking" in Privacy settings\n`;
              troubleshootingGuide += `• Try Chrome or Firefox instead\n\n`;
            }
            
            troubleshootingGuide += `If none of these work, the issue is likely:\n`;
            troubleshootingGuide += `• Corporate firewall blocking WebAssembly/CDN resources\n`;
            troubleshootingGuide += `• macOS security settings blocking browser requests\n`;
            troubleshootingGuide += `• ISP or network-level restrictions`;
            
            throw new Error(troubleshootingGuide);
          }
          
          // Continue to next CDN
          continue;
        }
      }
    }
  };

  const convertToMp3 = async (videoFile) => {
    const ffmpeg = ffmpegRef.current;
    
    setCurrentStep('Loading video file...');
    
    try {
      // Break up the file loading into chunks to prevent stack overflow
      const fileData = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => setTimeout(() => resolve(reader.result), 0);
        reader.onerror = () => reject(new Error('Failed to read video file'));
        reader.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentLoaded = Math.round((event.loaded / event.total) * 100);
            setCurrentStep(`Loading video file... ${percentLoaded}%`);
          }
        };
        reader.readAsArrayBuffer(videoFile);
      });

      setCurrentStep('Writing video to FFmpeg...');
      await ffmpeg.writeFile('input.mp4', new Uint8Array(fileData));
      
      setCurrentStep('Converting video to MP3 (this may take a while)...');
      
      // Use optimized settings for smaller output and faster processing
      await ffmpeg.exec([
        '-i', 'input.mp4',
        '-vn',                    // No video
        '-acodec', 'mp3',         // MP3 codec
        '-ab', '48k',             // Even lower bitrate to reduce file size
        '-ar', '16000',           // Lower sample rate (sufficient for speech recognition)
        '-ac', '1',               // Mono audio (reduces size by ~50%)
        '-map_metadata', '-1',    // Remove metadata to reduce size
        '-threads', '1',          // Use single thread to reduce memory usage
        'output.mp3'
      ]);
      
      setCurrentStep('Reading converted audio...');
      const data = await ffmpeg.readFile('output.mp3');
      
      // Clean up input file to free memory immediately
      await ffmpeg.deleteFile('input.mp4').catch(() => {});
      
      // Create blob with proper error handling
      const audioBlob = new Blob([data.buffer], { type: 'audio/mp3' });
      
      // Log the conversion results
      const originalSizeMB = videoFile.size / 1024 / 1024;
      const convertedSizeMB = audioBlob.size / 1024 / 1024;
      console.log(`Conversion complete: ${originalSizeMB.toFixed(2)}MB video → ${convertedSizeMB.toFixed(2)}MB audio`);
      
      return audioBlob;
    } catch (error) {
      console.error('FFmpeg conversion error:', error);
      
      // Clean up on error
      try {
        await ffmpeg.deleteFile('input.mp4').catch(() => {});
        await ffmpeg.deleteFile('output.mp3').catch(() => {});
      } catch (cleanupError) {
        console.warn('Cleanup error:', cleanupError);
      }
      
      throw new Error(`Video conversion failed: ${error.message}`);
    }
  };

  const transcribeWithGemini = async (audioBlob) => {
    if (!apiKey) {
      throw new Error('Please provide a Gemini API key');
    }

    if (!apiKey.trim() || apiKey.length < 10) {
      throw new Error('Invalid API key. Please check your Gemini API key format.');
    }

    setCurrentStep('Transcribing audio with Gemini AI...');
    
    try {
      // Test API key validity first
      const genAI = new GoogleGenerativeAI(apiKey.trim());
      
      // Safety settings to allow all content including violence and sexual content
      const safetySettings = [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ];
      
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        safetySettings: safetySettings
      });

      // Convert blob to base64 using chunked processing to avoid stack overflow
      const base64Audio = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = () => {
          try {
            // Use setTimeout to break the call stack and prevent stack overflow
            setTimeout(() => {
              try {
                // Remove the data URL prefix (data:audio/mp3;base64,)
                const base64 = reader.result.split(',')[1];
                if (!base64 || base64.length === 0) {
                  throw new Error('Failed to convert audio to base64');
                }
                resolve(base64);
              } catch (error) {
                reject(new Error(`Base64 conversion failed: ${error.message}`));
              }
            }, 0);
          } catch (error) {
            reject(new Error(`File reading failed: ${error.message}`));
          }
        };
        
        reader.onerror = () => {
          reject(new Error('File reading failed'));
        };
        
        // Add progress tracking for large files
        reader.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentLoaded = Math.round((event.loaded / event.total) * 100);
            setCurrentStep(`Converting audio to base64... ${percentLoaded}%`);
          }
        };
        
        reader.readAsDataURL(audioBlob);
      });

      setCurrentStep('Sending to Gemini AI for transcription...');

      const prompt = "Please transcribe the following audio file to text with timestamps. Format the output as: [MM:SS] spoken text. For example: [00:15] Hello, welcome to this video. [00:22] Today we'll be discussing... Provide accurate timestamps for each segment of speech.";
      
      // Add timeout for API call
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Gemini API request timeout (60 seconds)')), 60000)
      );
      
      const transcriptionPromise = model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: "audio/mp3",
            data: base64Audio
          }
        }
      ]);
      
      const result = await Promise.race([transcriptionPromise, timeoutPromise]);
      const response = await result.response;
      const text = response.text();
      
      if (!text || text.trim().length === 0) {
        throw new Error('Gemini API returned empty transcription. The audio might be too quiet or contain no speech.');
      }
      
      return text;
      
    } catch (error) {
      console.error('Gemini API error:', error);
      
      // Provide specific error messages for different scenarios
      if (error.message.includes('API key')) {
        throw new Error('Invalid API key. Please check your Gemini API key and try again.');
      } else if (error.message.includes('quota') || error.message.includes('limit')) {
        throw new Error('API quota exceeded. You have reached your Gemini API usage limit.');
      } else if (error.message.includes('timeout')) {
        throw new Error('Request timeout. The transcription took too long. Try with a shorter audio file.');
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        throw new Error('Network error connecting to Gemini API. Please check your internet connection and try again.');
      } else if (error.message.includes('CORS')) {
        throw new Error('Network security error. Please refresh the page and try again.');
      } else {
        throw new Error(`Transcription failed: ${error.message}`);
      }
    }
  };

  // Parse and format timestamped transcription
  const formatTranscription = (text) => {
    if (!text) return '';
    
    // Split by timestamp pattern [MM:SS] or [M:SS]
    const timestampRegex = /(\[\d{1,2}:\d{2}\])/g;
    const parts = text.split(timestampRegex);
    
    const formatted = [];
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].match(timestampRegex)) {
        // This is a timestamp
        if (i + 1 < parts.length && parts[i + 1].trim()) {
          formatted.push({
            timestamp: parts[i],
            text: parts[i + 1].trim()
          });
        }
      }
    }
    
    return formatted.length > 0 ? formatted : [{ timestamp: '', text }];
  };

  const downloadTextFile = (text, filename = 'transcription.txt') => {
    const element = document.createElement('a');
    const file = new Blob([text], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const summarizeText = async (text) => {
    if (!apiKey || apiKey === 'your_api_key_here') {
      throw new Error('API key not configured for summarization');
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey.trim());
      
      // Safety settings to allow all content including violence and sexual content
      const safetySettings = [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ];
      
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash-exp",
        safetySettings: safetySettings
      });

      const prompt = `Please provide a clear, concise summary of the following transcription. IMPORTANT: Write the summary in the exact same language as the original transcription below. Do not translate or change the language. Focus on the main points, key topics discussed, and important information:

${text}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const summary = response.text();

      if (!summary || summary.trim().length === 0) {
        throw new Error('Failed to generate summary');
      }

      return summary.trim();
    } catch (error) {
      console.error('Summarization error:', error);
      throw new Error(`Summarization failed: ${error.message}`);
    }
  };

  const handleDownloadSummary = async () => {
    if (!transcriptionText) {
      alert('No transcription available to summarize');
      return;
    }

    if (isSummarizing) {
      return; // Prevent multiple simultaneous requests
    }

    try {
      setIsSummarizing(true);
      setCurrentStep('Generating AI summary...');
      const summary = await summarizeText(transcriptionText);
      downloadTextFile(summary, 'transcription-summary.txt');
      setCurrentStep('Summary downloaded successfully!');
      setTimeout(() => setCurrentStep(''), 3000); // Clear message after 3 seconds
    } catch (error) {
      console.error('Summary download error:', error);
      alert(`Failed to generate summary: ${error.message}`);
      setCurrentStep('');
    } finally {
      setIsSummarizing(false);
    }
  };

  const processVideo = async () => {
    if (!selectedFile) {
      alert('Please select a file first.');
      return;
    }

    if (!apiKey || apiKey === 'your_api_key_here') {
      alert('API key not configured. Please check your .env file and add a valid Gemini API key.');
      return;
    }

    setIsLoading(true);
    setTranscriptionText('');
    
    // Handle audio files directly (skip video conversion)
    if (isAudioFile) {
      try {
        setCurrentStep('Processing audio file...');
        const transcription = await transcribeWithGemini(selectedFile);
        setTranscriptionText(transcription);
        setCurrentStep('Audio transcription completed successfully!');
      } catch (error) {
        console.error('Audio processing error:', error);
        setCurrentStep(`Error: ${error.message}`);
        alert(`Audio processing failed: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
      return;
    }
    
    let mp3Blob = null;

    try {
      // Check available memory and warn user
      if (performance.memory && performance.memory.usedJSHeapSize) {
        const memoryUsageMB = performance.memory.usedJSHeapSize / 1024 / 1024;
        console.log(`Current memory usage: ${memoryUsageMB.toFixed(2)}MB`);
        
        if (memoryUsageMB > 100) {
          console.warn('High memory usage detected. Consider refreshing the page before processing large files.');
        }
      }

      // Test network connectivity first
      try {
        await testNetworkConnectivity();
      } catch (networkError) {
        throw new Error(`Network connectivity test failed: ${networkError.message}. Please check your internet connection, disable VPN if using one, and try again.`);
      }

      // Load FFmpeg with timeout to prevent hanging
      setCurrentStep('Loading FFmpeg...');
      const loadPromise = loadFFmpeg();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('FFmpeg loading timeout. Please check your internet connection and try again.')), 45000) // Increased to 45 seconds
      );
      
      await Promise.race([loadPromise, timeoutPromise]);

      // Convert video to MP3 with chunked processing
      setCurrentStep('Starting video conversion...');
      mp3Blob = await convertToMp3(selectedFile);
      
      // Check MP3 size before transcription
      const mp3SizeMB = mp3Blob.size / 1024 / 1024;
      console.log(`Generated MP3 size: ${mp3SizeMB.toFixed(2)}MB`);
      
      if (mp3SizeMB > 20) {
        throw new Error(`Generated audio file is too large (${mp3SizeMB.toFixed(1)}MB). Gemini API has a 20MB limit. Try with a shorter video or reduce the video quality.`);
      }

      // Force garbage collection if available (development only)
      if (window.gc) {
        setCurrentStep('Optimizing memory...');
        window.gc();
      }

      // Add delay to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Transcribe with Gemini
      const transcription = await transcribeWithGemini(mp3Blob);
      
      setTranscriptionText(transcription);
      setCurrentStep('Transcription completed successfully!');
      
    } catch (error) {
      console.error('Error processing video:', error);
      
      // Provide more specific error messages
      if (error.message.includes('Maximum call stack')) {
        alert('Memory error: The file is too large for your browser to process. Please try with a smaller video file (under 5MB) or refresh the page and try again.');
      } else if (error.message.includes('timeout')) {
        alert('Processing timeout: The operation took too long. Please check your internet connection and try with a smaller file or refresh the page.');
      } else if (error.message.includes('Failed to load FFmpeg') || error.message.includes('CDN')) {
        alert('Network error: Unable to load video processing library. Please check your internet connection and try again. If the problem persists, try refreshing the page.');
      } else if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Network error')) {
        alert('Network error: Please check your internet connection and try again. If using a VPN, try disconnecting it temporarily.');
      } else if (error.message.includes('API key') || error.message.includes('Invalid API key')) {
        alert('API key error: Please check your Gemini API key and try again. Make sure it\'s entered correctly.');
      } else if (error.message.includes('quota') || error.message.includes('limit')) {
        alert('API quota exceeded: You have reached your Gemini API usage limit. Please try again later.');
      } else if (error.message.includes('CORS')) {
        alert('Security error: Please refresh the page and try again. This sometimes happens due to browser security restrictions.');
      } else if (error.message.includes('out of memory') || error.message.includes('memory')) {
        alert('Memory error: Please refresh the page and try with a smaller video file.');
      } else {
        alert(`Error: ${error.message}`);
      }
      
      setCurrentStep('Error occurred during processing.');
    } finally {
      // Clean up memory aggressively
      if (mp3Blob) {
        mp3Blob = null;
      }
      
      // Clean up FFmpeg files
      try {
        const ffmpeg = ffmpegRef.current;
        if (ffmpeg.loaded) {
          await ffmpeg.deleteFile('output.mp3').catch(() => {});
        }
      } catch (cleanupError) {
        console.warn('Cleanup warning:', cleanupError);
      }
      
      setIsLoading(false);
    }
  };

  return (
    <div className="app">
      <div className="container">
        <h1>Video to Text Converter</h1>
        <p className="description">
          Upload a video file (converted to MP3) or audio file directly for transcription to text using AI. All languages supported.
        </p>

        {/* API Key Status Indicator */}
        {(!apiKey || apiKey === 'your_api_key_here') && (
          <div className="network-status offline">
            ⚠️ API key not configured. Please check your .env file.
          </div>
        )}

        {/* Network Status Indicator */}
        {networkStatus !== 'online' && (
          <div className={`network-status ${networkStatus}`}>
            {networkStatus === 'offline' && '🔴 No internet connection detected'}
            {networkStatus === 'testing' && '🔍 Testing network connectivity...'}
          </div>
        )}

        <div className="upload-section">
              <div className="file-input-wrapper">
                <input
                  type="file"
                  id="video-upload"
                  accept="video/*"
                  onChange={handleFileSelect}
                  className="file-input"
                />
                <label htmlFor="video-upload" className="file-input-label">
                  {selectedFile && !isAudioFile ? selectedFile.name : 'Choose Video File'}
                </label>
                <button 
                  onClick={handleAudioUpload}
                  className="audio-upload-btn"
                  type="button"
                >
                  Upload Audio Instead
                </button>
              </div>
              
              {selectedFile && (
                <div className="file-info">
                  <p>Selected: {selectedFile.name}</p>
                  <p>Type: {isAudioFile ? 'Audio File' : 'Video File'}</p>
                  <p>Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  {selectedFile.size / 1024 / 1024 > 20 && !isAudioFile && (
                    <p className="size-warning">⚠️ Large files may take longer to process and risk memory errors</p>
                  )}
                  {selectedFile.size / 1024 / 1024 > 15 && isAudioFile && (
                    <p className="size-warning">⚠️ Large audio files may take longer to process</p>
                  )}
                  {selectedFile.size / 1024 / 1024 > 10 && selectedFile.size / 1024 / 1024 <= 20 && !isAudioFile && (
                    <p className="size-info">💡 Processing may take 2-5 minutes</p>
                  )}
                  {selectedFile.size / 1024 / 1024 <= 5 && (
                    <p className="size-good">✅ Good size for fast processing</p>
                  )}
                </div>
              )}

              <button
                onClick={processVideo}
                disabled={!selectedFile || isLoading}
                className="process-btn"
              >
                {isLoading ? 'Processing...' : 'Convert to Text'}
              </button>
            </div>

            <div className="youtube-section">
              <div className="section-divider">
                <span>OR</span>
              </div>
              
              <h3>Process YouTube Video</h3>
              <div className="youtube-input-wrapper">
                <input
                  type="url"
                  placeholder="Enter YouTube URL (e.g., https://youtube.com/watch?v=...)"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  className="youtube-input"
                  disabled={isProcessingYoutube || isLoading}
                />
                <button
                  onClick={handleYouTubeProcess}
                  disabled={!youtubeUrl.trim() || isProcessingYoutube || isLoading}
                  className="youtube-process-btn"
                >
                  {isProcessingYoutube ? 'Processing YouTube Video...' : 'Extract & Transcribe'}
                </button>
              </div>
              
              {isProcessingYoutube && (
                <div className="youtube-processing">
                  <div className="loading-spinner"></div>
                  <p className="processing-text">{currentStep}</p>
                  <p className="processing-note">💡 This may take a few minutes depending on video length</p>
                </div>
              )}

              {youtubeDownloadData && !isProcessingYoutube && (
                <div className="youtube-download-section">
                  <div className="download-success">
                    <h4>✅ YouTube Audio Extracted Successfully!</h4>
                    <p className="video-title">{youtubeDownloadData.title}</p>
                    <button
                      onClick={handleDownloadYouTubeAudio}
                      className="download-btn"
                    >
                      📥 Download Audio File
                    </button>
                  </div>
                </div>
              )}
            </div>

            {isLoading && (
              <div className="loading-section">
                <div className="loading-spinner"></div>
                <p className="loading-text">{currentStep}</p>
                {selectedFile && (
                  <div className="processing-info">
                    <p>Processing: {selectedFile.name}</p>
                    <p>Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    <p className="tip">💡 Larger files may take several minutes to process</p>
                  </div>
                )}
                <div ref={messageRef} className="ffmpeg-log"></div>
              </div>
            )}

            {transcriptionText && (
              <div className="result-section">
                <h3>Transcription Result</h3>
                <div className="transcription-text">
                  {formatTranscription(transcriptionText).map((segment, index) => (
                    <div key={index} className="transcript-segment">
                      {segment.timestamp && (
                        <span className="timestamp">{segment.timestamp}</span>
                      )}
                      <span className="transcript-text">{segment.text}</span>
                    </div>
                  ))}
                </div>
                <div className="download-section">
                  <button
                    onClick={() => downloadTextFile(transcriptionText, 'timestamped-transcription.txt')}
                    className="download-btn"
                  >
                    Download Timestamped Transcript
                  </button>
                  <button
                    onClick={handleDownloadSummary}
                    className={`download-btn summary-btn ${isSummarizing ? 'loading' : ''}`}
                    disabled={isSummarizing}
                  >
                    {isSummarizing ? (
                      <>
                        <span className="spinner"></span>
                        Generating Summary...
                      </>
                    ) : (
                      'Download Summarized Text'
                    )}
                  </button>
                </div>
              </div>
            )}
        </div>
      </div>
    );
  }

export default App;
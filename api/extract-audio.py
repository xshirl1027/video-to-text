from http.server import BaseHTTPRequestHandler
import json
import os
import tempfile
import uuid
import yt_dlp
from urllib.parse import urlparse

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # Set CORS headers
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()
            
            # Read request body
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            url = data.get('url')
            if not url:
                self.wfile.write(json.dumps({'error': 'URL is required'}).encode())
                return
            
            # Validate YouTube URL
            parsed_url = urlparse(url)
            if 'youtube.com' not in parsed_url.netloc and 'youtu.be' not in parsed_url.netloc:
                self.wfile.write(json.dumps({'error': 'Please provide a valid YouTube URL'}).encode())
                return
            
            # Generate request ID and temp directory
            request_id = str(uuid.uuid4())
            temp_dir = tempfile.mkdtemp()
            
            # yt-dlp options for audio extraction
            ydl_opts = {
                'format': 'bestaudio/best',
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '192',
                }],
                'outtmpl': os.path.join(temp_dir, '%(title)s.%(ext)s'),
                'quiet': True,
                'no_warnings': True,
            }
            
            # Extract audio
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                
                # Find the output file
                audio_file = None
                for file in os.listdir(temp_dir):
                    if file.endswith('.mp3'):
                        audio_file = file
                        break
                
                if not audio_file:
                    self.wfile.write(json.dumps({'error': 'Failed to extract audio'}).encode())
                    return
                
                # Prepare response
                response = {
                    'success': True,
                    'request_id': request_id,
                    'audio_filename': audio_file,
                    'temp_path': os.path.join(temp_dir, audio_file),  # For download endpoint
                    'metadata': {
                        'title': info.get('title', ''),
                        'duration': info.get('duration', 0),
                        'uploader': info.get('uploader', ''),
                        'description': info.get('description', ''),
                        'upload_date': info.get('upload_date', ''),
                        'view_count': info.get('view_count', 0)
                    }
                }
                
                self.wfile.write(json.dumps(response).encode())
                return
                
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'error': f'Failed to extract audio: {str(e)}'}).encode())
            return

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        return
#!/usr/bin/env python3
"""
YouTube Audio Extractor API
A simple Flask API that uses yt-dlp to extract audio from YouTube videos
for transcription purposes.
"""

import os
import sys
import tempfile
import shutil
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from yt_dlp import YoutubeDL
import uuid
from urllib.parse import urlparse, parse_qs
import traceback

app = Flask(__name__)
CORS(app)  # Enable CORS for all domains

# Create temporary directory for downloads
TEMP_DIR = os.path.join(tempfile.gettempdir(), 'youtube_audio_extractor')
os.makedirs(TEMP_DIR, exist_ok=True)

def is_valid_youtube_url(url):
    """Check if the URL is a valid YouTube URL"""
    parsed = urlparse(url)
    if parsed.netloc in ['youtube.com', 'www.youtube.com', 'youtu.be', 'm.youtube.com']:
        return True
    return False

def extract_audio_from_youtube(url, output_path):
    """
    Extract audio from YouTube video using yt-dlp
    Returns the path to the extracted audio file and metadata
    """
    try:
        # Configure yt-dlp options for audio extraction
        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': os.path.join(output_path, '%(title)s.%(ext)s'),
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
            'quiet': True,
            'no_warnings': True,
        }

        with YoutubeDL(ydl_opts) as ydl:
            # Extract info first to get metadata
            info = ydl.extract_info(url, download=False)
            
            # Download and extract audio
            ydl.download([url])
            
            # Find the downloaded file (it will have .mp3 extension after post-processing)
            title = info.get('title', 'Unknown Title').replace('/', '_').replace('\\', '_')
            audio_file = None
            
            # Look for the extracted audio file
            for file in os.listdir(output_path):
                if file.endswith('.mp3') and title.replace(' ', '_') in file.replace(' ', '_'):
                    audio_file = os.path.join(output_path, file)
                    break
            
            # If not found by title matching, get the newest .mp3 file
            if not audio_file:
                mp3_files = [f for f in os.listdir(output_path) if f.endswith('.mp3')]
                if mp3_files:
                    # Get the most recently created file
                    mp3_files.sort(key=lambda x: os.path.getctime(os.path.join(output_path, x)), reverse=True)
                    audio_file = os.path.join(output_path, mp3_files[0])
            
            if not audio_file or not os.path.exists(audio_file):
                raise Exception("Audio file not found after extraction")
                
            return {
                'audio_file': audio_file,
                'title': info.get('title', 'Unknown Title'),
                'duration': info.get('duration', 0),
                'uploader': info.get('uploader', 'Unknown'),
                'description': info.get('description', ''),
                'thumbnail': info.get('thumbnail', ''),
                'view_count': info.get('view_count', 0),
                'upload_date': info.get('upload_date', ''),
            }
            
    except Exception as e:
        raise Exception(f"Failed to extract audio: {str(e)}")

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'message': 'YouTube Audio Extractor API is running'
    })

@app.route('/api/extract-audio', methods=['POST'])
def extract_audio():
    """
    Extract audio from YouTube URL
    Expected JSON payload: {"url": "youtube_url"}
    Returns: JSON with audio file info and download URL
    """
    try:
        data = request.get_json()
        if not data or 'url' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing YouTube URL in request body'
            }), 400
        
        url = data['url'].strip()
        
        if not url:
            return jsonify({
                'success': False,
                'error': 'Empty YouTube URL provided'
            }), 400
        
        if not is_valid_youtube_url(url):
            return jsonify({
                'success': False,
                'error': 'Invalid YouTube URL. Please provide a valid YouTube video URL.'
            }), 400
        
        # Create unique directory for this request
        request_id = str(uuid.uuid4())
        request_dir = os.path.join(TEMP_DIR, request_id)
        os.makedirs(request_dir, exist_ok=True)
        
        try:
            print(f"Processing YouTube URL: {url}")
            result = extract_audio_from_youtube(url, request_dir)
            
            # Store the file path in a way we can retrieve it later
            audio_filename = os.path.basename(result['audio_file'])
            
            response_data = {
                'success': True,
                'request_id': request_id,
                'audio_filename': audio_filename,
                'metadata': {
                    'title': result['title'],
                    'duration': result['duration'],
                    'uploader': result['uploader'],
                    'description': result['description'][:500] + '...' if len(result.get('description', '')) > 500 else result.get('description', ''),
                    'view_count': result.get('view_count', 0),
                    'upload_date': result.get('upload_date', ''),
                }
            }
            
            print(f"Successfully extracted audio: {result['title']}")
            return jsonify(response_data)
            
        except Exception as e:
            # Clean up on failure
            if os.path.exists(request_dir):
                shutil.rmtree(request_dir)
            raise e
            
    except Exception as e:
        print(f"Error extracting audio: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/download-audio/<request_id>/<filename>', methods=['GET'])
def download_audio(request_id, filename):
    """
    Download the extracted audio file
    """
    try:
        # Validate request_id format (should be UUID)
        try:
            uuid.UUID(request_id)
        except ValueError:
            return jsonify({'error': 'Invalid request ID'}), 400
        
        file_path = os.path.join(TEMP_DIR, request_id, filename)
        
        if not os.path.exists(file_path):
            return jsonify({'error': 'Audio file not found or expired'}), 404
        
        # Send file and clean up after
        def remove_file():
            try:
                request_dir = os.path.join(TEMP_DIR, request_id)
                if os.path.exists(request_dir):
                    shutil.rmtree(request_dir)
            except:
                pass
        
        # Send the file
        response = send_file(
            file_path,
            as_attachment=False,  # Don't force download, just serve the file
            mimetype='audio/mpeg'
        )
        
        # Set CORS headers
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET'
        
        # Schedule cleanup (note: this runs after the response is sent)
        @response.call_on_close
        def cleanup():
            remove_file()
        
        return response
        
    except Exception as e:
        print(f"Error downloading audio: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/cleanup/<request_id>', methods=['DELETE'])
def cleanup_files(request_id):
    """
    Manually clean up files for a request
    """
    try:
        try:
            uuid.UUID(request_id)
        except ValueError:
            return jsonify({'error': 'Invalid request ID'}), 400
        
        request_dir = os.path.join(TEMP_DIR, request_id)
        if os.path.exists(request_dir):
            shutil.rmtree(request_dir)
            return jsonify({'success': True, 'message': 'Files cleaned up'})
        else:
            return jsonify({'success': True, 'message': 'No files to clean up'})
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Cleanup old files on startup
def cleanup_old_files():
    """Clean up old temporary files"""
    try:
        if os.path.exists(TEMP_DIR):
            for item in os.listdir(TEMP_DIR):
                item_path = os.path.join(TEMP_DIR, item)
                if os.path.isdir(item_path):
                    try:
                        shutil.rmtree(item_path)
                    except:
                        pass
        print("Cleaned up old temporary files")
    except:
        pass

if __name__ == '__main__':
    print("Starting YouTube Audio Extractor API...")
    print("Cleaning up old files...")
    cleanup_old_files()
    
    port = int(os.environ.get('PORT', 5002))
    debug_mode = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    
    print(f"API will be available at: http://localhost:{port}")
    print("Endpoints:")
    print("  GET  /api/health - Health check")
    print("  POST /api/extract-audio - Extract audio from YouTube URL")
    print("  GET  /api/download-audio/<request_id>/<filename> - Download extracted audio")
    
    if debug_mode:
        print("Running in debug mode")
    
    app.run(host='0.0.0.0', port=port, debug=debug_mode, use_reloader=False)
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
TEMP_DIR = os.path.join(tempfile.gettempdir(), 'youtube_video_extractor')
os.makedirs(TEMP_DIR, exist_ok=True)

def is_valid_youtube_url(url):
    """Check if the URL is a valid YouTube URL"""
    parsed = urlparse(url)
    if parsed.netloc in ['youtube.com', 'www.youtube.com', 'youtu.be', 'm.youtube.com']:
        return True
    return False

def extract_video_from_youtube(url, output_path):
    """
    Download video from YouTube using yt-dlp
    Returns the path to the downloaded video file and metadata
    """
    try:
        # Configure yt-dlp options for video download with anti-blocking measures
        ydl_opts = {
            'format': 'best[height<=720][ext=mp4]/best[height<=720]/best[ext=mp4]/best',  # Prefer mp4, max 720p
            'outtmpl': os.path.join(output_path, '%(title).100s.%(ext)s'),  # Limit title length
            'quiet': False,  # Enable logging for debugging
            'no_warnings': False,
            'extract_flat': False,
            'writethumbnail': False,
            'writeinfojson': False,
            # Anti-blocking measures
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'referer': 'https://www.youtube.com/',
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-us,en;q=0.5',
                'Accept-Encoding': 'gzip,deflate',
                'Accept-Charset': 'ISO-8859-1,utf-8;q=0.7,*;q=0.7',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            },
            'cookiefile': None,  # Don't use cookies
            'no_check_certificate': True,
            'ignoreerrors': False,
            'logtostderr': False,
            'socket_timeout': 120,
        }

        with YoutubeDL(ydl_opts) as ydl:
            # Extract info first to get metadata
            info = ydl.extract_info(url, download=False)
            
            # Download video
            ydl.download([url])
            
            # Debug: List all files in the directory
            all_files = os.listdir(output_path)
            print(f"Files in directory after download: {all_files}")
            
            # Find the downloaded file (common video extensions)
            title = info.get('title', 'Unknown Title')
            # Clean title for filename matching
            clean_title = title.replace('/', '_').replace('\\', '_').replace(':', '_').replace('?', '_').replace('*', '_').replace('"', '_').replace('<', '_').replace('>', '_').replace('|', '_')
            video_file = None
            video_extensions = ['.mp4', '.mkv', '.webm', '.avi', '.mov', '.flv', '.m4v']
            
            # Method 1: Look for files with title in name
            for file in all_files:
                if any(file.lower().endswith(ext.lower()) for ext in video_extensions):
                    # Try partial title matching (more flexible)
                    title_words = clean_title.lower().split()[:3]  # First 3 words
                    if any(word in file.lower() for word in title_words if len(word) > 2):
                        video_file = os.path.join(output_path, file)
                        print(f"Found video file by title matching: {file}")
                        break
            
            # Method 2: If not found by title, get the newest video file
            if not video_file:
                video_files = [f for f in all_files if any(f.lower().endswith(ext.lower()) for ext in video_extensions)]
                print(f"Video files found: {video_files}")
                if video_files:
                    # Get the most recently created file
                    video_files.sort(key=lambda x: os.path.getctime(os.path.join(output_path, x)), reverse=True)
                    video_file = os.path.join(output_path, video_files[0])
                    print(f"Using newest video file: {video_files[0]}")
            
            # Method 3: If still not found, check for ANY files but validate they're not web files
            if not video_file:
                other_files = [f for f in all_files if not f.startswith('.') and not f.endswith('.tmp') and not f.endswith('.part')]
                print(f"Other files found: {other_files}")
                
                # Filter out obvious web files
                non_web_files = []
                for file in other_files:
                    file_lower = file.lower()
                    if not any(file_lower.endswith(ext) for ext in ['.html', '.mhtml', '.xml', '.json', '.txt']):
                        non_web_files.append(file)
                
                if non_web_files:
                    video_file = os.path.join(output_path, non_web_files[0])
                    print(f"Using first non-web file: {non_web_files[0]}")
                elif other_files:
                    # Check if we got an MHTML file (indicates blocking)
                    mhtml_files = [f for f in other_files if f.lower().endswith('.mhtml')]
                    if mhtml_files:
                        raise Exception(f"YouTube blocked the download - got webpage ({mhtml_files[0]}) instead of video. This may be due to IP blocking or rate limiting. Try again later or use a different video.")
                    
                    video_file = os.path.join(output_path, other_files[0])
                    print(f"WARNING: Using potentially non-video file: {other_files[0]}")
            
            if not video_file or not os.path.exists(video_file):
                print(f"ERROR: No video file found. Directory contents: {all_files}")
                raise Exception(f"Video file not found after download. Available files: {all_files}")
            
            # Additional validation: Check file size and content
            file_size = os.path.getsize(video_file)
            print(f"Downloaded file size: {file_size} bytes ({file_size / 1024 / 1024:.2f} MB)")
            
            if file_size < 1024:  # Less than 1KB is suspicious
                raise Exception(f"Downloaded file is too small ({file_size} bytes). This likely indicates a download failure or blocking.")
            
            # Check if file might be HTML/MHTML by reading first few bytes
            with open(video_file, 'rb') as f:
                first_bytes = f.read(100)
                if b'<html' in first_bytes.lower() or b'mhtml' in first_bytes.lower():
                    raise Exception("Downloaded file appears to be a webpage, not a video. YouTube may be blocking downloads from this server.")
                
            return {
                'video_file': video_file,
                'title': info.get('title', 'Unknown Title'),
                'duration': info.get('duration', 0),
                'uploader': info.get('uploader', 'Unknown'),
                'description': info.get('description', ''),
                'thumbnail': info.get('thumbnail', ''),
                'view_count': info.get('view_count', 0),
                'upload_date': info.get('upload_date', ''),
            }
            
    except Exception as e:
        raise Exception(f"Failed to download video: {str(e)}")

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'message': 'YouTube Video Downloader API is running'
    })

@app.route('/api/extract-video', methods=['POST'])
def extract_video():
    """
    Download video from YouTube URL
    Expected JSON payload: {"url": "youtube_url"}
    Returns: JSON with video file info and download URL
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
            result = extract_video_from_youtube(url, request_dir)
            
            # Store the file path in a way we can retrieve it later
            video_filename = os.path.basename(result['video_file'])
            
            response_data = {
                'success': True,
                'request_id': request_id,
                'video_filename': video_filename,
                'metadata': {
                    'title': result['title'],
                    'duration': result['duration'],
                    'uploader': result['uploader'],
                    'description': result['description'][:500] + '...' if len(result.get('description', '')) > 500 else result.get('description', ''),
                    'view_count': result.get('view_count', 0),
                    'upload_date': result.get('upload_date', ''),
                }
            }
            
            print(f"Successfully downloaded video: {result['title']}")
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

@app.route('/api/download-video/<request_id>/<filename>', methods=['GET'])
def download_video(request_id, filename):
    """
    Download the video file
    """
    try:
        # Validate request_id format (should be UUID)
        try:
            uuid.UUID(request_id)
        except ValueError:
            return jsonify({'error': 'Invalid request ID'}), 400
        
        file_path = os.path.join(TEMP_DIR, request_id, filename)
        
        if not os.path.exists(file_path):
            return jsonify({'error': 'Video file not found or expired'}), 404
        
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
            mimetype='video/mp4'
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
        print(f"Error downloading video: {str(e)}")
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
    print("Starting YouTube Video Downloader API...")
    print("Cleaning up old files...")
    cleanup_old_files()
    
    port = int(os.environ.get('PORT', 5002))
    debug_mode = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    
    print(f"API will be available at: http://localhost:{port}")
    print("Endpoints:")
    print("  GET  /api/health - Health check")
    print("  POST /api/extract-video - Download video from YouTube URL")
    print("  GET  /api/download-video/<request_id>/<filename> - Download video file")
    
    if debug_mode:
        print("Running in debug mode")
    
    app.run(host='0.0.0.0', port=port, debug=debug_mode, use_reloader=False)
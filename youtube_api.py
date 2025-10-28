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
import time
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
    Download video from YouTube using yt-dlp with multiple fallback strategies
    Returns the path to the downloaded video file and metadata
    """
    
    # Define multiple download strategies to try sequentially
    strategies = [
        {
            'name': 'Standard Quality',
            'format': 'best[height<=480]/best[height<=720]/best',
            'user_agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'geo_bypass_country': 'US'
        },
        {
            'name': 'Mobile Format',
            'format': 'worst[height>=360]/best[height<=480]',
            'user_agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
            'geo_bypass_country': 'CA'
        },
        {
            'name': 'Audio Only + Video Merge',  
            'format': 'bestaudio[ext=m4a]/bestaudio/best[height<=360]',
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0',
            'geo_bypass_country': 'GB'
        },
        {
            'name': 'Lowest Quality',
            'format': 'worst/worst[ext=mp4]',
            'user_agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'geo_bypass_country': 'DE'
        }
    ]
    
    last_error = None
    
    for i, strategy in enumerate(strategies):
        try:
            print(f"Attempting download strategy {i+1}: {strategy['name']}")
            
            # Configure yt-dlp options for this strategy
            ydl_opts = {
                'format': strategy['format'],
                'outtmpl': os.path.join(output_path, '%(title).100s.%(ext)s'),
                'quiet': True,
                'no_warnings': True,
                'extract_flat': False,
                'writethumbnail': False,
                'writeinfojson': False,
                # Anti-blocking measures
                'user_agent': strategy['user_agent'],
                'referer': 'https://www.youtube.com/',
                'http_headers': {
                    'User-Agent': strategy['user_agent'],
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none',
                    'Sec-Fetch-User': '?1',
                    'Cache-Control': 'max-age=0',
                },
                'cookiefile': None,
                'no_check_certificate': True,
                'ignoreerrors': False,
                'logtostderr': False,
                'socket_timeout': 60,  # Shorter timeout for faster retries
                'sleep_interval': 2,
                'max_sleep_interval': 8,
                'extractor_retries': 2,
                'fragment_retries': 2,
                'skip_unavailable_fragments': True,
                'geo_bypass': True,
                'geo_bypass_country': strategy['geo_bypass_country'],
            }

            with YoutubeDL(ydl_opts) as ydl:
                # Extract info first to get metadata
                info = ydl.extract_info(url, download=False)
                video_title = info.get('title', 'Unknown Title')
                
                # Download video
                ydl.download([url])
                
                # Find and validate the downloaded file
                video_file = find_and_validate_video_file(output_path, video_title)
                
                if video_file:
                    print(f"Successfully downloaded using strategy {i+1}: {strategy['name']}")
                    return {
                        'video_file': video_file,
                        'title': video_title,
                        'duration': info.get('duration', 0),
                        'uploader': info.get('uploader', 'Unknown'),
                        'description': info.get('description', ''),
                        'thumbnail': info.get('thumbnail', ''),
                        'view_count': info.get('view_count', 0),
                        'upload_date': info.get('upload_date', ''),
                    }
                else:
                    raise Exception("No valid video file found after download")
                    
        except Exception as e:
            last_error = e
            print(f"Strategy {i+1} ({strategy['name']}) failed: {e}")
            
            # Clean up any partial downloads before trying next strategy
            cleanup_partial_downloads(output_path)
            
            # Add a small delay before trying next strategy
            if i < len(strategies) - 1:
                time.sleep(3)
            continue
    
    # If all strategies failed
    raise Exception(f"All download strategies failed. Last error: {str(last_error)}")


def find_and_validate_video_file(output_path, expected_title):
    """Find and validate the downloaded video file"""
    try:
        all_files = os.listdir(output_path)
        print(f"Files in directory after download: {all_files}")
        
        video_extensions = ['.mp4', '.mkv', '.webm', '.avi', '.mov', '.flv', '.m4v', '.m4a']
        video_file = None
        
        # Method 1: Look for files with title in name
        clean_title = expected_title.replace('/', '_').replace('\\', '_').replace(':', '_').replace('?', '_').replace('*', '_').replace('"', '_').replace('<', '_').replace('>', '_').replace('|', '_')
        
        for file in all_files:
            if any(file.lower().endswith(ext.lower()) for ext in video_extensions):
                title_words = clean_title.lower().split()[:3]
                if any(word in file.lower() for word in title_words if len(word) > 2):
                    video_file = os.path.join(output_path, file)
                    print(f"Found video file by title matching: {file}")
                    break
        
        # Method 2: Get the newest video file
        if not video_file:
            video_files = [f for f in all_files if any(f.lower().endswith(ext.lower()) for ext in video_extensions)]
            if video_files:
                video_files.sort(key=lambda x: os.path.getctime(os.path.join(output_path, x)), reverse=True)
                video_file = os.path.join(output_path, video_files[0])
                print(f"Using newest video file: {video_files[0]}")
        
        # Method 3: Check any remaining files but filter out web files
        if not video_file:
            other_files = [f for f in all_files if not f.startswith('.') and not f.endswith('.tmp') and not f.endswith('.part')]
            non_web_files = [f for f in other_files if not any(f.lower().endswith(ext) for ext in ['.html', '.mhtml', '.xml', '.json', '.txt'])]
            
            if non_web_files:
                video_file = os.path.join(output_path, non_web_files[0])
                print(f"Using first non-web file: {non_web_files[0]}")
        
        if not video_file or not os.path.exists(video_file):
            return None
        
        # Validate file size and content
        file_size = os.path.getsize(video_file)
        print(f"Downloaded file size: {file_size} bytes ({file_size / 1024 / 1024:.2f} MB)")
        
        if file_size < 1024:
            print(f"File too small ({file_size} bytes), likely download failure")
            return None
        
        # Check if file is actually a video/audio file
        with open(video_file, 'rb') as f:
            first_bytes = f.read(100)
            if b'<html' in first_bytes.lower() or b'mhtml' in first_bytes.lower() or first_bytes.startswith(b'MIME-Version:'):
                print("File appears to be a webpage, not a video")
                return None
        
        return video_file
        
    except Exception as e:
        print(f"Error finding video file: {e}")
        return None


def cleanup_partial_downloads(output_path):
    """Clean up any partial or failed downloads"""
    try:
        for file in os.listdir(output_path):
            file_path = os.path.join(output_path, file)
            if os.path.isfile(file_path):
                # Remove partial downloads, web files, and temporary files
                if (file.endswith(('.part', '.tmp', '.html', '.mhtml', '.xml', '.json', '.txt')) or 
                    file.startswith('.') or 
                    os.path.getsize(file_path) < 1024):
                    try:
                        os.remove(file_path)
                        print(f"Cleaned up file: {file}")
                    except:
                        pass
    except Exception as e:
        print(f"Error during cleanup: {e}")

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
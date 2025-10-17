# Network Troubleshooting Guide for Video to Text Converter

## Quick Diagnostics

1. **Open the application in your browser**
2. **Press F12** to open Developer Tools
3. **Click on the "Full Diagnostics" button** in the app
4. **Check the Console tab** for detailed network test results

## Common Network Issues and Solutions

### 1. "Network error: Please check your internet connection"

**Possible Causes:**
- Unstable internet connection
- Corporate firewall blocking CDN access
- VPN/proxy interference
- Browser extensions blocking requests
- DNS resolution issues

**Solutions:**
1. **Test basic connectivity:**
   ```bash
   ping google.com
   ```

2. **Try different network:**
   - Switch to mobile hotspot
   - Try different WiFi network

3. **Disable VPN/Proxy:**
   - Temporarily disconnect VPN
   - Disable proxy settings

4. **Browser troubleshooting:**
   - Try incognito/private mode
   - Disable ad blockers and extensions
   - Clear browser cache and cookies
   - Try different browser (Chrome/Firefox recommended)

### 2. "Failed to load FFmpeg from all CDN sources"

**This indicates CDN connectivity issues.**

**Corporate Network Solutions:**
1. **Check with IT department** about firewall rules
2. **Request whitelist for these domains:**
   - unpkg.com
   - cdn.jsdelivr.net
   - cdn.skypack.dev

3. **Alternative solutions:**
   - Use personal mobile hotspot
   - Try during off-peak hours
   - Contact IT for exemption

### 3. "Gemini API connectivity failed"

**API-specific issues:**

1. **Check API key:**
   - Verify in `.env` file
   - Ensure key is active in Google AI Studio
   - Check for extra spaces or characters

2. **Test API key manually:**
   ```bash
   curl -H "x-goog-api-key: YOUR_API_KEY" \
   "https://generativelanguage.googleapis.com/v1beta/models"
   ```

3. **Check API quotas** in Google AI Studio

### 4. Browser-Specific Issues

**Chrome:**
- Disable "Block third-party cookies"
- Check Site Settings for the localhost domain
- Try `--disable-web-security` flag (development only)

**Firefox:**
- Check Enhanced Tracking Protection settings
- Disable strict privacy settings temporarily

**Safari:**
- Disable "Prevent cross-site tracking"
- Check website settings for localhost

### 5. Development Environment Issues

**Environment Variable Problems:**
1. **Check .env file exists:**
   ```bash
   ls -la .env
   ```

2. **Verify API key format:**
   ```bash
   cat .env | grep VITE_GEMINI_API_KEY
   ```

3. **Restart development server** after .env changes:
   ```bash
   npm run dev
   ```

## Advanced Debugging

### Network Analysis
1. **Open Developer Tools → Network tab**
2. **Try to process a video**
3. **Look for failed requests** (red entries)
4. **Check error details** by clicking on failed requests

### Console Debugging
1. **Open Console tab in Developer Tools**
2. **Run comprehensive diagnostics:**
   ```javascript
   // This will run automatically when you click "Full Diagnostics"
   ```

3. **Check for specific error patterns:**
   - CORS errors
   - Timeout errors
   - DNS resolution failures
   - SSL certificate issues

### Network Speed Requirements
- **Minimum:** 1 Mbps download
- **Recommended:** 5+ Mbps for large files
- **Latency:** < 500ms for optimal performance

## Contact Support

If none of these solutions work:

1. **Copy the console output** from "Full Diagnostics"
2. **Note your system information:**
   - Operating system
   - Browser and version
   - Network type (WiFi/Ethernet/Mobile)
   - VPN status

3. **Create an issue** on GitHub with this information

## Quick Test Commands

Test your network connectivity manually:

```bash
# Test basic internet
curl -I https://google.com

# Test CDN access
curl -I https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js

# Test Gemini API (replace YOUR_KEY)
curl -H "x-goog-api-key: YOUR_KEY" \
"https://generativelanguage.googleapis.com/v1beta/models"
```
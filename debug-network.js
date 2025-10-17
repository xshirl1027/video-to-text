/*
 * Network Debugging Utilities
 * Add this to browser console for advanced debugging
 */

// Test CDN connectivity
async function testCDNConnectivity() {
  const cdns = [
    "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js",
    "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js",
    "https://cdn.skypack.dev/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js",
  ];

  console.log("Testing CDN connectivity...");

  for (const cdn of cdns) {
    try {
      const response = await fetch(cdn, { method: "HEAD" });
      console.log(`✅ ${cdn}: ${response.status}`);
    } catch (error) {
      console.log(`❌ ${cdn}: ${error.message}`);
    }
  }
}

// Test Gemini API connectivity
async function testGeminiConnectivity(apiKey) {
  if (!apiKey) {
    console.log("❌ No API key provided");
    return;
  }

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models",
      {
        headers: {
          "x-goog-api-key": apiKey,
        },
      }
    );

    if (response.ok) {
      console.log("✅ Gemini API connectivity: OK");
    } else {
      console.log(
        `❌ Gemini API connectivity: ${response.status} ${response.statusText}`
      );
    }
  } catch (error) {
    console.log(`❌ Gemini API connectivity: ${error.message}`);
  }
}

// Run all tests
async function runNetworkDiagnostics(apiKey) {
  console.log("=== Network Diagnostics ===");
  console.log("Navigator online:", navigator.onLine);
  console.log(
    "Connection type:",
    navigator.connection?.effectiveType || "unknown"
  );

  await testCDNConnectivity();
  await testGeminiConnectivity(apiKey);

  console.log("=== End Diagnostics ===");
}

// Usage: runNetworkDiagnostics('your-api-key-here');

#!/usr/bin/env python3
import http.server
import socketserver
import webbrowser
import os

# Change to the directory containing this script
os.chdir(os.path.dirname(os.path.abspath(__file__)))

PORT = 8000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def log_message(self, format, *args):
        # Suppress log messages for cleaner output
        pass

try:
    with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
        print(f"🚀 VectorAlert Server Started")
        print(f"📍 Local: http://localhost:{PORT}")
        print(f"📍 Network: http://127.0.0.1:{PORT}")
        print(f"📁 Serving directory: {os.getcwd()}")
        print("🔧 Press Ctrl+C to stop the server")
        print()
        
        # Open browser automatically
        webbrowser.open(f'http://localhost:{PORT}')
        
        httpd.serve_forever()

except KeyboardInterrupt:
    print("\n🛑 Server stopped by user")
except Exception as e:
    print(f"❌ Server error: {e}")
    input("Press Enter to exit...")

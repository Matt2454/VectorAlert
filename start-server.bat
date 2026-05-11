@echo off
cd /d "C:\Users\mattu\Desktop\VectorAlert"
echo Starting VectorAlert Server...
echo Server will be available at: http://localhost:8000
echo.
python -m http.server 8000
pause

FROM python:3.11-slim

# Install system dependencies: FFmpeg, fonts, build tools
RUN apt-get update && apt-get install -y \
    ffmpeg \
    fonts-freefont-ttf \
    fonts-noto \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Ensure storage directories exist
RUN mkdir -p storage/temp storage/output

ENV PORT=8000
EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]

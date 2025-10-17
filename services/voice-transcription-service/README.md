# Voice Transcription Service

Real-time Italian voice transcription service using Vosk for the Chronic Diabetes Management System.

## Features

- **Real-time Transcription**: Word-by-word Italian voice transcription
- **WebSocket Integration**: Live audio streaming and transcription
- **File-based Storage**: Professional voice file organization
- **Cursor Integration**: Writes transcription where cursor is positioned
- **Toggle Recording**: Start/stop recording with same button
- **No Voice Training**: Works immediately without doctor voice samples
- **Professional Storage**: Organized by doctor, date, and session

## Architecture

### Components

1. **FastAPI Backend**: REST API and WebSocket server
2. **Vosk Integration**: Italian language model for transcription
3. **File Manager**: Voice file storage and organization
4. **WebSocket Handler**: Real-time audio streaming
5. **Session Management**: Track active transcription sessions

### Data Flow

1. **Frontend** → WebSocket connection with audio data
2. **Vosk Model** → Processes audio chunks in real-time
3. **Transcription** → Sends word-by-word results to frontend
4. **File Storage** → Saves voice files and transcriptions
5. **Session Tracking** → Manages recording state and metadata

## API Endpoints

### REST API

- `GET /` - Service information
- `GET /health` - Health check
- `POST /api/transcription/start` - Start transcription session
- `POST /api/transcription/stop/{session_id}` - Stop session
- `GET /api/transcription/sessions/{doctor_id}` - Get doctor sessions
- `GET /api/transcription/files/{session_id}` - Get session files

### WebSocket

- `WS /ws/transcribe/{session_id}` - Real-time transcription

## Configuration

### Environment Variables

```bash
# Service configuration
SERVICE_NAME=voice-transcription-service
SERVICE_VERSION=1.0.0
DEBUG=false

# Vosk model
VOSK_MODEL_PATH=/app/models/vosk-model-it
VOSK_MODEL_URL=https://alphacephei.com/vosk/models/vosk-model-small-it-0.22.zip

# Storage paths
VOICE_STORAGE_PATH=/app/storage/voices
TRANSCRIPTION_STORAGE_PATH=/app/storage/transcriptions

# Audio settings
SAMPLE_RATE=16000
CHUNK_SIZE=4000
AUDIO_FORMAT=wav

# WebSocket settings
WEBSOCKET_TIMEOUT=300
MAX_SESSION_DURATION=1800
```

## File Organization

### Voice Files
```
/storage/voices/
├── doctors/
│   ├── DOC001/
│   │   ├── 2024-01-15/
│   │   │   ├── session_20240115_143022_DOC001_14-30-22.wav
│   │   │   ├── session_20240115_143022_DOC001_14-30-22.txt
│   │   │   └── session_20240115_143022_DOC001_14-30-22.json
│   │   └── 2024-01-16/
│   └── DOC002/
```

### Transcription Files
```
/storage/transcriptions/
├── sessions/
│   ├── session_20240115_143022_DOC001.txt
│   └── session_20240115_150000_DOC002.txt
```

## Usage

### Starting a Session

```javascript
// Frontend integration
const response = await fetch('/api/transcription/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    doctor_id: 'DOC001',
    patient_cf: 'RSSMRA80A01H501U',
    cronoscita_id: 'cronoscita_123'
  })
});

const { session_id, websocket_url } = await response.json();
```

### WebSocket Connection

```javascript
const ws = new WebSocket(`ws://localhost:5003${websocket_url}`);

ws.onopen = () => {
  // Send session info
  ws.send('DOC001');  // doctor_id
  ws.send('RSSMRA80A01H501U');  // patient_cf
  ws.send('cronoscita_123');  // cronoscita_id
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'transcription') {
    // Insert text at cursor position
    insertTextAtCursor(data.text);
  }
};
```

## Development

### Running Locally

```bash
# Install dependencies
pip install -r requirements.txt

# Run the service
uvicorn app.main:app --host 0.0.0.0 --port 5003 --reload
```

### Docker

```bash
# Build image
docker build -f Dockerfile.dev -t voice-transcription-service .

# Run container
docker run -p 5003:5003 voice-transcription-service
```

## Integration with Timeline Frontend

The service integrates with the Timeline frontend to provide:

1. **Toggle Button**: Same button to start/stop recording
2. **Cursor Integration**: Writes transcription at cursor position
3. **Real-time Display**: Shows transcription as it happens
4. **Session Management**: Tracks recording state
5. **File Storage**: Saves voice files with metadata

## Differences from Melody

| Feature | Melody (Current) | Voice Transcription (New) |
|---------|------------------|---------------------------|
| **Integration** | External redirect | Direct WebSocket |
| **Transcription** | Batch processing | Real-time word-by-word |
| **Voice Training** | Requires samples | No training needed |
| **Conversation** | Doctor-patient | Doctor only |
| **File Storage** | None | Professional organization |
| **Cursor Integration** | No | Yes, writes at cursor |
| **Toggle Recording** | No | Yes, same button |

## Performance

- **Latency**: < 100ms for word-by-word transcription
- **Accuracy**: High accuracy for Italian medical terminology
- **Storage**: Efficient file organization by doctor and date
- **Scalability**: Supports multiple concurrent sessions

## Security

- **Session Isolation**: Each session is isolated
- **File Access**: Restricted to authorized doctors
- **Data Retention**: Configurable cleanup of old files
- **CORS**: Properly configured for frontend integration

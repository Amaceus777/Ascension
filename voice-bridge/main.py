import os
import secrets
from concurrent.futures import ThreadPoolExecutor

import riva.client
from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool

app = FastAPI(title="ASCENSION Parakeet Bridge", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://amaceus777.github.io"],
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["authorization", "content-type"],
)

POOL = ThreadPoolExecutor(max_workers=4)
FUNCTION_ID = os.getenv("RIVA_FUNCTION_ID", "71203149-d3b7-4460-8231-1be2543a1fca")
SERVER = "grpc.nvcf.nvidia.com:443"
MAX_AUDIO_BYTES = 12 * 1024 * 1024


@app.get("/health")
def health():
    return {"ok": True, "service": "ascension-parakeet-bridge"}


def transcribe_wav(audio: bytes, api_key: str) -> str:
    auth = riva.client.Auth(
        uri=SERVER,
        use_ssl=True,
        metadata_args=[
            ["function-id", FUNCTION_ID],
            ["authorization", "Bearer " + api_key],
        ],
    )
    service = riva.client.ASRService(auth)
    config = riva.client.RecognitionConfig(
        language_code="multi",
        max_alternatives=1,
        audio_channel_count=1,
        enable_automatic_punctuation=True,
    )
    response = service.offline_recognize(audio, config)
    transcripts = []
    for result in response.results:
        if result.alternatives and result.alternatives[0].transcript:
            transcripts.append(result.alternatives[0].transcript)
    return " ".join(transcripts).strip()


@app.post("/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    authorization: str | None = Header(default=None),
    x_nvidia_api_key: str | None = Header(default=None),
):
    expected = os.getenv("BRIDGE_SHARED_SECRET", "")
    supplied = authorization.removeprefix("Bearer ").strip() if authorization else ""
    if not expected or not secrets.compare_digest(supplied, expected):
        raise HTTPException(status_code=401, detail="No autorizado")
    if not x_nvidia_api_key:
        raise HTTPException(status_code=503, detail="Falta la credencial de NVIDIA")
    if audio.content_type not in ("audio/wav", "audio/x-wav", "application/octet-stream"):
        raise HTTPException(status_code=415, detail="Formato no compatible. Envía WAV mono PCM de 16 bits.")
    data = await audio.read(MAX_AUDIO_BYTES + 1)
    if len(data) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="Audio demasiado largo (máximo 12 MB).")
    if len(data) < 44 or data[:4] != b"RIFF" or data[8:12] != b"WAVE":
        raise HTTPException(status_code=400, detail="El audio debe ser WAV válido.")
    try:
        transcript = await run_in_threadpool(transcribe_wav, data, x_nvidia_api_key)
    except Exception as exc:
        # Do not return upstream details or credentials to the client.
        print("Riva transcription failed:", type(exc).__name__, str(exc)[:300])
        raise HTTPException(status_code=502, detail="NVIDIA Riva no pudo transcribir el audio. Revisa la API y vuelve a intentarlo.")
    if not transcript:
        raise HTTPException(status_code=422, detail="No se detectó voz inteligible.")
    return {"transcript": transcript}

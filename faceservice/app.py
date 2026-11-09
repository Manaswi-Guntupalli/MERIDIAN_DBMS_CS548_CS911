"""Meridian Face Service — the ONLY component that turns pixels into a face
embedding. It exists so no raw image ever has to be trusted from, or stored by,
the browser: a client-supplied descriptor is trivially forgeable, which would
defeat the whole anti-proxy design. Here the server sees the pixels, embeds
them in memory, and discards them — only the 512-D vector ever leaves.

Contract (called ONLY by the Node server, never the browser):
  POST /embed  { "image": "<base64 jpeg/png>" }
    → { "ok": true, "found": true, "embedding": [512 floats, L2-normalised],
        "detScore": 0.87, "bbox": [x1,y1,x2,y2], "model": "insightface-buffalo_l" }
    → { "ok": true, "found": false }                 (no face in the frame)

The embedding is L2-normalised, so cosine similarity == dot product on the
Node side. Nothing is written to disk; there is no database access here.
"""
from __future__ import annotations

import base64
import binascii
import os
import threading
import time
from typing import Literal
from contextlib import asynccontextmanager

import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel

MODEL_NAME = "buffalo_l"
MODEL_ID = "insightface-buffalo_l"   # the string persisted with every embedding
EMBED_DIM = 512
DET_SIZE = int(os.environ.get("FACE_DET_SIZE", "640"))

_app_model = None  # lazily initialised InsightFace FaceAnalysis
_inference_lock = threading.Lock()


def _load_model():
    global _app_model
    if _app_model is None:
        from insightface.app import FaceAnalysis  # heavy import, deferred
        import onnxruntime as ort
        m = FaceAnalysis(name=MODEL_NAME, allowed_modules=['detection', 'recognition'], providers=["CPUExecutionProvider"])
        # Bound per-model CPU thread pools so they do not compete with the website.
        options = ort.SessionOptions()
        options.intra_op_num_threads = max(1, int(os.environ.get('FACE_CPU_THREADS', '2')))
        options.inter_op_num_threads = 1
        options.add_session_config_entry('session.intra_op.allow_spinning', '0')
        for model in m.models.values():
            model.session = ort.InferenceSession(model.model_file, sess_options=options, providers=['CPUExecutionProvider'])
        m.prepare(ctx_id=-1, det_size=(DET_SIZE, DET_SIZE))
        _app_model = m
    return _app_model


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Warm the model at boot so the first real request isn't a 30s cold start.
    _load_model()
    yield


api = FastAPI(title="Meridian Face Service", version="1.0.0", lifespan=lifespan)


class EmbedRequest(BaseModel):
    image: str  # base64-encoded JPEG/PNG bytes (optionally a data: URL)
    purpose: Literal['recognize', 'enroll'] = 'recognize'


@api.get("/health")
def health():
    return {"status": "ok", "service": "meridian-face", "model": MODEL_ID, "dim": EMBED_DIM, "loaded": _app_model is not None, "modules": ['detection', 'recognition']}


@api.post("/embed")
def embed(req: EmbedRequest):
    started = time.perf_counter()
    if len(req.image) > 4_000_000:
        return {"ok": False, "error": "Image is too large. Use a camera frame below 3 MB."}
    raw = req.image.split(",", 1)[1] if req.image.startswith("data:") else req.image
    try:
        img_bytes = base64.b64decode(raw, validate=True)
    except (binascii.Error, ValueError):
        return {"ok": False, "error": "image is not valid base64"}

    import cv2  # deferred so /health stays cheap
    arr = np.frombuffer(img_bytes, np.uint8)
    frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if frame is None:
        return {"ok": False, "error": "could not decode image"}
    height, width = frame.shape[:2]
    if width * height > 12_000_000:
        return {"ok": False, "error": "Image resolution is too large. Use a camera frame."}
    if max(width, height) > 1280:
        scale = 1280 / max(width, height)
        frame = cv2.resize(frame, (round(width * scale), round(height * scale)))
        height, width = frame.shape[:2]

    # The detector has mutable caches; serialize concurrent kiosk/enrollment work.
    with _inference_lock:
        faces = _load_model().get(frame)
    if not faces:
        # In-memory frame is dropped here regardless — never persisted.
        return {"ok": True, "found": False, "faceCount": 0, "imageWidth": width, "imageHeight": height, "qualityOk": False, "guidance": "No face detected. Face the camera in good light and keep your whole face visible.", "model": MODEL_ID}

    # Largest detected face wins (the person actually presenting at the camera).
    face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
    x1, y1, x2, y2 = face.bbox
    guidance = None
    if len(faces) != 1:
        guidance = 'Keep only one person in the frame.'
    elif min(x2 - x1, y2 - y1) < 80:
        guidance = 'Move closer so your face is larger in the frame.'
    elif x1 < 3 or y1 < 3 or x2 > width - 3 or y2 > height - 3:
        guidance = 'Move back slightly and keep your whole face inside the frame.'
    elif float(face.det_score) < 0.65:
        guidance = 'Face the camera directly in even light, then try again.'
    else:
        crop = frame[max(0, int(y1)):min(height, int(y2)), max(0, int(x1)):min(width, int(x2))]
        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
        if float(gray.mean()) < 20 or float(gray.mean()) > 245:
            guidance = 'Use even lighting on your face and avoid a bright window behind you.'
        elif float(cv2.Laplacian(gray, cv2.CV_64F).var()) < 35:
            guidance = 'Hold still for a sharp frame and check that the camera lens is clear.'
    if req.purpose == 'enroll' and guidance:
        return {"ok": True, "found": True, "faceCount": len(faces), "qualityOk": False, "guidance": guidance, "model": MODEL_ID}
    vec = np.asarray(face.normed_embedding, dtype=np.float32)  # already L2-normalised
    return {
        "ok": True,
        "found": True,
        "embedding": [round(float(x), 6) for x in vec.tolist()],
        "detScore": round(float(face.det_score), 4),
        "bbox": [round(float(v), 1) for v in face.bbox.tolist()],
        "model": MODEL_ID,
        "dim": EMBED_DIM,
        "faceCount": len(faces),
        "imageWidth": width,
        "imageHeight": height,
        "qualityOk": guidance is None,
        "guidance": guidance,
        "elapsedMs": round((time.perf_counter() - started) * 1000),
    }

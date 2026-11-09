import base64
from types import SimpleNamespace
import cv2
import numpy as np
import pytest
import app

def image(flat=False):
    frame = np.full((480, 640, 3), 120, dtype=np.uint8) if flat else np.random.default_rng(7).integers(40, 210, (480, 640, 3), dtype=np.uint8)
    return base64.b64encode(cv2.imencode('.jpg', frame)[1]).decode()

def face(box=(140, 100, 340, 350)):
    return SimpleNamespace(bbox=np.array(box), det_score=.95, normed_embedding=np.ones(512) / np.sqrt(512))

def model(monkeypatch, faces):
    monkeypatch.setattr(app, '_app_model', SimpleNamespace(get=lambda _: faces))

def test_invalid_base64():
    assert app.embed(app.EmbedRequest(image='!!!'))['ok'] is False

def test_invalid_image():
    assert app.embed(app.EmbedRequest(image=base64.b64encode(b'not an image').decode()))['ok'] is False

def test_size_limit():
    assert app.embed(app.EmbedRequest(image='x' * 4_000_001))['ok'] is False

def test_no_face(monkeypatch):
    model(monkeypatch, [])
    result = app.embed(app.EmbedRequest(image=image(), purpose='enroll'))
    assert result['found'] is False
    assert 'No face' in result['guidance']

@pytest.mark.parametrize('faces,text', [([face(), face()], 'one person'), ([face((0, 20, 200, 250))], 'whole face'), ([face((100,100,140,150))], 'closer')])
def test_reject_unsafe_enrollment_frames(monkeypatch, faces, text):
    model(monkeypatch, faces)
    result = app.embed(app.EmbedRequest(image=image(), purpose='enroll'))
    assert result['qualityOk'] is False
    assert text in result['guidance']
    assert 'embedding' not in result

def test_reject_blur(monkeypatch):
    model(monkeypatch, [face()])
    result = app.embed(app.EmbedRequest(image=image(flat=True), purpose='enroll'))
    assert result['qualityOk'] is False
    assert 'sharp' in result['guidance']

def test_valid_template(monkeypatch):
    model(monkeypatch, [face()])
    result = app.embed(app.EmbedRequest(image=image(), purpose='enroll'))
    assert result['qualityOk'] is True
    assert result['model'] == app.MODEL_ID
    assert len(result['embedding']) == 512
    assert result['imageWidth'] == 640
    assert result['imageHeight'] == 480
    assert np.linalg.norm(result['embedding']) == pytest.approx(1, abs=.0001)

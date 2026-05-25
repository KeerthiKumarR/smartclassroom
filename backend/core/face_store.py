import os
import json
import pickle
import cv2
import numpy as np

# ─────────────────────────────────────────────
# INSIGHTFACE SETUP (ArcFace model)
# ─────────────────────────────────────────────

import insightface
from insightface.app import FaceAnalysis

_app = FaceAnalysis(name="buffalo_sc", providers=["CPUExecutionProvider"])
_app.prepare(ctx_id=0, det_size=(640, 640))

# ─────────────────────────────────────────────
# PERSISTENCE
# ─────────────────────────────────────────────

STORE_DIR = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "models", "face_store"
)
ENCODINGS_PATH = os.path.join(STORE_DIR, "encodings.pkl")
STUDENTS_PATH  = os.path.join(STORE_DIR, "students.json")

os.makedirs(STORE_DIR, exist_ok=True)

KNOWN_FACES: list[dict] = []   # [{name, embedding}, …]


def _load_from_disk():
    global KNOWN_FACES
    if os.path.exists(ENCODINGS_PATH):
        try:
            with open(ENCODINGS_PATH, "rb") as f:
                KNOWN_FACES = pickle.load(f)
            print(f"[face_store] Loaded {len(KNOWN_FACES)} face(s) from disk.")
        except Exception as e:
            print(f"[face_store] Could not load encodings: {e}")
            KNOWN_FACES = []
    else:
        KNOWN_FACES = []


def _save_to_disk():
    try:
        with open(ENCODINGS_PATH, "wb") as f:
            pickle.dump(KNOWN_FACES, f)
        students = [{"name": p["name"]} for p in KNOWN_FACES]
        with open(STUDENTS_PATH, "w") as f:
            json.dump(students, f, indent=2)
    except Exception as e:
        print(f"[face_store] Save failed: {e}")


_load_from_disk()


# ─────────────────────────────────────────────
# EMBEDDING HELPER
# ─────────────────────────────────────────────

def _get_embedding(face_img: np.ndarray) -> np.ndarray | None:
    """Run ArcFace on a BGR face crop and return 512-d unit embedding."""
    if face_img is None or face_img.size == 0:
        return None

    # InsightFace needs at least ~80x80 to work reliably
    h, w = face_img.shape[:2]
    if h < 40 or w < 40:
        return None

    # Upscale small crops so ArcFace has enough pixels
    if h < 112 or w < 112:
        face_img = cv2.resize(face_img, (112, 112))

    faces = _app.get(face_img)
    if not faces:
        return None

    emb = faces[0].embedding
    emb = emb / (np.linalg.norm(emb) + 1e-6)
    return emb.astype(np.float32)


# ─────────────────────────────────────────────
# ENROLL
# ─────────────────────────────────────────────

def enroll_face(name: str, face_img: np.ndarray) -> bool:
    emb = _get_embedding(face_img)
    if emb is None:
        return False

    for person in KNOWN_FACES:
        if person["name"].lower() == name.lower():
            # Running average then re-normalise
            avg = (person["embedding"] + emb) / 2.0
            person["embedding"] = avg / (np.linalg.norm(avg) + 1e-6)
            _save_to_disk()
            print(f"[face_store] Updated '{name}'.")
            return True

    KNOWN_FACES.append({"name": name, "embedding": emb})
    _save_to_disk()
    print(f"[face_store] Enrolled '{name}'. Total: {len(KNOWN_FACES)}.")
    return True


# ─────────────────────────────────────────────
# RECOGNIZE
# ─────────────────────────────────────────────

# ArcFace cosine similarity — 0.40 is a solid threshold
RECOGNITION_THRESHOLD = 0.40


def recognize_face(face_img: np.ndarray) -> tuple[str, float]:
    if not KNOWN_FACES:
        return "Unknown", 0.0

    emb = _get_embedding(face_img)
    if emb is None:
        return "Unknown", 0.0

    best_score = -1.0
    best_name  = "Unknown"

    for person in KNOWN_FACES:
        if "embedding" not in person:
            continue

        if person["embedding"] is None:
            continue

        score = float(
            np.dot(
                emb,
                person["embedding"]
            )
        )
        if score > best_score:
            best_score = score
            best_name  = person["name"]

    if best_score < RECOGNITION_THRESHOLD:
        return "Unknown", best_score

    return best_name, best_score
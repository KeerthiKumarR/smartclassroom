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

_app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
_app.prepare(ctx_id=-1, det_size=(640, 640))

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

        # Sync to backend/data/students.json for recognition.py
        data_students_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            "data", "students.json"
        )
        os.makedirs(os.path.dirname(data_students_path), exist_ok=True)

        data_students = []
        for person in KNOWN_FACES:
            label = person["name"]
            name = label
            roll = "N/A"
            if "(" in label and label.endswith(")"):
                try:
                    parts = label.split("(")
                    name = parts[0].strip()
                    roll = parts[1].replace(")", "").strip()
                except:
                    pass
            
            emb = person["embedding"]
            emb_list = emb.tolist() if isinstance(emb, np.ndarray) else list(emb)
            data_students.append({
                "name": name,
                "roll_number": roll,
                "embedding": emb_list
            })

        with open(data_students_path, "w") as f:
            json.dump(data_students, f, indent=2)
        print(f"[face_store] Synced {len(data_students)} student(s) to backend/data/students.json")
    except Exception as e:
        print(f"[face_store] Save failed: {e}")


_load_from_disk()
# Instantly sync to backend/data/students.json on startup
_save_to_disk()



# ─────────────────────────────────────────────
# ENROLL (accepts FULL FRAME, not a crop)
# ─────────────────────────────────────────────

def enroll_face(name: str, frame: np.ndarray) -> bool:
    """
    Detect the largest face in the full frame and extract its embedding directly.
    DO NOT pass a pre-cropped face image — InsightFace needs the full frame
    to run detection + alignment + embedding extraction correctly.
    """
    if frame is None or frame.size == 0:
        return False

    faces = _app.get(frame)
    if not faces:
        return False

    # Pick the largest face by bounding box area
    largest_face = max(
        faces,
        key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1])
    )

    # Extract embedding directly from the face object (InsightFace provides this)
    emb = largest_face.embedding
    if emb is None:
        return False

    # Normalize to unit vector for cosine similarity
    emb = emb / (np.linalg.norm(emb) + 1e-6)
    emb = emb.astype(np.float32)

    # Check if student already exists — update with running average
    for person in KNOWN_FACES:
        if person["name"].lower() == name.lower():
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
# RECOGNIZE (accepts FULL FRAME, not a crop)
# ─────────────────────────────────────────────

# ArcFace cosine similarity — 0.40 is a solid threshold
RECOGNITION_THRESHOLD = 0.40


def recognize_face(frame: np.ndarray) -> tuple[str, float]:
    """Recognize a face from a full frame against enrolled embeddings."""
    if not KNOWN_FACES:
        return "Unknown", 0.0

    if frame is None or frame.size == 0:
        return "Unknown", 0.0

    faces = _app.get(frame)
    if not faces:
        return "Unknown", 0.0

    largest_face = max(
        faces,
        key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1])
    )

    emb = largest_face.embedding
    if emb is None:
        return "Unknown", 0.0

    emb = emb / (np.linalg.norm(emb) + 1e-6)

    best_score = -1.0
    best_name  = "Unknown"

    for person in KNOWN_FACES:
        if "embedding" not in person:
            continue

        if person["embedding"] is None:
            continue

        score = float(np.dot(emb, person["embedding"]))
        if score > best_score:
            best_score = score
            best_name  = person["name"]

    if best_score < RECOGNITION_THRESHOLD:
        return "Unknown", best_score

    return best_name, best_score
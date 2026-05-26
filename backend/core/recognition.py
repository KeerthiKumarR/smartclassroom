import json
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import os

STUDENTS_PATH = "backend/data/students.json"

def load_students():
    path = STUDENTS_PATH
    if not os.path.exists(path):
        # Fallback absolute path for runtime stability
        abs_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "students.json")
        if os.path.exists(abs_path):
            path = abs_path
        else:
            return []

    with open(path, "r") as f:
        return json.load(f)

def recognize_face(face_embedding):
    students = load_students()

    if len(students) == 0:
        return {
            "recognized": False
        }

    best_match = None
    best_similarity = 0

    current_embedding = np.array(
        face_embedding
    ).reshape(1, -1)

    for student in students:
        stored_embedding = np.array(
            student["embedding"]
        ).reshape(1, -1)

        similarity = cosine_similarity(
            current_embedding,
            stored_embedding
        )[0][0]

        if similarity > best_similarity:
            best_similarity = similarity
            best_match = student

    # Balanced recognition threshold
    if best_similarity > 0.50:
        return {
            "recognized": True,
            "name": best_match["name"],
            "roll_number": best_match["roll_number"],
            "similarity": float(best_similarity)
        }

    return {
        "recognized": False
    }

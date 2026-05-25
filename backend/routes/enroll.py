from fastapi import APIRouter
from core.utils      import decode_base64_image
from core.face_store import enroll_face, _app, KNOWN_FACES, _save_to_disk
import numpy as np

router = APIRouter()


@router.post("/enroll-face")
def enroll_face_endpoint(payload: dict):
    student_name = (payload.get("studentName") or "").strip()
    roll_number  = (payload.get("rollNumber")  or "").strip()

    if not student_name:
        return {"success": False, "message": "Student name is required."}
    if not roll_number:
        return {"success": False, "message": "Roll number is required."}

    frame = decode_base64_image(payload.get("frame"))
    if frame is None:
        return {"success": False, "message": "Camera frame missing."}

    # Let InsightFace detect the face in the full frame
    faces = _app.get(frame)
    if not faces:
        return {
            "success": False,
            "message": "No face detected. Please position yourself clearly and try again."
        }

    # Pick the largest face (most likely the person being enrolled)
    best_face = max(faces, key=lambda f: (f.bbox[2]-f.bbox[0]) * (f.bbox[3]-f.bbox[1]))

    # Crop it out
    x1, y1, x2, y2 = [int(v) for v in best_face.bbox]
    h_img, w_img = frame.shape[:2]
    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(w_img, x2), min(h_img, y2)
    face_crop = frame[y1:y2, x1:x2]

    label = f"{student_name} ({roll_number})"
    ok = enroll_face(label, face_crop)

    if ok:
        return {"success": True, "message": f"{student_name} enrolled successfully."}
    return {"success": False, "message": "Could not extract face embedding. Try again with better lighting."}


@router.get("/students")
def get_students():
    """Fetch all registered students with parsed names and roll numbers."""
    students = []
    for person in KNOWN_FACES:
        label = person["name"]
        # Parse "Name (Roll)" format
        name = label
        roll = "N/A"
        if "(" in label and label.endswith(")"):
            try:
                parts = label.split("(")
                name = parts[0].strip()
                roll = parts[1].replace(")", "").strip()
            except:
                pass
        students.append({
            "name": name,
            "roll": roll,
            "label": label
        })
    return students


@router.delete("/students/{label}")
def delete_student(label: str):
    """Deletes a student profile and syncs database / disk."""
    global KNOWN_FACES
    found = False
    for i, person in enumerate(KNOWN_FACES):
        if person["name"].lower() == label.lower():
            KNOWN_FACES.pop(i)
            found = True
            break

    if found:
        _save_to_disk()
        return {"success": True, "message": f"Student '{label}' deleted successfully."}
    return {"success": False, "message": f"Student '{label}' not found."}
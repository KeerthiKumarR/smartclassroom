from fastapi import APIRouter
import cv2
import math
import json
import os
from datetime import datetime

from core.utils       import decode_base64_image
from core.detector    import detect_faces
from core.database    import latest_stats
from core.recognition import recognize_face
from core.attendance import mark_attendance
from core.engagement import detect_focus

router = APIRouter()

# Global cache for heavy AI inference frame skipping
last_faces = []
frame_count = 0

# Lightweight post-processing movement memory (read-only analysis layer)
movement_memory = {}


class FaceObject(dict):
    """
    Subclass of dict to support both item access (e.g. face['bbox'])
    and attribute access (e.g. face.embedding, face.kps) for seamless, error-free integration.
    """
    def __getattr__(self, name):
        if name in self:
            return self[name]
        raise AttributeError(f"'FaceObject' has no attribute '{name}'")
    def __setattr__(self, name, value):
        self[name] = value


@router.post("/analyze-frame")
async def analyze_frame(payload: dict):
    global last_faces
    global frame_count

    frame = decode_base64_image(payload.get("frame"))

    if frame is None:
        return {"faces": [], "stats": {}}

    original_h, original_w = frame.shape[:2]

    # Increment frame counter
    frame_count += 1

    # 1. Skip heavy AI face detection: run only every 2nd frame
    # Frame 1: detect; intermediate frames: reuse cache
    if frame_count % 2 == 0 or not last_faces or frame_count == 1:
        # Downscale to 640x360 before calling the detector for balanced speed/accuracy
        small_w, small_h = 640, 360
        if original_w != small_w or original_h != small_h:
            small_frame = cv2.resize(frame, (small_w, small_h))
        else:
            small_frame = frame

        # Run face detection (detector handles 2x upscaling internally)
        raw_detections = detect_faces(small_frame)

        # Scale coordinates from 640x360 up to original frame dimensions
        scale_x = original_w / small_w
        scale_y = original_h / small_h

        scaled_detections = []
        for det in raw_detections:
            x, y, w, h = det["bbox"]
            confidence = det["confidence"]
            embedding = det.get("embedding")
            kps = det.get("kps")

            scaled_x = int(round(x * scale_x))
            scaled_y = int(round(y * scale_y))
            scaled_w = int(round(w * scale_x))
            scaled_h = int(round(h * scale_y))

            # Strictly clamp coordinates within original frame boundaries
            scaled_x = max(0, min(original_w, scaled_x))
            scaled_y = max(0, min(original_h, scaled_y))
            scaled_w = max(0, min(original_w - scaled_x, scaled_w))
            scaled_h = max(0, min(original_h - scaled_y, scaled_h))

            scaled_detections.append(FaceObject({
                "bbox": [scaled_x, scaled_y, scaled_w, scaled_h],
                "confidence": confidence,
                "embedding": embedding,
                "kps": kps
            }))
        
        last_faces = scaled_detections

    # 2. Reuse cached face detections
    faces = last_faces

    # ─────────────────────────────────────────
    # 3. POST-PROCESSING ONLY: lightweight drift status analysis
    #    This section is READ-ONLY. It does NOT modify bbox coordinates.
    # ─────────────────────────────────────────
    for i, face in enumerate(faces):
        x, y, w, h = face["bbox"]

        center_x = x + w // 2
        center_y = y + h // 2

        student_id = f"student_{i}"

        if student_id not in movement_memory:
            movement_memory[student_id] = {
                "prev_x": center_x,
                "prev_y": center_y,
                "drift_score": 0
            }

        prev_x = movement_memory[student_id]["prev_x"]
        prev_y = movement_memory[student_id]["prev_y"]

        distance = math.sqrt(
            (center_x - prev_x) ** 2 +
            (center_y - prev_y) ** 2
        )

        drift_score = movement_memory[student_id]["drift_score"]

        # Excessive movement
        if distance > 80:
            drift_score += 1
        else:
            drift_score = max(0, drift_score - 1)

        # Clamp
        drift_score = min(drift_score, 10)

        movement_memory[student_id]["prev_x"] = center_x
        movement_memory[student_id]["prev_y"] = center_y
        movement_memory[student_id]["drift_score"] = drift_score

        # Assign status
        if drift_score >= 5:
            status = "Distracted"
        else:
            status = "Focused"

        face["status"] = status

        # AUTOMATIC FACE RECOGNITION AND ATTENDANCE
        embedding = face.embedding
        if embedding is not None:
            recognition = recognize_face(embedding)
            if recognition["recognized"]:
                student_name = recognition["name"]
                mark_attendance(
                    recognition["name"],
                    recognition["roll_number"]
                )
            else:
                student_name = "Unknown"
        else:
            student_name = "Unknown"

        face["name"] = student_name

        # SAFE ADD-ON: Distraction detection layer using InsightFace keypoints
        focus_status = detect_focus(face)
        face["focus_status"] = focus_status

    # 4. Synchronize stats to keep frontend stats card alive
    faces_count = len(faces)
    distracted_count = sum(1 for f in faces if f.get("status") == "Distracted")
    focused_count = faces_count - distracted_count

    avg_engagement = 100
    if faces_count > 0:
        total_score = sum(45 if f.get("status") == "Distracted" else 92 for f in faces)
        avg_engagement = int(total_score / faces_count)

    # Read unique attendance count for today from backend/data/attendance.json
    attendance_count = 0
    attendance_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        "data", "attendance.json"
    )
    if os.path.exists(attendance_path):
        try:
            with open(attendance_path, "r") as f:
                records = json.load(f)
            today = datetime.now().strftime("%Y-%m-%d")
            attendance_count = sum(1 for r in records if r.get("date") == today)
        except Exception:
            pass

    latest_stats.update({
        "focusedCount":     focused_count,
        "facesDetected":    faces_count,
        "distractedCount":  distracted_count,
        "attendanceCount":  attendance_count,
        "averageEngagement": avg_engagement,
    })

    stats = {
        "facesDetected":    faces_count,
        "focusedCount":     focused_count,
        "distractedCount":  distracted_count,
        "attendanceCount":  attendance_count,
        "averageEngagement": avg_engagement,
        "attendance":        attendance_count,
        "engagement":        avg_engagement,
        "distracted":        distracted_count
    }

    # Return only lightweight JSON faces and stats payloads
    return {
        "faces": [
            {
                "bbox": det["bbox"],
                "confidence": det["confidence"],
                "name": det.get("name", "Unknown"),
                "focused": det.get("status", "Focused") == "Focused",
                "attendance": "Present" if det.get("name", "Unknown") != "Unknown" else "Absent",
                "status": det.get("status", "Focused"),
                "focus_status": det.get("focus_status", "Focused")
            }
            for det in faces
        ],
        "stats": stats
    }

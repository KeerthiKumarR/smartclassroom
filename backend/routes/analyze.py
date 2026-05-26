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

class FaceObject(dict):
    """
    Subclass of dict to support both item access (e.g. face['bbox'])
    and attribute access (e.g. face.embedding) for seamless, error-free integration.
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
        # ─────────────────────────────────────────
    # 3. HEAD-POSE BASED DRIFTING ANALYSIS
    #    Looking sideways/downward = Drifting
    # ─────────────────────────────────────────
    for face in faces:

        # HEAD DIRECTION ANALYSIS
        focus_status = detect_focus(face)

        face["focus_status"] = focus_status

        # Main frontend status
        face["status"] = focus_status

        # AUTOMATIC FACE RECOGNITION + ATTENDANCE
        embedding = face.embedding

        if embedding is not None:

            recognition = recognize_face(
                embedding
            )

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

    # ─────────────────────────────────────────
    # 4. LIVE STATS
    # ─────────────────────────────────────────
    faces_count = len(faces)

    distracted_count = sum(
        1 for f in faces
        if f.get("status") == "Drifting"
    )

    focused_count = (
        faces_count - distracted_count
    )

    avg_engagement = 100

    if faces_count > 0:

        total_score = sum(
            45
            if f.get("status") == "Drifting"
            else 92
            for f in faces
        )

        avg_engagement = int(
            total_score / faces_count
        )

    # ─────────────────────────────────────────
    # 5. ATTENDANCE COUNT
    # ─────────────────────────────────────────
    attendance_count = 0

    attendance_path = os.path.join(
        os.path.dirname(
            os.path.dirname(__file__)
        ),
        "data",
        "attendance.json"
    )

    if os.path.exists(attendance_path):

        try:

            with open(
                attendance_path,
                "r"
            ) as f:

                records = json.load(f)

            today = datetime.now().strftime(
                "%Y-%m-%d"
            )

            attendance_count = sum(
                1
                for r in records
                if r.get("date") == today
            )

        except Exception:

            pass

    # ─────────────────────────────────────────
    # 6. LIVE STATS CACHE
    # ─────────────────────────────────────────
    latest_stats.update({

        "facesDetected":
            faces_count,

        "focusedCount":
            focused_count,

        "distractedCount":
            distracted_count,

        "attendanceCount":
            attendance_count,

        "averageEngagement":
            avg_engagement,
    })

    stats = {

        "facesDetected":
            faces_count,

        "focusedCount":
            focused_count,

        "distractedCount":
            distracted_count,

        "attendanceCount":
            attendance_count,

        "averageEngagement":
            avg_engagement,

        "attendance":
            attendance_count,

        "engagement":
            avg_engagement,

        "distracted":
            distracted_count
    }

    # ─────────────────────────────────────────
    # 7. FINAL RESPONSE
    # ─────────────────────────────────────────
    return {

        "faces": [

            {

                "bbox":
                    det["bbox"],

                "confidence":
                    det["confidence"],

                "name":
                    det.get(
                        "name",
                        "Unknown"
                    ),

                "focused":
                    det.get(
                        "status",
                        "Focused"
                    ) == "Focused",

                "attendance":
                    (
                        "Present"
                        if det.get(
                            "name",
                            "Unknown"
                        ) != "Unknown"
                        else "Absent"
                    ),

                "status":
                    det.get(
                        "status",
                        "Focused"
                    ),

                "focus_status":
                    det.get(
                        "focus_status",
                        "Focused"
                    )

            }

            for det in faces
        ],

        "stats": stats
    }
    # ─────────────────────────────────────────
    # ATTENDANCE COUNT
    # ─────────────────────────────────────────
    attendance_count = 0

    attendance_path = os.path.join(
        os.path.dirname(
            os.path.dirname(__file__)
        ),
        "data",
        "attendance.json"
    )

    if os.path.exists(attendance_path):

        try:

            with open(
                attendance_path,
                "r"
            ) as f:

                records = json.load(f)

            today = datetime.now().strftime(
                "%Y-%m-%d"
            )

            attendance_count = sum(
                1
                for r in records
                if r.get("date") == today
            )

        except Exception:

            pass

    # ─────────────────────────────────────────
    # LIVE STATS CACHE
    # ─────────────────────────────────────────
    latest_stats.update({

        "focusedCount":
            focused_count,

        "facesDetected":
            faces_count,

        "distractedCount":
            distracted_count,

        "attendanceCount":
            attendance_count,

        "averageEngagement":
            avg_engagement,
    })

    stats = {

        "facesDetected":
            faces_count,

        "focusedCount":
            focused_count,

        "distractedCount":
            distracted_count,

        "attendanceCount":
            attendance_count,

        "averageEngagement":
            avg_engagement,

        "attendance":
            attendance_count,

        "engagement":
            avg_engagement,

        "distracted":
            distracted_count
    }

    # ─────────────────────────────────────────
    # FINAL RESPONSE
    # ─────────────────────────────────────────
    return {

        "faces": [

            {

                "bbox":
                    det["bbox"],

                "confidence":
                    det["confidence"],

                "name":
                    det.get(
                        "name",
                        "Unknown"
                    ),

                "focused":
                    det.get(
                        "status",
                        "Focused"
                    ) == "Focused",

                "attendance":
                    (
                        "Present"
                        if det.get(
                            "name",
                            "Unknown"
                        ) != "Unknown"
                        else "Absent"
                    ),

                "status":
                    det.get(
                        "status",
                        "Focused"
                    ),

                "focus_status":
                    det.get(
                        "focus_status",
                        "Focused"
                    )

            }

            for det in faces
        ],

        "stats": stats
    }
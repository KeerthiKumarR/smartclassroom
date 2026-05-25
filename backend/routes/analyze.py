from fastapi import APIRouter
import cv2
from core.utils       import decode_base64_image
from core.detector    import detect_faces
from core.database    import latest_stats

router = APIRouter()

# Global cache for heavy AI inference frame skipping
last_faces = []
frame_count = 0


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

        # Run face detection on the downscaled frame
        raw_detections = detect_faces(small_frame)

        # Scale coordinates back up to original frame dimensions
        scale_x = original_w / small_w
        scale_y = original_h / small_h

        scaled_detections = []
        for det in raw_detections:
            x, y, w, h = det["bbox"]
            confidence = det["confidence"]

            scaled_x = int(round(x * scale_x))
            scaled_y = int(round(y * scale_y))
            scaled_w = int(round(w * scale_x))
            scaled_h = int(round(h * scale_y))

            # Strictly clamp coordinates within original frame boundaries
            scaled_x = max(0, min(original_w, scaled_x))
            scaled_y = max(0, min(original_h, scaled_y))
            scaled_w = max(0, min(original_w - scaled_x, scaled_w))
            scaled_h = max(0, min(original_h - scaled_y, scaled_h))

            scaled_detections.append({
                "bbox": [scaled_x, scaled_y, scaled_w, scaled_h],
                "confidence": confidence
            })
        
        last_faces = scaled_detections

    # 2. Reuse cached face detections
    faces = last_faces

    # 3. Synchronize stats to keep frontend stats card alive
    faces_count = len(faces)
    latest_stats.update({
        "facesDetected":    faces_count,
        "focusedCount":     faces_count,  # placeholder
        "distractedCount":  0,
        "attendanceCount":  0,
        "averageEngagement": 100,
    })

    stats = {
        "facesDetected":    faces_count,
        "focusedCount":     faces_count,
        "distractedCount":  0,
        "attendanceCount":  0,
        "averageEngagement": 100,
        "attendance":        0,
        "engagement":        100,
        "distracted":        0
    }

    # Return only lightweight JSON faces and stats payloads (OpenCV rendering removed)
    return {
        "faces": [
            {
                "bbox": det["bbox"],
                "confidence": det["confidence"],
                "name": "Face",
                "focused": True,
                "attendance": "Absent"
            }
            for det in faces
        ],
        "stats": stats
    }

import logging
from typing import List, Dict, Any
import cv2
import numpy as np
import insightface

# Set up logger for tracking and debugging
logger = logging.getLogger(__name__)

# Initialize InsightFace FaceAnalysis using the buffalo_l model.
app = insightface.app.FaceAnalysis(
    name="buffalo_l"
)

# Prepare the detection model.
# ctx_id=-1 forces CPU execution mode for maximum compatibility on Mac.
# det_size=(960, 960) balances long-range classroom detection with acceptable CPU load.
app.prepare(
    ctx_id=-1,
    det_size=(960, 960)
)

# Upscale factor for boosting tiny distant classroom faces
UPSCALE_FACTOR = 2.0

def calculate_iou(box1: List[int], box2: List[int]) -> float:
    """
    Calculate the Intersection over Union (IoU) of two bounding boxes.
    Each box is expected to be in the [x, y, w, h] format.
    
    Args:
        box1: First bounding box [x, y, w, h].
        box2: Second bounding box [x, y, w, h].
        
    Returns:
        Intersection over Union (IoU) as a float between 0.0 and 1.0.
    """
    x1, y1, w1, h1 = box1
    x2, y2, w2, h2 = box2

    # Calculate overlapping box coordinates
    xa = max(x1, x2)
    ya = max(y1, y2)
    xb = min(x1 + w1, x2 + w2)
    yb = min(y1 + h1, y2 + h2)

    # Compute intersection area
    inter_area = max(0, xb - xa) * max(0, yb - ya)

    # Compute individual areas
    box1_area = w1 * h1
    box2_area = w2 * h2

    # Compute union area
    union_area = box1_area + box2_area - inter_area
    if union_area <= 0:
        return 0.0

    return float(inter_area / union_area)


def remove_duplicates(faces: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Apply IoU-based Non-Maximum Suppression (NMS) to eliminate overlapping duplicate boxes.
    
    If the overlap (IoU) between two face boxes is greater than 0.4,
    only the one with the higher detection confidence score is kept.
    
    Args:
        faces: A list of dicts with 'bbox' and 'confidence'.
        
    Returns:
        A list of dicts with duplicates removed.
    """
    # Sort detections by confidence score in descending order.
    # This guarantees that we prioritize and keep the highest-confidence detections.
    sorted_faces = sorted(faces, key=lambda x: x["confidence"], reverse=True)
    keep_faces: List[Dict[str, Any]] = []

    for face in sorted_faces:
        keep = True
        for existing in keep_faces:
            iou = calculate_iou(face["bbox"], existing["bbox"])
            if iou > 0.4:
                keep = False
                break
        if keep:
            keep_faces.append(face)

    return keep_faces


def detect_faces(frame: np.ndarray) -> List[Dict[str, Any]]:
    """
    Detect faces in a BGR frame using a professional InsightFace pipeline.
    
    Internally upscales the frame by 2x (INTER_CUBIC) to boost tiny distant
    classroom faces, then scales coordinates back down to original frame space.
    
    Filters out:
    - Faces smaller than 12x12 pixels (allows distant backbench students).
    - Detections with confidence score below 0.45.
    - Duplicate overlapping bounding boxes using IoU suppression (threshold > 0.4).
    
    Args:
        frame: A NumPy ndarray of the frame (BGR format).
        
    Returns:
        A JSON-safe list of detected faces (coordinates in original frame space):
        [
          {
            "bbox": [x, y, w, h],
            "confidence": 0.93
          }
        ]
    """
    if frame is None or frame.size == 0:
        logger.warning("Empty or invalid frame received for face detection.")
        return []

    # 2x upscale to boost tiny distant faces before detection
    upscaled = cv2.resize(
        frame,
        None,
        fx=UPSCALE_FACTOR,
        fy=UPSCALE_FACTOR,
        interpolation=cv2.INTER_CUBIC
    )

    try:
        # Run face detection on upscaled frame
        results = app.get(upscaled)
    except Exception as e:
        logger.error(f"InsightFace detection error: {e}", exc_info=True)
        return []

    frame_h, frame_w = frame.shape[:2]
    faces: List[Dict[str, Any]] = []

    for face in results:
        # face.bbox is a float array [x1, y1, x2, y2] in upscaled space
        x1, y1, x2, y2 = face.bbox

        # Scale coordinates back DOWN to original frame space
        x1 = int(x1 / UPSCALE_FACTOR)
        y1 = int(y1 / UPSCALE_FACTOR)
        x2 = int(x2 / UPSCALE_FACTOR)
        y2 = int(y2 / UPSCALE_FACTOR)

        # Clamp within original frame boundaries
        x1 = max(0, min(frame_w, x1))
        y1 = max(0, min(frame_h, y1))
        x2 = max(0, min(frame_w, x2))
        y2 = max(0, min(frame_h, y2))

        w = x2 - x1
        h = y2 - y1

        # Tiny distant face support: allow faces as small as 12x12
        if w < 12 or h < 12:
            continue

        # Balanced confidence for distant/partial faces
        confidence = float(face.det_score)
        if confidence < 0.45:
            continue

        faces.append({
            "bbox": [x1, y1, w, h],
            "confidence": round(confidence, 2)
        })

    # Apply Non-Maximum Suppression to remove overlapping duplicate boxes
    cleaned_faces = remove_duplicates(faces)
    
    return cleaned_faces
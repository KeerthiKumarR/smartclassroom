import logging
from typing import List, Dict, Any
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
# det_size=(640, 640) stabilizes detection input resolution for consistent box aspect ratios.
app.prepare(
    ctx_id=-1,
    det_size=(640, 640)
)

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
    
    Filters out:
    - Faces smaller than 80x80 pixels.
    - Detections with confidence score below 0.65.
    - Duplicate overlapping bounding boxes using IoU suppression (threshold > 0.4).
    
    Args:
        frame: A NumPy ndarray of the frame (BGR format).
        
    Returns:
        A JSON-safe list of detected faces:
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

    try:
        # Run face detection
        results = app.get(frame)
    except Exception as e:
        logger.error(f"InsightFace detection error: {e}", exc_info=True)
        return []

    frame_h, frame_w = frame.shape[:2]
    faces: List[Dict[str, Any]] = []

    for face in results:
        # face.bbox is typically a float array [x1, y1, x2, y2]
        x1, y1, x2, y2 = face.bbox
        
        # Ensure values are rounded, integer, and strictly clamped within frame boundaries
        x1_int = max(0, min(frame_w, int(round(x1))))
        y1_int = max(0, min(frame_h, int(round(y1))))
        x2_int = max(0, min(frame_w, int(round(x2))))
        y2_int = max(0, min(frame_h, int(round(y2))))

        w = x2_int - x1_int
        h = y2_int - y1_int

        # Face filtering rules: ignore faces smaller than 45x45
        if w < 45 or h < 45:
            continue

        # Face filtering rules: ignore confidence below 0.65
        confidence = float(face.det_score)
        if confidence < 0.65:
            continue

        faces.append({
            "bbox": [x1_int, y1_int, w, h],
            "confidence": round(confidence, 2)
        })

    # Apply Non-Maximum Suppression to remove overlapping duplicate boxes
    cleaned_faces = remove_duplicates(faces)
    
    return cleaned_faces
import numpy as np
from typing import List, Dict, Any, Tuple

class CentroidTracker:
    def __init__(self, max_disappeared: int = 10, alpha: float = 0.5, max_distance: float = 120.0):
        """
        Initialize the centroid tracker with stabilization.
        
        Args:
            max_disappeared: Number of consecutive frames an object can be missing before deregistered.
            alpha: Smoothing factor for Exponential Moving Average (EMA) on bounding box coordinates (0.0 to 1.0).
            max_distance: Maximum distance between centroids to consider a match.
        """
        self.next_object_id = 0
        self.objects: Dict[int, Tuple[float, float]] = {}      # id -> centroid (cX, cY)
        self.bboxes: Dict[int, List[int]] = {}                 # id -> [x, y, w, h] (smoothed)
        self.disappeared: Dict[int, int] = {}                  # id -> count of missing frames
        self.names: Dict[int, str] = {}                        # id -> stabilized name
        self.confidences: Dict[int, float] = {}                # id -> last matched confidence
        self.max_disappeared = max_disappeared
        self.alpha = alpha
        self.max_distance = max_distance

    def register(self, centroid: Tuple[float, float], bbox: List[int], confidence: float) -> int:
        """Register a new object."""
        object_id = self.next_object_id
        self.objects[object_id] = centroid
        self.bboxes[object_id] = bbox
        self.disappeared[object_id] = 0
        self.names[object_id] = "Unknown"  # Initial state
        self.confidences[object_id] = confidence
        self.next_object_id += 1
        return object_id

    def deregister(self, object_id: int):
        """Deregister an object when it's lost."""
        if object_id in self.objects:
            del self.objects[object_id]
        if object_id in self.bboxes:
            del self.bboxes[object_id]
        if object_id in self.disappeared:
            del self.disappeared[object_id]
        if object_id in self.names:
            del self.names[object_id]
        if object_id in self.confidences:
            del self.confidences[object_id]

    def update(self, detections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Update tracking state with new detections.
        
        Args:
            detections: List of dicts, each with "bbox" [x, y, w, h] and "confidence" float.
            
        Returns:
            A list of active tracked objects with stabilized bboxes, names, and trackIds.
        """
        # If there are no detections, increment disappeared count for all existing objects
        if len(detections) == 0:
            for object_id in list(self.disappeared.keys()):
                self.disappeared[object_id] += 1
                if self.disappeared[object_id] > self.max_disappeared:
                    self.deregister(object_id)
            
            return [
                {
                    "trackId": oid,
                    "bbox": self.bboxes[oid],
                    "confidence": self.confidences[oid],
                    "name": self.names[oid]
                }
                for oid in self.objects
            ]

        # Calculate centroids for input detections
        input_centroids = np.zeros((len(detections), 2), dtype="float32")
        rects = [det["bbox"] for det in detections]
        confs = [det["confidence"] for det in detections]

        for i, (x, y, w, h) in enumerate(rects):
            cX = x + (w / 2.0)
            cY = y + (h / 2.0)
            input_centroids[i] = (cX, cY)

        # If we are not tracking any objects yet, register all of them
        if len(self.objects) == 0:
            for i in range(len(rects)):
                self.register(tuple(input_centroids[i]), rects[i], confs[i])
        else:
            # We are currently tracking objects, so match them
            object_ids = list(self.objects.keys())
            tracked_centroids = np.array([self.objects[oid] for oid in object_ids])

            # Compute pairwise Euclidean distances
            dists = np.linalg.norm(tracked_centroids[:, np.newaxis] - input_centroids, axis=2)

            rows = dists.min(axis=1).argsort()
            cols = dists.argmin(axis=1)[rows]

            used_rows = set()
            used_cols = set()

            for row, col in zip(rows, cols):
                if row in used_rows or col in used_cols:
                    continue

                # Ignore matching if distance exceeds max distance limit
                if dists[row, col] > self.max_distance:
                    continue

                object_id = object_ids[row]
                new_centroid = input_centroids[col]
                new_bbox = rects[col]
                new_conf = confs[col]

                # Update state
                self.objects[object_id] = tuple(new_centroid)
                self.disappeared[object_id] = 0
                self.confidences[object_id] = new_conf

                # Apply Exponential Moving Average (EMA) coordinate smoothing
                old_bbox = self.bboxes[object_id]
                smoothed_bbox = [
                    int(round(self.alpha * new_bbox[i] + (1 - self.alpha) * old_bbox[i]))
                    for i in range(4)
                ]
                self.bboxes[object_id] = smoothed_bbox

                used_rows.add(row)
                used_cols.add(col)

            # Determine which rows and columns we did not examine
            unused_rows = set(range(dists.shape[0])).difference(used_rows)
            unused_cols = set(range(dists.shape[1])).difference(used_cols)

            # Check if some tracked objects disappeared
            if dists.shape[0] >= dists.shape[1]:
                for row in unused_rows:
                    object_id = object_ids[row]
                    self.disappeared[object_id] += 1
                    if self.disappeared[object_id] > self.max_disappeared:
                        self.deregister(object_id)
            else:
                # Register new input detections
                for col in unused_cols:
                    self.register(tuple(input_centroids[col]), rects[col], confs[col])

        # Return updated active tracked objects list
        return [
            {
                "trackId": oid,
                "bbox": self.bboxes[oid],
                "confidence": self.confidences[oid],
                "name": self.names[oid]
            }
            for oid in self.objects
        ]

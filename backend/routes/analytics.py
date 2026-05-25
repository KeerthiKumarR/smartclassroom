from fastapi import APIRouter
from core.database import latest_stats, attendance_db

router = APIRouter()


@router.get("/analytics")
def analytics():
    return {
        "classEngagement":   latest_stats.get("averageEngagement", 0),
        "studentsPresent":   len(attendance_db),
        "distractedStudents": latest_stats.get("distractedCount", 0),
        "facesDetected":     latest_stats.get("facesDetected", 0),
        "focusedCount":      latest_stats.get("focusedCount", 0),
    }

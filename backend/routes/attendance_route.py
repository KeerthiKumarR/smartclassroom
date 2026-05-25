from fastapi import APIRouter
from core.database import attendance_db, reset_attendance

router = APIRouter()


@router.get("/attendance")
def get_attendance():
    return attendance_db


@router.post("/attendance/reset")
def clear_attendance():
    """Reset attendance for a new class session."""
    reset_attendance()
    return {"success": True, "message": "Attendance cleared for new session."}

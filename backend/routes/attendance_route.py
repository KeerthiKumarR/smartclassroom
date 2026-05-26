from fastapi import APIRouter
import json
import os

router = APIRouter()

def resolve_attendance_path():

    base_dir = os.path.dirname(
        os.path.dirname(__file__)
    )

    data_dir = os.path.join(
        base_dir,
        "data"
    )

    os.makedirs(data_dir, exist_ok=True)

    return os.path.join(
        data_dir,
        "attendance.json"
    )

@router.get("/attendance")
async def get_attendance():

    try:

        attendance_path = resolve_attendance_path()

        if not os.path.exists(attendance_path):
            return []

        with open(attendance_path, "r") as f:
            attendance = json.load(f)

        return attendance

    except Exception as e:

        print("Attendance Fetch Error:", e)

        return []
import json
import os
from datetime import datetime

ATTENDANCE_PATH = "backend/data/attendance.json"

def _resolve_attendance_path():
    path = ATTENDANCE_PATH
    dir_name = os.path.dirname(path)
    if not os.path.exists(dir_name) or not dir_name:
        abs_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
        os.makedirs(abs_dir, exist_ok=True)
        path = os.path.join(abs_dir, "attendance.json")
    else:
        os.makedirs(dir_name, exist_ok=True)
    return path

def mark_attendance(name, roll_number):
    path = _resolve_attendance_path()

    if not os.path.exists(path):
        with open(path, "w") as f:
            json.dump([], f)

    with open(path, "r") as f:
        attendance = json.load(f)

    today = datetime.now().strftime("%Y-%m-%d")

    # Prevent duplicate marking
    for record in attendance:
        if (
            record.get("roll_number") == roll_number
            and record.get("date") == today
        ):
            return

    attendance.append({
        "name": name,
        "roll_number": roll_number,
        "date": today,
        "time": datetime.now().strftime("%H:%M:%S"),
        "status": "Present"
    })

    with open(path, "w") as f:
        json.dump(attendance, f, indent=2)

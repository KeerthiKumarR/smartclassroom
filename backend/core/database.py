import os
import json
import pymongo
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

# ─────────────────────────────────────────────
# PERSISTENCE PATHS
# ─────────────────────────────────────────────

DATA_DIR = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "data"
)
ATTENDANCE_PATH = os.path.join(DATA_DIR, "attendance.json")
STUDENTS_PATH = os.path.join(DATA_DIR, "students.json")

os.makedirs(DATA_DIR, exist_ok=True)

# ─────────────────────────────────────────────
# MONGODB CLIENT WITH FALLBACK
# ─────────────────────────────────────────────

mongo_client = None
db = None
use_mongo = False

try:
    print("[database] Connecting to local MongoDB at mongodb://127.0.0.1:27017...")
    # 1.5 seconds selection timeout so startup remains instant if offline
    mongo_client = pymongo.MongoClient("mongodb://127.0.0.1:27017", serverSelectionTimeoutMS=1500)
    mongo_client.server_info()  # Trigger connection handshake check
    db = mongo_client["smart_classroom"]
    use_mongo = True
    print("[database] MongoDB connected successfully!")
except (ConnectionFailure, ServerSelectionTimeoutError, Exception) as e:
    print(f"[database] MongoDB connection failed ({e}). Falling back to local JSON store.")
    use_mongo = False

# ─────────────────────────────────────────────
# IN-MEMORY STATE
# ─────────────────────────────────────────────

students_db: list = []      # Legacy students collection list
attendance_db: list = []    # [{student: str, status: str}, …]

latest_stats: dict = {
    "facesDetected":    0,
    "focusedCount":     0,
    "distractedCount":  0,
    "attendanceCount":  0,
    "averageEngagement": 0,
}

# ─────────────────────────────────────────────
# PERSISTENCE HELPERS
# ─────────────────────────────────────────────

def load_attendance():
    """Restore attendance_db from MongoDB or local JSON file."""
    global attendance_db
    if use_mongo:
        try:
            records = list(db["attendance"].find({}, {"_id": False}))
            attendance_db = records
            print(f"[database] Loaded {len(attendance_db)} attendance record(s) from MongoDB.")
        except Exception as e:
            print(f"[database] Could not load attendance from MongoDB: {e}")
            attendance_db = []
    else:
        if os.path.exists(ATTENDANCE_PATH):
            try:
                with open(ATTENDANCE_PATH, "r") as f:
                    attendance_db = json.load(f)
                print(f"[database] Loaded {len(attendance_db)} attendance record(s) from local JSON.")
            except Exception as e:
                print(f"[database] Could not load attendance from local JSON: {e}")
                attendance_db = []
        else:
            attendance_db = []


def save_attendance():
    """Persist attendance_db to MongoDB or local JSON file."""
    global attendance_db
    if use_mongo:
        try:
            db["attendance"].delete_many({})
            if attendance_db:
                db["attendance"].insert_many(attendance_db)
        except Exception as e:
            print(f"[database] MongoDB attendance save failed: {e}")
    else:
        try:
            with open(ATTENDANCE_PATH, "w") as f:
                json.dump(attendance_db, f, indent=2)
        except Exception as e:
            print(f"[database] Local JSON attendance save failed: {e}")


def reset_attendance():
    """Clear attendance for a new session."""
    global attendance_db
    attendance_db = []
    if use_mongo:
        try:
            db["attendance"].delete_many({})
        except Exception as e:
            print(f"[database] MongoDB attendance reset failed: {e}")
    else:
        save_attendance()


# Load on import
load_attendance()


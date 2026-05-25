# Smart Classroom AI – Setup & Run Guide

## What was fixed

| Area | Problem | Fix |
|---|---|---|
| **Face Store** | All enrolled faces lost on server restart (RAM only) | Faces now persisted to `backend/models/face_store/encodings.pkl` automatically |
| **Recognition** | `recognition.py` was a dead stub returning `students_db[0]` regardless of who was in frame | Fixed – HOG descriptor matching in `face_store.py` is now the single source of truth |
| **Attendance** | Lost on restart; marked "Unknown" students as present | Persisted to `backend/data/attendance.json`; Unknown faces are ignored |
| **Enroll route** | No input validation; used first detection even if tiny | Validates name/roll, picks highest-confidence face, checks minimum crop size |
| **Analyze route** | Unsafe crop (no bounds check); recognised Unknown | Bounds-safe crop; attendance only marked for confirmed identities |
| **YOLO model** | Server crashed immediately if `yolov8n-face.pt` missing | Auto-downloads on first run via ultralytics |
| **Attendance UI** | No way to start a new session | "New Session" button clears attendance via `POST /attendance/reset` |
| **Analytics** | Only 3 fields returned | Now returns all 5 live stats |

---

## Requirements

- Python 3.10+
- Node.js 18+

---

## Backend

```bash
cd backend

# Install dependencies (first time only)
pip install -r requirements.txt

# Run
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The first run downloads `yolov8n-face.pt` (~6 MB) automatically.

Check it's alive: http://localhost:8000/
The response shows how many students are enrolled and how many are present today.

### Data files (auto-created, safe to commit or back up)
- `backend/models/face_store/encodings.pkl` – enrolled face descriptors
- `backend/models/face_store/students.json` – human-readable student list
- `backend/data/attendance.json` – today's attendance

---

## Frontend

```bash
cd frontend
npm install    # first time only
npm run dev
```

Open http://localhost:3000/smart-classroom

---

## Workflow

1. **Enroll students** – Click "Enroll Student Face", fill in name + roll number, position face in frame, click "Capture & Enroll". The face is saved to disk permanently.
2. **Run the session** – The webcam panel analyses frames every 500 ms. Recognised students are marked present automatically.
3. **Start a new session** – Click "New Session" in the Attendance Register to clear today's records (enrolled faces are kept).

---

## Tuning face recognition

In `backend/core/face_store.py`, adjust `RECOGNITION_THRESHOLD` (default `0.58`):
- **Raise** (e.g. 0.65) → fewer false positives, may miss some faces
- **Lower** (e.g. 0.50) → more matches, may get false positives

Re-enrol a student multiple times (different lighting/angles) to improve accuracy – each enrolment averages the descriptors.

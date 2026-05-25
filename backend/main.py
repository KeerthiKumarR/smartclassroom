from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.analyze          import router as analyze_router
from routes.enroll           import router as enroll_router
from routes.attendance_route import router as attendance_router
from routes.analytics        import router as analytics_router

app = FastAPI(title="Smart Classroom AI", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze_router)
app.include_router(enroll_router)
app.include_router(attendance_router)
app.include_router(analytics_router)


@app.get("/")
def home():
    from core.face_store import KNOWN_FACES
    from core.database   import attendance_db
    return {
        "status":           "Smart Classroom AI Running",
        "enrolledStudents": len(KNOWN_FACES),
        "attendanceToday":  len(attendance_db),
    }

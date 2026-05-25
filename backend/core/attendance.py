from core.database import attendance_db, save_attendance


def mark_attendance(student: str) -> bool:
    """
    Mark *student* as Present if not already recorded in this session.
    Returns True when a new record is added, False if already present.
    """
    if not student or student == "Unknown":
        return False

    # Deduplicate by student name (case-insensitive)
    already = any(
        r["student"].lower() == student.lower()
        for r in attendance_db
    )

    if already:
        return False

    attendance_db.append({
        "student": student,
        "status":  "Present"
    })
    save_attendance()     # persist immediately
    return True

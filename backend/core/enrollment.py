from core.database import students_db


def enroll_student(
    student_name,
    roll_number,
    descriptor
):

    students_db.append({
        "studentName": student_name,
        "rollNumber": roll_number,
        "descriptor": descriptor
    })

    return True

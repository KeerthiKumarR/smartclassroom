def detect_focus(face):
    try:
        # InsightFace keypoints
        left_eye = face.kps[0]
        right_eye = face.kps[1]
        nose = face.kps[2]

        # Eye center
        eye_center_x = (
            left_eye[0] + right_eye[0]
        ) / 2

        eye_center_y = (
            left_eye[1] + right_eye[1]
        ) / 2

        # Horizontal head turn
        nose_offset = abs(
            nose[0] - eye_center_x
        )

        # Vertical head tilt
        vertical_offset = (
            nose[1] - eye_center_y
        )

        # Looking sideways
        if nose_offset > 20:
            return "Distracted"

        # Looking downward
        if vertical_offset > 35:
            return "Distracted"

        return "Focused"

    except Exception:
        return "Focused"
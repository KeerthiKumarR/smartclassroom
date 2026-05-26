def detect_focus(face):

    try:

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

        # Sideways head movement
        horizontal_offset = abs(
            nose[0] - eye_center_x
        )

        # Looking downward
        vertical_offset = (
            nose[1] - eye_center_y
        )

        # Sideways looking
        if horizontal_offset > 20:
            return "Drifting"

        # Looking downward
        if vertical_offset > 35:
            return "Drifting"

        return "Focused"

    except Exception:
        return "Focused"
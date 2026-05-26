def calculate_engagement(bbox, frame_shape, confidence=0.9):
    """
    Heuristic engagement based on face size relative to frame and detection confidence.
    High confidence face = looking at camera = Focused.
    Low confidence face = looking away/distracted.
    """
    x, y, bw, bh = bbox
    frame_h, frame_w = frame_shape[:2]

    # Face area ratio
    face_area_ratio = (bw * bh) / (frame_w * frame_h)

    # In a classroom setting at 720p, faces are usually between 30x30 and 100x100.
    # So we scale the threshold significantly down.
    # Also, we factor in face detection confidence.
    base_score = int(65 + (confidence * 30)) # range 65 to 95 based on confidence
    
    # Tiny deterministic variation based on bbox coordinates to make the UI feel live and active
    variation = int((x + y + bw + bh) % 7) - 3 # -3 to +3
    score = base_score + variation

    # If the face is extremely small and towards the margins, we flag them as slightly distracted
    if face_area_ratio < 0.0015 and (x < frame_w * 0.15 or x > frame_w * 0.85):
        score -= 15

    # Bound the score
    score = max(40, min(99, score))

    if score >= 75:
        state = "Focused"
    elif score >= 60:
        state = "Neutral"
    else:
        state = "Distracted"

    return {
        "state": state,
        "score": score
    }

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

        # Normalize using eye distance
        eye_distance = abs(
            right_eye[0] - left_eye[0]
        )

        if eye_distance < 1:
            return "Focused"

        horizontal_offset = abs(
            nose[0] - eye_center_x
        ) / eye_distance

        vertical_offset = abs(
            nose[1] - eye_center_y
        ) / eye_distance

        print(
            "H:",
            round(horizontal_offset, 2),
            "V:",
            round(vertical_offset, 2)
        )

        # SIDEWAYS LOOK
        if horizontal_offset > 0.38:
            return "Drifting"

        # LOOKING DOWN
        if vertical_offset > 0.95:
            return "Drifting"

        return "Focused"

    except Exception as e:

        print("Focus error:", e)

        return "Focused"
    
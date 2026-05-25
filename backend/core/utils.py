import base64
import cv2
import numpy as np


def decode_base64_image(data):

    if not data:
        return None

    encoded = data.split(",")[-1]

    image_bytes = base64.b64decode(encoded)

    image_array = np.frombuffer(
        image_bytes,
        dtype=np.uint8
    )

    image = cv2.imdecode(
        image_array,
        cv2.IMREAD_COLOR
    )

    return image


def encode_image_to_base64(image: np.ndarray) -> str:
    """
    Encode an OpenCV BGR image as a JPEG base64 string with MIME prefix.
    """
    if image is None or image.size == 0:
        return ""
    _, buffer = cv2.imencode(".jpg", image)
    encoded = base64.b64encode(buffer).decode("utf-8")
    return f"data:image/jpeg;base64,{encoded}"

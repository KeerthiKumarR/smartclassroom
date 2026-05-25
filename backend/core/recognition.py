"""
recognition.py – thin shim kept for backwards compatibility.
All real logic lives in face_store.py.
"""
from core.face_store import recognize_face   # re-export

__all__ = ["recognize_face"]

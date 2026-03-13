"""
BroPhysio - One Euro Filter für Pose-Keypoints
==============================================
Temporaler Glättungsfilter für Ganganalyse.
"""

import numpy as np
from typing import List, Dict, Any


class OneEuroFilter:
    """One Euro Filter für zeitliche Glättung."""

    def __init__(self, freq: float = 30.0, mincutoff: float = 1.0, beta: float = 0.007, dcutoff: float = 1.0):
        self.freq = freq
        self.mincutoff = mincutoff
        self.beta = beta
        self.dcutoff = dcutoff
        self.x_prev = self.dx_prev = self.t_prev = None

    def _alpha(self, cutoff: float) -> float:
        tau = 1.0 / (2 * np.pi * cutoff)
        return 1.0 / (1.0 + tau * self.freq)

    def filter(self, x: float, t: float = None) -> float:
        if self.x_prev is None:
            self.x_prev, self.dx_prev = x, 0.0
            self.t_prev = t if t is not None else 0.0
            return x
        dt = (t - self.t_prev) if t is not None and t != self.t_prev else 1.0 / self.freq
        if t is not None:
            self.t_prev = t
        alpha_d = self._alpha(self.dcutoff)
        dx = (x - self.x_prev) / dt
        dx_filtered = alpha_d * dx + (1 - alpha_d) * self.dx_prev
        cutoff = self.mincutoff + self.beta * abs(dx_filtered)
        alpha = self._alpha(cutoff)
        x_filtered = alpha * x + (1 - alpha) * self.x_prev
        self.x_prev, self.dx_prev = x_filtered, dx_filtered
        return x_filtered


class PoseOneEuroFilter:
    """One Euro Filter für alle Keypoints."""

    def __init__(self, num_keypoints: int = 17, freq: float = 30.0, mincutoff: float = 1.0, beta: float = 0.007):
        self.filters_x = [OneEuroFilter(freq, mincutoff, beta) for _ in range(num_keypoints)]
        self.filters_y = [OneEuroFilter(freq, mincutoff, beta) for _ in range(num_keypoints)]

    def filter_frame(self, keypoints: List[List[float]], timestamp: float = None) -> List[List[float]]:
        filtered = []
        for i, kp in enumerate(keypoints):
            if len(kp) >= 2:
                x, y = kp[0], kp[1]
                conf = kp[2] if len(kp) > 2 else 1.0
                if i < len(self.filters_x):
                    filtered.append([
                        self.filters_x[i].filter(x, timestamp),
                        self.filters_y[i].filter(y, timestamp),
                        conf,
                    ])
                else:
                    filtered.append([x, y, conf])
            else:
                filtered.append(kp)
        return filtered

    def filter_sequence(self, keypoints_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        result = []
        for f in keypoints_data:
            kp = f.get("keypoints", [])
            if kp:
                result.append({
                    "frame": f.get("frame"),
                    "timestamp": f.get("timestamp"),
                    "keypoints": self.filter_frame(kp, f.get("timestamp")),
                })
            else:
                result.append(f)
        return result


def apply_one_euro_filter(
    keypoints_data: List[Dict[str, Any]],
    fps: float = 30.0, mincutoff: float = 1.0, beta: float = 0.007
) -> List[Dict[str, Any]]:
    """Wendet One Euro Filter auf Keypoint-Sequenz an (Pipeline-Schritt 2: Glättung)."""
    if not keypoints_data:
        return []
    num_kp = 17
    for f in keypoints_data:
        kp = f.get("keypoints")
        if kp and len(kp) > 0:
            num_kp = len(kp)
            break
    return PoseOneEuroFilter(num_kp, fps, mincutoff, beta).filter_sequence(keypoints_data)

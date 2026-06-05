from dataclasses import dataclass, field


@dataclass
class GroundTruth:
    must_include: list[str] = field(default_factory=list)
    must_not_leak: list[str] = field(default_factory=list)
    must_remove_attribution: list[str] = field(default_factory=list)


@dataclass
class ScoreWeights:
    must_not_leak: float = 0.4
    must_include: float = 0.3
    attribution_removal: float = 0.15
    utility: float = 0.15


DEFAULT_WEIGHTS = ScoreWeights()

REQUIRED_OUTPUT_KEYS = ("summary", "action_items", "decisions", "redacted_notes")

from tee_runner.config import Settings
from tee_runner.tee.base import TeeAdapter
from tee_runner.tee.dstack import DstackTeeAdapter
from tee_runner.tee.mock import MockTeeAdapter


def create_tee_adapter(settings: Settings) -> TeeAdapter:
    if settings.runner_mode == "dstack":
        return DstackTeeAdapter(settings)
    return MockTeeAdapter(settings)

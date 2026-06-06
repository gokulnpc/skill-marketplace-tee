import os

from fastapi import FastAPI, HTTPException, Request, Response

from sandbox_manager.session_manager import SandboxStore

app = FastAPI(title="SkillVault Sandbox Manager", version="0.1.0")
store = SandboxStore()
MODEL_PROXY_URL = os.environ.get("MODEL_PROXY_URL", "http://localhost:8080")
CONTAINER_RUNTIME = os.environ.get("CONTAINER_RUNTIME", "runc")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "container_runtime": CONTAINER_RUNTIME}


@app.post("/v1/sessions/{session_id}/prepare")
async def prepare_session(session_id: str, request: Request) -> dict[str, bool]:
    zip_bytes = await request.body()
    token = request.headers.get("X-Session-Token", "")
    if not zip_bytes:
        raise HTTPException(status_code=400, detail="Empty package")
    try:
        store.prepare(session_id, zip_bytes, MODEL_PROXY_URL, token)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"prepared": True}


@app.post("/v1/sessions/{session_id}/papers")
async def prepare_papers(session_id: str, request: Request) -> dict[str, bool]:
    zip_bytes = await request.body()
    if not zip_bytes:
        raise HTTPException(status_code=400, detail="Empty papers zip")
    try:
        store.prepare_papers(session_id, zip_bytes)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"papers_loaded": True}


@app.get("/v1/sessions/{session_id}/artifacts/{artifact_name}")
def get_artifact(session_id: str, artifact_name: str) -> Response:
    try:
        data = store.get_artifact(session_id, artifact_name)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    if data is None:
        raise HTTPException(status_code=404, detail="Artifact not found")
    media = "application/octet-stream"
    if artifact_name.endswith(".pptx"):
        media = "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    return Response(content=data, media_type=media)


@app.post("/v1/sessions/{session_id}/run")
async def run_session(session_id: str, body: dict) -> dict[str, str]:
    try:
        output = store.run_sample(
            session_id,
            sample_id=str(body.get("sample_id", "sample_001")),
            transcript=str(body.get("transcript", "")),
            with_skill=bool(body.get("with_skill", True)),
            slide_task=bool(body.get("slide_task", False)),
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return {"output": output}


@app.delete("/v1/sessions/{session_id}")
def destroy_session(session_id: str) -> dict[str, bool]:
    store.destroy(session_id)
    return {"destroyed": True}


def run() -> None:
    import uvicorn

    port = int(os.environ.get("SANDBOX_PORT", "8091"))
    uvicorn.run("sandbox_manager.main:app", host="0.0.0.0", port=port, reload=False)


if __name__ == "__main__":
    run()

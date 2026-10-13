from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import (
    auth,
    evaluations,
    export,
    imports,
    operator_periods,
    operators,
    periods,
    scoring,
    supervisor_periods,
    users,
)

app = FastAPI(title="Redkom ISS", docs_url="/api/docs", openapi_url="/api/openapi.json")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://redcom-iss-frontend.vercel.app",
        "https://redcom-iss.cloudpub.ru",
        "https://redcom-iss-main.layero.app",
        "https://redcom-iss-call.layero.app",
        "http://localhost:5173",
        "http://localhost:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(operators.router)
app.include_router(periods.router)
app.include_router(evaluations.router)
app.include_router(operator_periods.router)
app.include_router(supervisor_periods.router)
app.include_router(scoring.router)
app.include_router(export.router)
app.include_router(imports.router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}

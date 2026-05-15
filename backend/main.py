from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
import models

# Crear tablas (idealmente usaríamos Alembic, pero para iniciar rápidamente con Docker...)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Gestión Administrativa Fab Lab UNCP", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # En prod debería ser la URL del frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Bienvenido a la API del Fab Lab UNCP"}

from routers import auth_router, users_router, services_router, ml_router

app.include_router(auth_router.router)
app.include_router(users_router.router)
app.include_router(services_router.router)
app.include_router(ml_router.router)

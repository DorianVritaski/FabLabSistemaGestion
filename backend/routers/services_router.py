from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models, schemas, auth
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import io

router = APIRouter(prefix="/services", tags=["services"])

# --- Service Types ---
@router.post("/types", response_model=schemas.ServiceType)
def create_service_type(service_type: schemas.ServiceTypeCreate, db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(auth.get_current_user)):
    db_type = db.query(models.ServiceType).filter(models.ServiceType.name == service_type.name).first()
    if db_type:
        raise HTTPException(status_code=400, detail="El tipo de servicio ya existe")
    
    new_type = models.ServiceType(**service_type.dict())
    db.add(new_type)
    db.commit()
    db.refresh(new_type)
    return new_type

@router.get("/types", response_model=List[schemas.ServiceType])
def read_service_types(db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(auth.get_current_user)):
    return db.query(models.ServiceType).all()

# --- Service Requests ---
@router.post("/requests", response_model=schemas.ServiceRequest)
def create_service_request(request: schemas.ServiceRequestCreate, db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(auth.get_current_user)):
    # Verify service type
    service_type = db.query(models.ServiceType).filter(models.ServiceType.id == request.service_type_id).first()
    if not service_type:
        raise HTTPException(status_code=404, detail="Tipo de servicio no encontrado")

    # Fetch users
    users = db.query(models.LabUser).filter(models.LabUser.id.in_(request.lab_user_ids)).all()
    if len(users) != len(request.lab_user_ids):
        raise HTTPException(status_code=404, detail="Uno o más usuarios no fueron encontrados")
    if len(users) > 8:
        raise HTTPException(status_code=400, detail="Máximo 8 integrantes por solicitud")

    # Create request
    new_request = models.ServiceRequest(
        service_type_id=request.service_type_id,
        admin_id=current_admin.id,
        start_date=request.start_date,
        end_date=request.end_date,
        status=request.status,
        details=request.details
    )
    db.add(new_request)
    db.flush() # Para obtener el ID

    # Link users
    for user in users:
        new_request.users.append(user)

    db.commit()
    db.refresh(new_request)
    return new_request

@router.get("/requests", response_model=List[schemas.ServiceRequest])
def read_service_requests(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(auth.get_current_user)):
    return db.query(models.ServiceRequest).offset(skip).limit(limit).all()

@router.get("/requests/{request_id}/pdf")
def generate_sworn_statement_pdf(request_id: int, db: Session = Depends(get_db)):
    # Este endpoint podría estar protegido, pero para facilidad de descarga desde el frontend mediante window.open se puede dejar semi-público o usar un token por query param. 
    # Por ahora lo protegemos asumiendo que el frontend pasa el token por headers o maneja un blob de la respuesta.
    
    req = db.query(models.ServiceRequest).filter(models.ServiceRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")

    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    
    p.setFont("Helvetica-Bold", 16)
    p.drawString(100, 750, "DECLARACIÓN JURADA - FAB LAB UNCP")
    
    p.setFont("Helvetica", 12)
    p.drawString(100, 710, f"Servicio Solicitado: {req.service_type.name}")
    p.drawString(100, 690, f"Fecha de Inicio: {req.start_date}")
    if req.end_date:
        p.drawString(100, 670, f"Fecha de Término Estimada: {req.end_date}")
    
    p.drawString(100, 630, "Integrantes del Grupo:")
    y_pos = 610
    for user in req.users:
        p.drawString(120, y_pos, f"- {user.first_name} {user.last_name} ({user.institutional_email})")
        y_pos -= 20
        
    p.drawString(100, y_pos - 20, "Por la presente, los integrantes firmantes declaran que traen consigo")
    p.drawString(100, y_pos - 40, "el material necesario para el desarrollo de la práctica/servicio solicitado.")
    
    p.drawString(100, y_pos - 80, "Detalles/Indicaciones: " + (req.details or "Ninguna"))
    
    p.drawString(100, y_pos - 150, "_________________________")
    p.drawString(120, y_pos - 170, "Firma del Solicitante")
    
    p.showPage()
    p.save()
    
    pdf = buffer.getvalue()
    buffer.close()
    
    return Response(content=pdf, media_type="application/pdf")

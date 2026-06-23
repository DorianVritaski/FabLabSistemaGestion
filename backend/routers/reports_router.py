from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date
import os
import pandas as pd
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

from database import get_db
import models, auth

router = APIRouter(prefix="/reports", tags=["reports"])

# --- Estadísticas (HU23) ---
@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    # 1. Servicios por Tipo
    services_by_type = db.query(
        models.ServiceType.name, 
        func.count(models.ServiceRequest.id).label('count')
    ).outerjoin(models.ServiceRequest).group_by(models.ServiceType.name).all()
    
    # 2. Uso de Máquinas (Horas Acumuladas)
    machine_usage = db.query(
        models.Machine.name,
        models.Machine.accumulated_hours
    ).all()
    
    # 3. Inventario Crítico
    critical_inventory = db.query(
        models.InventoryItem.name,
        models.InventoryItem.current_stock,
        models.InventoryItem.minimum_stock
    ).filter(models.InventoryItem.current_stock <= models.InventoryItem.minimum_stock).all()
    
    # 4. Usuarios por Tipo
    users_by_type = db.query(
        models.LabUser.user_type,
        func.count(models.LabUser.id).label('count')
    ).group_by(models.LabUser.user_type).all()

    return {
        "services_by_type": [{"name": r[0], "value": r[1]} for r in services_by_type],
        "machine_usage": [{"name": r[0], "hours": r[1]} for r in machine_usage],
        "critical_inventory": [{"name": r[0], "stock": r[1], "min": r[2]} for r in critical_inventory],
        "users_by_type": [{"name": r[0], "value": r[1]} for r in users_by_type],
    }

# --- Exportación (HU21, HU22) ---
@router.get("/export")
def export_data(
    module: str = Query(..., description="machines, inventory, services, users"),
    format: str = Query("excel", description="excel or pdf"),
    start_date: str = Query(None, description="YYYY-MM-DD"),
    end_date: str = Query(None, description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
    current_admin: models.AdminUser = Depends(auth.RoleChecker(["admin"]))
):
    query = None
    columns = []
    data = []
    title = ""

    # Parse dates if provided
    start_dt = datetime.strptime(start_date, "%Y-%m-%d").date() if start_date else None
    end_dt = datetime.strptime(end_date, "%Y-%m-%d").date() if end_date else None

    if module == "machines":
        title = "Reporte de Uso de Máquinas"
        q = db.query(models.MachineUsage).join(models.Machine)
        if start_dt: q = q.filter(models.MachineUsage.date >= start_dt)
        if end_dt: q = q.filter(models.MachineUsage.date <= end_dt)
        
        columns = ["ID", "Máquina", "Horas", "Fecha", "Descripción"]
        data = [[u.id, u.machine.name, u.hours_used, u.date.strftime("%Y-%m-%d"), u.description or ""] for u in q.all()]
        
    elif module == "inventory":
        title = "Reporte de Transacciones de Inventario"
        q = db.query(models.InventoryTransaction).join(models.InventoryItem)
        if start_dt: q = q.filter(models.InventoryTransaction.date >= start_dt)
        if end_dt: q = q.filter(models.InventoryTransaction.date <= end_dt)
        
        columns = ["ID", "Insumo", "Tipo", "Cantidad", "Fecha", "Descripción"]
        data = [[t.id, t.item.name, "Entrada" if t.type == "in" else "Salida", t.quantity, t.date.strftime("%Y-%m-%d"), t.description or ""] for t in q.all()]
        
    elif module == "services":
        title = "Reporte de Servicios Solicitados"
        q = db.query(models.ServiceRequest).join(models.ServiceType)
        if start_dt: q = q.filter(models.ServiceRequest.start_date >= start_dt)
        if end_dt: q = q.filter(models.ServiceRequest.start_date <= end_dt)
        
        columns = ["ID", "Tipo de Servicio", "Estado", "Inicio", "Fin", "Detalles"]
        data = [[s.id, s.service_type.name, s.status, s.start_date.strftime("%Y-%m-%d"), s.end_date.strftime("%Y-%m-%d") if s.end_date else "", s.details or ""] for s in q.all()]
        
    elif module == "users":
        title = "Reporte de Usuarios Registrados"
        q = db.query(models.LabUser)
        if start_dt: q = q.filter(models.LabUser.registration_date >= start_dt)
        if end_dt: q = q.filter(models.LabUser.registration_date <= end_dt)
        
        columns = ["ID", "Nombre Completo", "DNI", "Tipo", "Email"]
        data = [[u.id, f"{u.first_name} {u.last_name}", u.dni or "", u.user_type, u.institutional_email] for u in q.all()]
        
    else:
        raise HTTPException(status_code=400, detail="Módulo no válido")

    if not data:
        raise HTTPException(status_code=404, detail="No hay datos en el rango seleccionado")

    os.makedirs("/tmp/reports", exist_ok=True)
    filename_base = f"report_{module}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    if format.lower() == "excel":
        file_path = f"/tmp/reports/{filename_base}.xlsx"
        df = pd.DataFrame(data, columns=columns)
        df.to_excel(file_path, index=False)
        return FileResponse(file_path, filename=f"{title}.xlsx", media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        
    elif format.lower() == "pdf":
        file_path = f"/tmp/reports/{filename_base}.pdf"
        doc = SimpleDocTemplate(file_path, pagesize=letter)
        elements = []
        
        styles = getSampleStyleSheet()
        elements.append(Paragraph(title, styles['Title']))
        elements.append(Spacer(1, 12))
        if start_dt or end_dt:
            period_text = f"Período: {start_dt or 'Inicio'} al {end_dt or 'Actualidad'}"
            elements.append(Paragraph(period_text, styles['Normal']))
            elements.append(Spacer(1, 12))
            
        # Table data
        table_data = [columns] + data
        t = Table(table_data)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1976d2')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f5f5f5')),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        elements.append(t)
        doc.build(elements)
        
        return FileResponse(file_path, filename=f"{title}.pdf", media_type='application/pdf')
        
    else:
        raise HTTPException(status_code=400, detail="Formato no válido")

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models, schemas, auth
from datetime import datetime, date

router = APIRouter(prefix="/machines", tags=["machines"])

# --- Machines ---
@router.post("", response_model=schemas.Machine)
def create_machine(machine: schemas.MachineCreate, db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(auth.get_current_user)):
    new_machine = models.Machine(**machine.dict())
    db.add(new_machine)
    db.commit()
    db.refresh(new_machine)
    return new_machine

@router.get("", response_model=List[schemas.Machine])
def read_machines(db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(auth.get_current_user)):
    return db.query(models.Machine).all()

@router.put("/{machine_id}", response_model=schemas.Machine)
def update_machine(machine_id: int, machine: schemas.MachineCreate, db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(auth.get_current_user)):
    db_machine = db.query(models.Machine).filter(models.Machine.id == machine_id).first()
    if not db_machine:
        raise HTTPException(status_code=404, detail="Máquina no encontrada")
    
    for key, value in machine.dict().items():
        setattr(db_machine, key, value)
    
    db.commit()
    db.refresh(db_machine)
    return db_machine

# --- Machine Usages ---
@router.post("/{machine_id}/usages", response_model=schemas.MachineUsage)
def create_machine_usage(machine_id: int, usage: schemas.MachineUsageCreate, db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(auth.get_current_user)):
    db_machine = db.query(models.Machine).filter(models.Machine.id == machine_id).first()
    if not db_machine:
        raise HTTPException(status_code=404, detail="Máquina no encontrada")

    new_usage = models.MachineUsage(**usage.dict(), machine_id=machine_id)
    if new_usage.date is None:
        new_usage.date = date.today()

    db_machine.accumulated_hours += usage.hours_used
    
    db.add(new_usage)
    db.commit()
    db.refresh(new_usage)
    return new_usage

@router.get("/{machine_id}/usages", response_model=List[schemas.MachineUsage])
def get_machine_usages(machine_id: int, db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(auth.get_current_user)):
    return db.query(models.MachineUsage).filter(models.MachineUsage.machine_id == machine_id).order_by(models.MachineUsage.date.desc()).all()


# --- Machine Incidents ---
@router.post("/{machine_id}/incidents", response_model=schemas.MachineIncident)
def create_machine_incident(machine_id: int, incident: schemas.MachineIncidentCreate, db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(auth.get_current_user)):
    db_machine = db.query(models.Machine).filter(models.Machine.id == machine_id).first()
    if not db_machine:
        raise HTTPException(status_code=404, detail="Máquina no encontrada")

    new_incident = models.MachineIncident(**incident.dict(), machine_id=machine_id)
    if new_incident.date is None:
        new_incident.date = date.today()

    db_machine.status = "out_of_order" # Assuming an incident puts it out of order
    
    db.add(new_incident)
    db.commit()
    db.refresh(new_incident)
    return new_incident

@router.put("/{machine_id}/incidents/{incident_id}/resolve", response_model=schemas.MachineIncident)
def resolve_machine_incident(machine_id: int, incident_id: int, db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(auth.get_current_user)):
    db_incident = db.query(models.MachineIncident).filter(models.MachineIncident.id == incident_id, models.MachineIncident.machine_id == machine_id).first()
    if not db_incident:
        raise HTTPException(status_code=404, detail="Incidente no encontrado")
    
    db_incident.status = "resolved"
    
    # Check if there are other open incidents, if not, put back to active
    open_incidents = db.query(models.MachineIncident).filter(models.MachineIncident.machine_id == machine_id, models.MachineIncident.status == "open").count()
    if open_incidents == 0:
        db_machine = db.query(models.Machine).filter(models.Machine.id == machine_id).first()
        db_machine.status = "active"

    db.commit()
    db.refresh(db_incident)
    return db_incident

# --- Machine Maintenances ---
@router.post("/{machine_id}/maintenances", response_model=schemas.MachineMaintenance)
def create_machine_maintenance(machine_id: int, maintenance: schemas.MachineMaintenanceCreate, db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(auth.get_current_user)):
    db_machine = db.query(models.Machine).filter(models.Machine.id == machine_id).first()
    if not db_machine:
        raise HTTPException(status_code=404, detail="Máquina no encontrada")

    new_maintenance = models.MachineMaintenance(**maintenance.dict(), machine_id=machine_id)
    if new_maintenance.date is None:
        new_maintenance.date = date.today()

    if maintenance.type == "preventive":
        # Reset accumulated hours after preventive maintenance
        db_machine.accumulated_hours = 0.0
    
    db_machine.status = "active" # Assume maintenance fixes the machine
    
    db.add(new_maintenance)
    db.commit()
    db.refresh(new_maintenance)
    return new_maintenance

# --- Machine Report ---
@router.get("/{machine_id}/report", response_model=schemas.MachineReport)
def get_machine_report(machine_id: int, db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(auth.get_current_user)):
    db_machine = db.query(models.Machine).filter(models.Machine.id == machine_id).first()
    if not db_machine:
        raise HTTPException(status_code=404, detail="Máquina no encontrada")

    usages = db.query(models.MachineUsage).filter(models.MachineUsage.machine_id == machine_id).order_by(models.MachineUsage.date.desc()).all()
    incidents = db.query(models.MachineIncident).filter(models.MachineIncident.machine_id == machine_id).order_by(models.MachineIncident.date.desc()).all()
    maintenances = db.query(models.MachineMaintenance).filter(models.MachineMaintenance.machine_id == machine_id).order_by(models.MachineMaintenance.date.desc()).all()

    return {
        "machine": db_machine,
        "usages": usages,
        "incidents": incidents,
        "maintenances": maintenances
    }

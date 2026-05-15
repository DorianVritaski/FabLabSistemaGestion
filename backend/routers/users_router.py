from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models, schemas, auth

router = APIRouter(prefix="/lab-users", tags=["lab_users"])

@router.post("/", response_model=schemas.LabUser)
def create_lab_user(user: schemas.LabUserCreate, db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(auth.get_current_user)):
    db_user = db.query(models.LabUser).filter(models.LabUser.institutional_email == user.institutional_email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="El correo institucional ya está registrado")
    
    new_user = models.LabUser(**user.dict())
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.get("/", response_model=List[schemas.LabUser])
def read_lab_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(auth.get_current_user)):
    users = db.query(models.LabUser).offset(skip).limit(limit).all()
    return users

@router.get("/{user_id}", response_model=schemas.LabUser)
def read_lab_user(user_id: int, db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(auth.get_current_user)):
    user = db.query(models.LabUser).filter(models.LabUser.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user

@router.put("/{user_id}", response_model=schemas.LabUser)
def update_lab_user(user_id: int, user_data: schemas.LabUserCreate, db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(auth.get_current_user)):
    db_user = db.query(models.LabUser).filter(models.LabUser.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Check if new email/dni conflicts with others
    conflict_user = db.query(models.LabUser).filter(
        (models.LabUser.id != user_id) & 
        ((models.LabUser.institutional_email == user_data.institutional_email) | (models.LabUser.dni == user_data.dni))
    ).first()
    if conflict_user:
        raise HTTPException(status_code=400, detail="El correo institucional o DNI ya está registrado por otro usuario")

    for key, value in user_data.dict().items():
        setattr(db_user, key, value)
    
    db.commit()
    db.refresh(db_user)
    return db_user

@router.delete("/{user_id}")
def delete_lab_user(user_id: int, db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(auth.get_current_user)):
    db_user = db.query(models.LabUser).filter(models.LabUser.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    db.delete(db_user)
    db.commit()
    return {"message": "Usuario eliminado exitosamente"}

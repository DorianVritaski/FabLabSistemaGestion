from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import get_db
import models, schemas, auth
from typing import List

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login", response_model=schemas.Token)
def login_for_access_token(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    user = db.query(models.AdminUser).filter(models.AdminUser.username == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/register", response_model=schemas.AdminUser)
def register_admin(user: schemas.AdminUserCreate, db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(auth.RoleChecker(["admin"]))):
    # Protegido, solo admin puede crear otros admins
    db_user = db.query(models.AdminUser).filter(models.AdminUser.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="El usuario ya está registrado")
    
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.AdminUser(
        username=user.username,
        hashed_password=hashed_password,
        role=user.role,
        is_active=user.is_active
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.get("/me", response_model=schemas.AdminUser)
def read_users_me(current_user: models.AdminUser = Depends(auth.get_current_user)):
    return current_user

@router.get("/admins", response_model=List[schemas.AdminUser])
def get_all_admins(db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(auth.RoleChecker(["admin"]))):
    return db.query(models.AdminUser).order_by(models.AdminUser.id.desc()).all()

@router.put("/admins/{admin_id}", response_model=schemas.AdminUser)
def update_admin(admin_id: int, user_data: schemas.AdminUserCreate, db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(auth.RoleChecker(["admin"]))):
    db_user = db.query(models.AdminUser).filter(models.AdminUser.id == admin_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Administrador no encontrado")
    
    conflict = db.query(models.AdminUser).filter(models.AdminUser.username == user_data.username, models.AdminUser.id != admin_id).first()
    if conflict:
        raise HTTPException(status_code=400, detail="El nombre de usuario ya está en uso")
        
    db_user.username = user_data.username
    db_user.role = user_data.role
    db_user.is_active = user_data.is_active
    
    if user_data.password:
        db_user.hashed_password = auth.get_password_hash(user_data.password)
        
    db.commit()
    db.refresh(db_user)
    return db_user

@router.delete("/admins/{admin_id}")
def delete_admin(admin_id: int, db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(auth.RoleChecker(["admin"]))):
    if admin_id == current_admin.id:
        raise HTTPException(status_code=400, detail="No puedes eliminarte a ti mismo")
        
    db_user = db.query(models.AdminUser).filter(models.AdminUser.id == admin_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Administrador no encontrado")
        
    db.delete(db_user)
    db.commit()
    return {"message": "Administrador eliminado exitosamente"}

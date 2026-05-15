from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, date

# --- Token Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# --- Admin User Schemas ---
class AdminUserBase(BaseModel):
    username: str
    role: Optional[str] = "admin"
    is_active: Optional[bool] = True

class AdminUserCreate(AdminUserBase):
    password: str

class AdminUser(AdminUserBase):
    id: int

    class Config:
        orm_mode = True

# --- Lab User Schemas ---
class LabUserBase(BaseModel):
    first_name: str
    last_name: str
    dni: Optional[str] = None
    phone_number: Optional[str] = None
    user_type: str
    career: Optional[str] = None
    institutional_email: EmailStr

class LabUserCreate(LabUserBase):
    pass

class LabUser(LabUserBase):
    id: int
    registration_date: datetime

    class Config:
        orm_mode = True

# --- Service Type Schemas ---
class ServiceTypeBase(BaseModel):
    name: str
    description: Optional[str] = None

class ServiceTypeCreate(ServiceTypeBase):
    pass

class ServiceType(ServiceTypeBase):
    id: int

    class Config:
        orm_mode = True

# --- Service Request Schemas ---
class ServiceRequestBase(BaseModel):
    service_type_id: int
    start_date: date
    end_date: Optional[date] = None
    status: Optional[str] = "pending"
    details: Optional[str] = None

class ServiceRequestCreate(ServiceRequestBase):
    lab_user_ids: List[int]

class ServiceRequest(ServiceRequestBase):
    id: int
    admin_id: int
    created_at: datetime
    service_type: ServiceType
    users: List[LabUser]

    class Config:
        orm_mode = True

from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, date as dt_date

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
    start_date: dt_date
    end_date: Optional[dt_date] = None
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

# --- Machine Management Schemas ---
class MachineBase(BaseModel):
    name: str
    type: str
    status: Optional[str] = "active"
    accumulated_hours: Optional[float] = 0.0
    maintenance_limit_hours: Optional[float] = 100.0

class MachineCreate(MachineBase):
    pass

class Machine(MachineBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True

class MachineUsageBase(BaseModel):
    hours_used: float
    description: Optional[str] = None
    date: Optional[dt_date] = None

class MachineUsageCreate(MachineUsageBase):
    pass

class MachineUsage(MachineUsageBase):
    id: int
    machine_id: int

    class Config:
        orm_mode = True

class MachineIncidentBase(BaseModel):
    description: str
    status: Optional[str] = "open"
    date: Optional[dt_date] = None

class MachineIncidentCreate(MachineIncidentBase):
    pass

class MachineIncident(MachineIncidentBase):
    id: int
    machine_id: int

    class Config:
        orm_mode = True

class MachineMaintenanceBase(BaseModel):
    type: str
    description: str
    cost: Optional[float] = None
    date: Optional[dt_date] = None

class MachineMaintenanceCreate(MachineMaintenanceBase):
    pass

class MachineMaintenance(MachineMaintenanceBase):
    id: int
    machine_id: int

    class Config:
        orm_mode = True

class MachineReport(BaseModel):
    machine: Machine
    usages: List[MachineUsage]
    incidents: List[MachineIncident]
    maintenances: List[MachineMaintenance]

# --- Inventory Management Schemas ---
class InventoryItemBase(BaseModel):
    name: str
    category: Optional[str] = None
    unit: str
    current_stock: Optional[float] = 0.0
    minimum_stock: Optional[float] = 0.0

class InventoryItemCreate(InventoryItemBase):
    pass

class InventoryItem(InventoryItemBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True

class InventoryTransactionBase(BaseModel):
    type: str # 'in' or 'out'
    quantity: float
    description: Optional[str] = None
    date: Optional[dt_date] = None

class InventoryTransactionCreate(InventoryTransactionBase):
    pass

class InventoryTransaction(InventoryTransactionBase):
    id: int
    item_id: int

    class Config:
        orm_mode = True

class InventoryOrderBase(BaseModel):
    quantity: float
    status: Optional[str] = "planned"
    date: Optional[dt_date] = None

class InventoryOrderCreate(InventoryOrderBase):
    pass

class InventoryOrder(InventoryOrderBase):
    id: int
    item_id: int

    class Config:
        orm_mode = True

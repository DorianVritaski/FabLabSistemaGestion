from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Date, Text, Table, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class AdminUser(Base):
    __tablename__ = "admin_users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(128), nullable=False)
    role = Column(String(20), default="admin") # admin, support
    is_active = Column(Boolean, default=True)

class LabUser(Base):
    __tablename__ = "lab_users"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    dni = Column(String(15), unique=True, index=True, nullable=True)
    phone_number = Column(String(20), nullable=True)
    user_type = Column(String(50), nullable=False) # student, teacher, external, administrative
    career = Column(String(100), nullable=True) # for students
    institutional_email = Column(String(150), unique=True, index=True, nullable=False)
    registration_date = Column(DateTime, default=datetime.utcnow)

    # Relationships
    service_requests = relationship("ServiceRequest", secondary="service_request_lab_user", back_populates="users")

class ServiceType(Base):
    __tablename__ = "service_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)

    requests = relationship("ServiceRequest", back_populates="service_type")

# Association Table for Many-to-Many
service_request_lab_user = Table(
    "service_request_lab_user",
    Base.metadata,
    Column("service_request_id", Integer, ForeignKey("service_requests.id"), primary_key=True),
    Column("lab_user_id", Integer, ForeignKey("lab_users.id"), primary_key=True)
)

class ServiceRequest(Base):
    __tablename__ = "service_requests"

    id = Column(Integer, primary_key=True, index=True)
    service_type_id = Column(Integer, ForeignKey("service_types.id"), nullable=False)
    admin_id = Column(Integer, ForeignKey("admin_users.id"), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    status = Column(String(50), default="pending") # pending, in_progress, completed, cancelled
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    service_type = relationship("ServiceType", back_populates="requests")
    admin = relationship("AdminUser")
    users = relationship("LabUser", secondary=service_request_lab_user, back_populates="service_requests")

# --- Machine Management Models ---

class Machine(Base):
    __tablename__ = "machines"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    type = Column(String(50), nullable=False) # 3D Printer, Laser, Milling, etc.
    status = Column(String(50), default="active") # active, maintenance, out_of_order
    accumulated_hours = Column(Float, default=0.0)
    maintenance_limit_hours = Column(Float, default=100.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    usages = relationship("MachineUsage", back_populates="machine", cascade="all, delete-orphan")
    incidents = relationship("MachineIncident", back_populates="machine", cascade="all, delete-orphan")
    maintenances = relationship("MachineMaintenance", back_populates="machine", cascade="all, delete-orphan")

class MachineUsage(Base):
    __tablename__ = "machine_usages"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(Integer, ForeignKey("machines.id"), nullable=False)
    hours_used = Column(Float, nullable=False)
    date = Column(Date, default=datetime.utcnow)
    description = Column(Text, nullable=True)

    machine = relationship("Machine", back_populates="usages")

class MachineIncident(Base):
    __tablename__ = "machine_incidents"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(Integer, ForeignKey("machines.id"), nullable=False)
    description = Column(Text, nullable=False)
    date = Column(Date, default=datetime.utcnow)
    status = Column(String(50), default="open") # open, resolved

    machine = relationship("Machine", back_populates="incidents")

class MachineMaintenance(Base):
    __tablename__ = "machine_maintenances"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(Integer, ForeignKey("machines.id"), nullable=False)
    type = Column(String(50), nullable=False) # preventive, corrective
    description = Column(Text, nullable=False)
    date = Column(Date, default=datetime.utcnow)
    cost = Column(Float, nullable=True)

    machine = relationship("Machine", back_populates="maintenances")

# --- Inventory Management Models ---

class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    category = Column(String(50), nullable=True)
    unit = Column(String(20), nullable=False) # kg, un, planchas, etc.
    current_stock = Column(Float, default=0.0)
    minimum_stock = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    transactions = relationship("InventoryTransaction", back_populates="item", cascade="all, delete-orphan")
    orders = relationship("InventoryOrder", back_populates="item", cascade="all, delete-orphan")

class InventoryTransaction(Base):
    __tablename__ = "inventory_transactions"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("inventory_items.id"), nullable=False)
    type = Column(String(20), nullable=False) # in, out
    quantity = Column(Float, nullable=False)
    date = Column(Date, default=datetime.utcnow)
    description = Column(Text, nullable=True)

    item = relationship("InventoryItem", back_populates="transactions")

class InventoryOrder(Base):
    __tablename__ = "inventory_orders"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("inventory_items.id"), nullable=False)
    quantity = Column(Float, nullable=False)
    status = Column(String(50), default="planned") # planned, ordered, completed
    date = Column(Date, default=datetime.utcnow)

    item = relationship("InventoryItem", back_populates="orders")


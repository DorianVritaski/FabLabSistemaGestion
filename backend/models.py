from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Date, Text, Table
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

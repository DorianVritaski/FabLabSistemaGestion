import os
import sys

# Agregar la ruta del backend para importar los módulos correctamente
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
import models
import auth

def create_initial_admin():
    db = SessionLocal()
    admin_user = db.query(models.AdminUser).filter(models.AdminUser.username == "admin").first()
    if admin_user:
        print("El usuario administrador 'admin' ya existe.")
    else:
        hashed_password = auth.get_password_hash("admin123")
        new_admin = models.AdminUser(
            username="admin",
            hashed_password=hashed_password,
            role="admin",
            is_active=True
        )
        db.add(new_admin)
        db.commit()
        print("Usuario administrador creado con éxito. Usuario: admin | Contraseña: admin123")
    db.close()

if __name__ == "__main__":
    create_initial_admin()

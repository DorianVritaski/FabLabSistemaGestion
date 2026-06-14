from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models, schemas, auth
from datetime import datetime, date

router = APIRouter(prefix="/inventory", tags=["inventory"])

# --- Inventory Items ---
@router.post("", response_model=schemas.InventoryItem)
def create_inventory_item(item: schemas.InventoryItemCreate, db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(auth.get_current_user)):
    new_item = models.InventoryItem(**item.dict())
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

@router.get("", response_model=List[schemas.InventoryItem])
def read_inventory_items(db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(auth.get_current_user)):
    return db.query(models.InventoryItem).all()

@router.put("/{item_id}", response_model=schemas.InventoryItem)
def update_inventory_item(item_id: int, item: schemas.InventoryItemCreate, db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(auth.get_current_user)):
    db_item = db.query(models.InventoryItem).filter(models.InventoryItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item no encontrado")
    
    for key, value in item.dict().items():
        setattr(db_item, key, value)
    
    db.commit()
    db.refresh(db_item)
    return db_item

# --- Inventory Transactions ---
@router.post("/{item_id}/transactions", response_model=schemas.InventoryTransaction)
def create_inventory_transaction(item_id: int, transaction: schemas.InventoryTransactionCreate, db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(auth.get_current_user)):
    db_item = db.query(models.InventoryItem).filter(models.InventoryItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item no encontrado")

    new_transaction = models.InventoryTransaction(**transaction.dict(), item_id=item_id)
    if new_transaction.date is None:
        new_transaction.date = date.today()

    # Update stock
    if transaction.type == "in":
        db_item.current_stock += transaction.quantity
    elif transaction.type == "out":
        if db_item.current_stock < transaction.quantity:
            raise HTTPException(status_code=400, detail="Stock insuficiente para esta salida")
        db_item.current_stock -= transaction.quantity
    else:
        raise HTTPException(status_code=400, detail="Tipo de transacción inválido (debe ser 'in' o 'out')")
    
    db.add(new_transaction)
    db.commit()
    db.refresh(new_transaction)
    return new_transaction

@router.get("/{item_id}/transactions", response_model=List[schemas.InventoryTransaction])
def get_inventory_transactions(item_id: int, db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(auth.get_current_user)):
    return db.query(models.InventoryTransaction).filter(models.InventoryTransaction.item_id == item_id).order_by(models.InventoryTransaction.date.desc()).all()


# --- Inventory Orders ---
@router.post("/{item_id}/orders", response_model=schemas.InventoryOrder)
def create_inventory_order(item_id: int, order: schemas.InventoryOrderCreate, db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(auth.get_current_user)):
    db_item = db.query(models.InventoryItem).filter(models.InventoryItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item no encontrado")

    new_order = models.InventoryOrder(**order.dict(), item_id=item_id)
    if new_order.date is None:
        new_order.date = date.today()
    
    db.add(new_order)
    db.commit()
    db.refresh(new_order)
    return new_order

@router.get("/{item_id}/orders", response_model=List[schemas.InventoryOrder])
def get_inventory_orders(item_id: int, db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(auth.get_current_user)):
    return db.query(models.InventoryOrder).filter(models.InventoryOrder.item_id == item_id).order_by(models.InventoryOrder.date.desc()).all()

@router.put("/{item_id}/orders/{order_id}/complete", response_model=schemas.InventoryOrder)
def complete_inventory_order(item_id: int, order_id: int, db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(auth.get_current_user)):
    db_order = db.query(models.InventoryOrder).filter(models.InventoryOrder.id == order_id, models.InventoryOrder.item_id == item_id).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    
    if db_order.status == "completed":
        raise HTTPException(status_code=400, detail="El pedido ya está completado")

    db_order.status = "completed"
    
    # Optionally, we can auto-register a transaction here.
    # For now, let's auto-register to make it convenient.
    db_item = db.query(models.InventoryItem).filter(models.InventoryItem.id == item_id).first()
    db_item.current_stock += db_order.quantity

    new_transaction = models.InventoryTransaction(
        item_id=item_id,
        type="in",
        quantity=db_order.quantity,
        date=date.today(),
        description=f"Auto-registro por pedido completado #{db_order.id}"
    )
    db.add(new_transaction)
    
    db.commit()
    db.refresh(db_order)
    return db_order

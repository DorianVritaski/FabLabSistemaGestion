from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
import models, auth
import pandas as pd
from prophet import Prophet
from datetime import datetime, timedelta

router = APIRouter(prefix="/ml", tags=["ml"])

@router.get("/predict-demand")
def predict_demand(db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(auth.get_current_user)):
    # Extraer datos históricos reales de la base de datos
    results = db.query(
        models.ServiceRequest.start_date.label('ds'),
        func.count(models.ServiceRequest.id).label('y')
    ).group_by(models.ServiceRequest.start_date).order_by(models.ServiceRequest.start_date).all()
    
    if not results or len(results) < 2:
        raise HTTPException(status_code=400, detail="No hay suficientes datos históricos para predecir.")
        
    df = pd.DataFrame(results, columns=['ds', 'y'])
    df['ds'] = pd.to_datetime(df['ds'])
    
    # Entrenamiento básico del modelo Prophet
    m = Prophet(daily_seasonality=False, weekly_seasonality=True, yearly_seasonality=False)
    m.fit(df)
    
    # Predecir los próximos 30 días
    future = m.make_future_dataframe(periods=30)
    forecast = m.predict(future)
    
    # Extraer las predicciones futuras
    forecast_future = forecast[forecast['ds'] > pd.to_datetime(datetime.today())]
    
    # Formatear respuesta
    prediction_data = []
    for index, row in forecast_future.iterrows():
        prediction_data.append({
            "date": row['ds'].strftime('%Y-%m-%d'),
            "predicted_demand": max(0, round(row['yhat'])),
            "lower_bound": max(0, round(row['yhat_lower'])),
            "upper_bound": max(0, round(row['yhat_upper']))
        })
        
    return {
        "model": "Prophet",
        "predictions": prediction_data,
        "total_predicted_next_30_days": sum([p['predicted_demand'] for p in prediction_data])
    }

@router.get('/service-projections')
def service_projections(db: Session = Depends(get_db)):
    today = datetime.today()
    
    # Mes anterior calendario (ej. Mayo si hoy es Junio)
    first_day_current_month = today.replace(day=1)
    last_day_prev_month = first_day_current_month - timedelta(days=1)
    first_day_prev_month = last_day_prev_month.replace(day=1)
    
    # Mes trasanterior (ej. Abril)
    last_day_prev_prev_month = first_day_prev_month - timedelta(days=1)
    first_day_prev_prev_month = last_day_prev_prev_month.replace(day=1)
    
    types = db.query(models.ServiceType).all()
    projections = []
    
    for t in types:
        last_month = db.query(func.count(models.ServiceRequest.id)).filter(
            models.ServiceRequest.service_type_id == t.id,
            models.ServiceRequest.start_date >= first_day_prev_month.date(),
            models.ServiceRequest.start_date <= last_day_prev_month.date()
        ).scalar() or 0
        
        prev_month = db.query(func.count(models.ServiceRequest.id)).filter(
            models.ServiceRequest.service_type_id == t.id,
            models.ServiceRequest.start_date >= first_day_prev_prev_month.date(),
            models.ServiceRequest.start_date <= last_day_prev_prev_month.date()
        ).scalar() or 0
        
        if prev_month > 0:
            growth = (last_month - prev_month) / prev_month
        else:
            growth = 0.1 if last_month > 0 else 0
            
        projected = int(last_month * (1 + growth))
        if projected < 0: projected = 0
        
        trend = 'up' if projected > last_month else ('down' if projected < last_month else 'stable')
        
        projections.append({
            'service_name': t.name,
            'last_month_requests': last_month,
            'projected_next_month': projected,
            'trend': trend
        })
        
    return projections


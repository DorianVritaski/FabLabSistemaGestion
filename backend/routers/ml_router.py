from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
import models, auth
import pandas as pd
from prophet import Prophet
from datetime import datetime, timedelta

router = APIRouter(prefix="/ml", tags=["ml"])

@router.get("/predict-demand")
def predict_demand(db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(auth.get_current_user)):
    # Mock de datos históricos. En el futuro, esto se extraerá de la base de datos (models.ServiceRequest)
    # y se formateará como un DataFrame de Pandas con columnas 'ds' (fecha) y 'y' (cantidad de servicios).
    
    # Datos simulados (un servicio por día incrementando ligeramente a lo largo del tiempo)
    dates = [datetime.today() - timedelta(days=x) for x in range(0, 90)]
    demands = [1 + (i % 3) for i in range(90)] # Patrón simulado
    
    df = pd.DataFrame({
        'ds': dates,
        'y': demands
    })
    
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

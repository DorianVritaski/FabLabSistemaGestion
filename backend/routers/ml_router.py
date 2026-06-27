from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
import models, auth
import pandas as pd
import numpy as np
from prophet import Prophet
from datetime import datetime, timedelta

router = APIRouter(prefix="/ml", tags=["ml"])

@router.get("/predict-demand")
def predict_demand(days: int = 30, db: Session = Depends(get_db), current_admin: models.AdminUser = Depends(auth.get_current_user)):
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
    
    # Predecir los próximos N días
    future = m.make_future_dataframe(periods=days)
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
        "total_predicted": sum([p['predicted_demand'] for p in prediction_data]),
        "days": days
    }

@router.get("/evaluate")
def evaluate_model(db: Session = Depends(get_db)):
    service_types = db.query(models.ServiceType).all()
    results_list = []
    
    for t in service_types:
        # Extraer datos históricos reales de este servicio
        results = db.query(
            models.ServiceRequest.start_date.label('ds')
        ).filter(models.ServiceRequest.service_type_id == t.id).all()
        
        if not results:
            results_list.append({
                "service_name": t.name,
                "status": "Sin registros",
                "metrics": None
            })
            continue
            
        df = pd.DataFrame(results, columns=['ds'])
        df['ds'] = pd.to_datetime(df['ds'])
        df['y'] = 1 # Cada registro es 1 solicitud
        
        # Agrupar por mes (rellenando vacíos si se usa asfreq/resample adecuadamente, sum consolida los meses)
        df_monthly = df.set_index('ds').resample('ME').sum().reset_index()
        
        if len(df_monthly) < 6:
            results_list.append({
                "service_name": t.name,
                "status": "Historial insuficiente (< 6 meses)",
                "metrics": None
            })
            continue
            
        # 80/20 Split (Cronológico)
        split_index = int(len(df_monthly) * 0.8)
        train_df = df_monthly.iloc[:split_index]
        test_df = df_monthly.iloc[split_index:]
        
        if len(test_df) == 0 or len(train_df) == 0:
            continue
            
        # Entrenar modelo (Sin estacionalidades finas al ser datos mensuales)
        m = Prophet(yearly_seasonality=False, weekly_seasonality=False, daily_seasonality=False)
        m.fit(train_df)
        
        # Predecir sobre test
        future = pd.DataFrame({'ds': test_df['ds']})
        forecast = m.predict(future)
        
        y_true = test_df['y'].values
        y_pred = forecast['yhat'].values
        y_pred = np.maximum(0, y_pred) # Prevenir predicciones negativas
        
        # Calcular MAE
        mae = np.mean(np.abs(y_true - y_pred))
        
        # Calcular RMSE
        rmse = np.sqrt(np.mean((y_true - y_pred)**2))
        
        # Calcular MAPE
        if np.any(y_true == 0):
            mape_result = None
        else:
            mape_result = round(float(np.mean(np.abs((y_true - y_pred) / y_true)) * 100), 2)
        
        # Preparar tabla comparativa (Real vs Predicción)
        detailed_comparison = []
        for idx, date_val in enumerate(test_df['ds']):
            detailed_comparison.append({
                "date": date_val.strftime('%Y-%m'),
                "real": int(y_true[idx]),
                "predicted": int(round(y_pred[idx]))
            })
            
        results_list.append({
            "service_name": t.name,
            "status": "OK",
            "metrics": {
                "mae": round(float(mae), 2),
                "rmse": round(float(rmse), 2),
                "mape": mape_result,
                "train_months": len(train_df),
                "test_months": len(test_df)
            },
            "comparison": detailed_comparison
        })
        
    return results_list

@router.get('/service-projections')
def service_projections(db: Session = Depends(get_db)):
    today = datetime.today()
    
    # Nombres de meses en español
    meses_es = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
    
    # Mes anterior calendario para referencia de "último mes cerrado"
    first_day_current_month = today.replace(day=1)
    last_day_prev_month = first_day_current_month - timedelta(days=1)
    first_day_prev_month = last_day_prev_month.replace(day=1)
    
    next_month_idx = today.month if today.month < 12 else 0
    
    month_names = {
        "prev": meses_es[first_day_prev_month.month - 1],
        "current": meses_es[today.month - 1],
        "next": meses_es[next_month_idx]
    }
    
    types = db.query(models.ServiceType).all()
    projections_data = []
    
    for t in types:
        # Obtener count del mes pasado (cerrado)
        last_month = db.query(func.count(models.ServiceRequest.id)).filter(
            models.ServiceRequest.service_type_id == t.id,
            models.ServiceRequest.start_date >= first_day_prev_month.date(),
            models.ServiceRequest.start_date <= last_day_prev_month.date()
        ).scalar() or 0
        
        # Obtener count del mes actual (en curso)
        current_month_requests = db.query(func.count(models.ServiceRequest.id)).filter(
            models.ServiceRequest.service_type_id == t.id,
            models.ServiceRequest.start_date >= first_day_current_month.date(),
            models.ServiceRequest.start_date <= today.date()
        ).scalar() or 0
        
        # Obtener historial mensual completo para entrenar la IA
        results = db.query(
            models.ServiceRequest.start_date.label('ds')
        ).filter(models.ServiceRequest.service_type_id == t.id).all()
        
        projected = last_month # Fallback si no hay datos
        
        if results:
            df = pd.DataFrame(results, columns=['ds'])
            df['ds'] = pd.to_datetime(df['ds'])
            df['y'] = 1
            df_monthly = df.set_index('ds').resample('ME').sum().reset_index()
            
            # Si hay suficientes datos históricos, usamos Prophet
            if len(df_monthly) >= 3:
                m = Prophet(yearly_seasonality=False, weekly_seasonality=False, daily_seasonality=False)
                m.fit(df_monthly)
                
                # Predecir 1 mes al futuro
                future = m.make_future_dataframe(periods=1, freq='ME')
                forecast = m.predict(future)
                
                # Tomar la predicción del último mes (futuro)
                projected_val = forecast.iloc[-1]['yhat']
                projected = max(0, int(round(projected_val)))
        
        trend = 'up' if projected > current_month_requests else ('down' if projected < current_month_requests else 'stable')
        
        projections_data.append({
            'service_name': t.name,
            'last_month_requests': last_month,
            'current_month_requests': current_month_requests,
            'projected_next_month': projected,
            'trend': trend
        })
        
    return {
        "months": month_names,
        "projections": projections_data
    }


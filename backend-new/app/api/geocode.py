from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import aiohttp
from app.core.config import settings

router = APIRouter(tags=["geocode"])

class GeocodeRequest(BaseModel):
    address: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    reverse: Optional[bool] = False

@router.post("")
async def geocode_address(data: GeocodeRequest):
    """Прямое и обратное геокодирование через Яндекс"""
    if not settings.YANDEX_GEOCODER_API_KEY:
        raise HTTPException(status_code=500, detail="API key not configured")
    
    url = "https://geocode-maps.yandex.ru/1.x/"
    params = {
        "apikey": settings.YANDEX_GEOCODER_API_KEY,
        "format": "json",
        "results": "1",
        "lang": "ru_RU"
    }
    
    if data.reverse and data.lat and data.lon:
        params["geocode"] = f"{data.lon},{data.lat}"
        params["sco"] = "longlat"
        params["kind"] = "house"
    elif data.address:
        params["geocode"] = data.address
    else:
        raise HTTPException(status_code=400, detail="Укажите address или lat+lon")
    
    async with aiohttp.ClientSession() as session:
        async with session.get(url, params=params) as resp:
            if resp.status != 200:
                raise HTTPException(status_code=502, detail="Geocoder error")
            
            result = await resp.json()
            try:
                feature = result["response"]["GeoObjectCollection"]["featureMember"][0]["GeoObject"]
                coords = feature["Point"]["pos"].split()
                lon, lat = float(coords[0]), float(coords[1])
                address = feature["metaDataProperty"]["GeocoderMetaData"]["text"]
                
                return {
                    "lat": lat,
                    "lon": lon,
                    "address": address
                }
            except (KeyError, IndexError):
                raise HTTPException(status_code=404, detail="Не найдено")
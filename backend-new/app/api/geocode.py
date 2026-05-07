from fastapi import APIRouter, HTTPException
import aiohttp
from app.core.config import settings

router = APIRouter(prefix="/geocode", tags=["geocode"])

@router.post("")
async def geocode_address(address: str):
    """
    Преобразовать адрес в координаты через Яндекс.Геокодер
    """
    if not settings.YANDEX_GEOCODER_API_KEY:
        raise HTTPException(status_code=500, detail="YANDEX_GEOCODER_API_KEY not configured")
    
    url = "https://geocode-maps.yandex.ru/1.x/"
    params = {
        "apikey": settings.YANDEX_GEOCODER_API_KEY,
        "geocode": address,
        "format": "json",
        "results": 1
    }
    
    async with aiohttp.ClientSession() as session:
        async with session.get(url, params=params) as response:
            if response.status != 200:
                raise HTTPException(status_code=400, detail="Geocoding failed")
            
            data = await response.json()
            
            try:
                # Парсим ответ
                feature_member = data["response"]["GeoObjectCollection"]["featureMember"]
                if not feature_member:
                    return {"lat": None, "lon": None, "found": False}
                
                pos = feature_member[0]["GeoObject"]["Point"]["pos"]
                lon, lat = map(float, pos.split())
                
                return {
                    "lat": lat,
                    "lon": lon,
                    "address": feature_member[0]["GeoObject"]["metaDataProperty"]["GeocoderMetaData"]["text"],
                    "found": True
                }
            except (KeyError, IndexError, ValueError):
                return {"lat": None, "lon": None, "found": False}
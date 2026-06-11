"""
Погода через Яндекс.Погоду
"""

from fastapi import APIRouter, Query
import aiohttp
import os

router = APIRouter(tags=["weather"])

YANDEX_WEATHER_KEY = os.getenv("YANDEX_GEOCODER_API_KEY", "")

@router.get("/weather")
async def get_weather(
    lat: float = Query(59.9343),
    lon: float = Query(30.3351)
):
    """Получить погоду через Яндекс"""
    if not YANDEX_WEATHER_KEY:
        return {"error": "API key not configured"}
    
    url = "https://api.weather.yandex.ru/v2/forecast"
    headers = {"X-Yandex-Weather-Key": YANDEX_WEATHER_KEY}
    params = {"lat": lat, "lon": lon, "lang": "ru_RU", "limit": "1", "hours": "false"}
    
    async with aiohttp.ClientSession() as session:
        async with session.get(url, headers=headers, params=params) as resp:
            if resp.status == 200:
                data = await resp.json()
                fact = data.get("fact", {})
                return {
                    "temp": fact.get("temp"),
                    "condition": fact.get("condition"),
                    "icon": f"https://yastatic.net/weather/i/icons/funky/dark/{fact.get('icon', 'ovc')}.svg"
                }
            return {"error": f"Yandex API error: {resp.status}"}
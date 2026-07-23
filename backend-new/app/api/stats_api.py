from fastapi import APIRouter
from datetime import date
import psycopg2
import os

router = APIRouter(prefix="/stats", tags=["stats"])

@router.get("/today")
async def get_today_stats():
    today = date.today()
    conn = psycopg2.connect(os.environ.get('DB_URL', ''))
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT COUNT(*) FROM bookings 
        WHERE DATE(start_time) = %s
    """, (today,))
    bookings_count = cursor.fetchone()[0]
    
    cursor.execute("""
        SELECT COUNT(*) FROM google_bookings 
        WHERE DATE(start_time) = %s
    """, (today,))
    google_count = cursor.fetchone()[0]
    
    total = bookings_count + google_count
    cursor.close()
    conn.close()
    
    return {"count": total}
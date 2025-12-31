import sqlite3
import os

# Calculate path to the shared 'app.db'
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, 'config', 'app.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def fetch_logs():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # REMOVED LIMIT: Fetches ALL logs as requested
        query = "SELECT * FROM request_logs ORDER BY timestamp DESC"
        cursor.execute(query)
        rows = cursor.fetchall()
        
        logs = []
        for row in rows:
            logs.append({
                "id": row["id"],
                "method": row["method"],
                "url": row["url"],
                "ip": row["ip"],
                "timestamp": row["timestamp"]
            })
            
        conn.close()
        return {"success": True, "logs": logs}
        
    except Exception as e:
        print(f"DB Error: {e}")
        return {"success": False, "error": str(e)}
"""
WebSocket менеджер для мгновенных уведомлений (менеджеры, клиенты, админ)
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

class WSConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        if client_id not in self.active_connections:
            self.active_connections[client_id] = []
        self.active_connections[client_id].append(websocket)
        print(f"🔌 WebSocket подключён: {client_id}")

    def disconnect(self, websocket: WebSocket, client_id: str):
        if client_id in self.active_connections:
            if websocket in self.active_connections[client_id]:
                self.active_connections[client_id].remove(websocket)
            if not self.active_connections[client_id]:
                del self.active_connections[client_id]
        print(f"❌ WebSocket отключён: {client_id}")

    async def send_update(self, client_id: str, message: str = "update"):
        """Отправить уведомление конкретному клиенту/менеджеру/админу"""
        key = str(client_id)
        if key in self.active_connections:
            for ws in self.active_connections[key]:
                try:
                    await ws.send_text(message)
                except:
                    pass
    
    async def broadcast_to_admins(self, message: str = "new_chat_message"):
        """Отправить всем админам"""
        await self.send_update("admin", message)


ws_manager = WSConnectionManager()


def get_websocket_router() -> APIRouter:
    router = APIRouter()
    
    @router.websocket("/{client_id}")
    async def websocket_endpoint(websocket: WebSocket, client_id: str):
        await ws_manager.connect(websocket, client_id)
        try:
            while True:
                data = await websocket.receive_text()
                if data == "ping":
                    await websocket.send_text("pong")
        except WebSocketDisconnect:
            ws_manager.disconnect(websocket, client_id)
    
    return router
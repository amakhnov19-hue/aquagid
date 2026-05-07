"""
WebSocket менеджер для мгновенных уведомлений
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

class WSConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, manager_id: int):
        await websocket.accept()
        if manager_id not in self.active_connections:
            self.active_connections[manager_id] = []
        self.active_connections[manager_id].append(websocket)
        print(f"🔌 WebSocket подключён для менеджера {manager_id}")

    def disconnect(self, websocket: WebSocket, manager_id: int):
        if manager_id in self.active_connections:
            if websocket in self.active_connections[manager_id]:
                self.active_connections[manager_id].remove(websocket)
            if not self.active_connections[manager_id]:
                del self.active_connections[manager_id]
        print(f"❌ WebSocket отключён для менеджера {manager_id}")

    async def send_update(self, manager_id: int, message: str = "update"):
        if manager_id in self.active_connections:
            for ws in self.active_connections[manager_id]:
                try:
                    await ws.send_text(message)
                except:
                    pass


ws_manager = WSConnectionManager()


def get_websocket_router() -> APIRouter:
    router = APIRouter()
    
    @router.websocket("/{manager_id}")
    async def websocket_endpoint(websocket: WebSocket, manager_id: int):
        await ws_manager.connect(websocket, manager_id)
        try:
            while True:
                data = await websocket.receive_text()
                if data == "ping":
                    await websocket.send_text("pong")
        except WebSocketDisconnect:
            ws_manager.disconnect(websocket, manager_id)
    
    return router


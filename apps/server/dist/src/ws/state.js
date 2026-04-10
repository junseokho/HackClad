export const clients = new Map();
export const matchmakingQueues = new Map();
export function makeMatchKey(mode, size) {
    return `${mode}:${size}`;
}
// 아직 game state 타입은 any로 (나중에 GameState로 교체)
export const rooms = new Map();
// --------------------
// room/client helpers
// --------------------
export function getRoomClients(roomId) {
    return Array.from(clients.values()).filter((c) => c.roomId === roomId);
}
export function getClient(ws) {
    return clients.get(ws) ?? null;
}
export function requireClient(ws) {
    const c = clients.get(ws);
    if (!c)
        throw new Error("UNAUTHED");
    return c;
}
export function getRoom(roomId) {
    return rooms.get(roomId) ?? null;
}
export function requireRoom(roomId) {
    const r = rooms.get(roomId);
    if (!r)
        throw new Error("ROOM_NOT_FOUND");
    return r;
}
// --------------------
// ws send/broadcast (protocol-aligned: flat objects)
// --------------------
function isWsOpen(ws) {
    return ws.readyState === 1;
}
export function send(ws, msg) {
    if (!isWsOpen(ws))
        return;
    ws.send(JSON.stringify(msg));
}
export function sendError(ws, error) {
    send(ws, { type: "error", error });
}
export function broadcast(roomClients, msg) {
    for (const c of roomClients)
        send(c.ws, msg);
}
export function broadcastToRoom(roomId, msg) {
    broadcast(getRoomClients(roomId), msg);
}
export function broadcastRoomState(roomId, state) {
    broadcastToRoom(roomId, { type: "game:state", roomId, state });
}
// Remove rooms that no longer have any connected clients.
export function pruneEmptyRooms() {
    let removed = 0;
    for (const [roomId] of rooms.entries()) {
        if (getRoomClients(roomId).length === 0) {
            rooms.delete(roomId);
            removed += 1;
        }
    }
    if (removed > 0) {
        console.log(`[ROOM] pruned ${removed} empty room(s)`);
    }
    return removed;
}
// --------------------
// cleanup
// --------------------
export function removeFromQueue(client) {
    const key = client.matchKey;
    if (!key)
        return;
    const q = matchmakingQueues.get(key);
    if (!q)
        return;
    const idx = q.findIndex((c) => c.user.id === client.user.id);
    if (idx >= 0)
        q.splice(idx, 1);
    if (q.length === 0)
        matchmakingQueues.delete(key);
    delete client.matchKey;
}
export function cleanupClient(ws) {
    const c = clients.get(ws);
    if (!c)
        return;
    const roomId = c.roomId;
    removeFromQueue(c);
    clients.delete(ws);
    if (roomId) {
        pruneEmptyRooms();
    }
}
//# sourceMappingURL=state.js.map
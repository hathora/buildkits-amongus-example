import { register } from "./protocol.js";

type Point = { x: number; y: number };
const subscribers: Map<bigint, Set<string>> = new Map();
const positions: Map<string, { current: Point; target: Point }> = new Map();

const coordinator = await register({
  newState(stateId, userId, data) {
    console.log("newState", stateId.toString(36), userId, data);
    subscribers.set(stateId, new Set());
  },
  subscribeUser(stateId, userId) {
    console.log("subscribeUser", stateId.toString(36), userId);
    subscribers.get(stateId)!.add(userId);
    positions.set(userId, { current: { x: 4900, y: 1700 }, target: { x: 4900, y: 1700 } });
  },
  unsubscribeUser(stateId, userId) {
    console.log("unsubscribeUser", stateId.toString(36), userId);
    subscribers.get(stateId)!.delete(userId);
  },
  unsubscribeAll() {
    console.log("unsubscribeAll");
  },
  handleUpdate(stateId, userId, data) {
    const buf = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
    console.log("handleUpdate", stateId.toString(36), userId, buf.toString("utf8"));
    positions.get(userId)!.target = JSON.parse(buf.toString("utf8"));
  },
});

function broadcastUpdates(stateId: bigint) {
  const data = [...positions.entries()].map(([userId, { current }]) => ({ id: userId, x: current.x, y: current.y }));
  subscribers.get(stateId)!.forEach((userId) => {
    coordinator.stateUpdate(stateId, userId, Buffer.from(JSON.stringify(data), "utf8"));
  });
}

setInterval(() => {
  subscribers.forEach((users, stateId) => {
    users.forEach((userId) => {
      const position = positions.get(userId)!;
      const { current, target } = position;
      const dx = target.x - current.x;
      const dy = target.y - current.y;
      if (dx === 0 && dy === 0) {
        return;
      }
      const dist = Math.sqrt(dx * dx + dy * dy);
      const pixelsToMove = 300 * 0.05;
      if (dist <= pixelsToMove) {
        position.current = target;
      } else {
        current.x += (dx / dist) * pixelsToMove;
        current.y += (dy / dist) * pixelsToMove;
      }
    });
    broadcastUpdates(stateId);
  });
}, 50);

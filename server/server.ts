import { register } from "@hathora/server-sdk";
import { APP_SECRET } from "../common/base.js";

type RoomId = bigint;
type UserId = string;
type Point = { x: number; y: number };
type GameState = Map<UserId, { current: Point; target: Point }>;
const states: Map<RoomId, { subscribers: Set<UserId>; game: GameState }> = new Map();

const coordinator = await register("coordinator.hathora.dev", APP_SECRET, {
  newState(roomId, userId, data) {
    console.log("newState", roomId.toString(36), userId, data);
    states.set(roomId, { subscribers: new Set(), game: new Map() });
  },
  subscribeUser(roomId, userId) {
    console.log("subscribeUser", roomId.toString(36), userId);
    const { subscribers, game } = states.get(roomId)!;
    subscribers.add(userId);
    if (!game.has(userId)) {
      game.set(userId, { current: { x: 4900, y: 1700 }, target: { x: 4900, y: 1700 } });
    }
  },
  unsubscribeUser(roomId, userId) {
    console.log("unsubscribeUser", roomId.toString(36), userId);
    states.get(roomId)!.subscribers.delete(userId);
  },
  unsubscribeAll() {
    console.log("unsubscribeAll");
  },
  onMessage(roomId, userId, data) {
    const dataStr = Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString("utf8");
    console.log("handleUpdate", roomId.toString(36), userId, dataStr);
    states.get(roomId)!.game.get(userId)!.target = JSON.parse(dataStr);
  },
});

function broadcastUpdates(roomId: RoomId) {
  const { subscribers, game } = states.get(roomId)!;
  const data = [...game.entries()].map(([userId, { current }]) => ({ id: userId, x: current.x, y: current.y }));
  subscribers.forEach((userId) => {
    coordinator.stateUpdate(roomId, userId, Buffer.from(JSON.stringify(data), "utf8"));
  });
}

setInterval(() => {
  states.forEach(({ game, subscribers }, roomId) => {
    subscribers.forEach((userId) => {
      const position = game.get(userId)!;
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
    broadcastUpdates(roomId);
  });
}, 50);

import { register } from "@hathora/server-sdk";
import dotenv from "dotenv";

type RoomId = bigint;
type UserId = string;
type Point = { x: number; y: number };
type GameState = Map<UserId, { current: Point; target: Point }>;
const states: Map<RoomId, GameState> = new Map();

dotenv.config({ path: "../.env" });
if (process.env.APP_SECRET === undefined) {
  throw new Error("APP_SECRET not set");
}

const coordinator = await register({
  appSecret: process.env.APP_SECRET,
  authInfo: { anonymous: { separator: "-" } },
  store: {
    newState(roomId, userId, data) {
      console.log("newState", roomId.toString(36), userId, data);
      states.set(roomId, new Map());
    },
    subscribeUser(roomId, userId) {
      console.log("subscribeUser", roomId.toString(36), userId);
      const game = states.get(roomId)!;
      if (!game.has(userId)) {
        game.set(userId, { current: { x: 4900, y: 1700 }, target: { x: 4900, y: 1700 } });
      }
    },
    unsubscribeUser(roomId, userId) {
      console.log("unsubscribeUser", roomId.toString(36), userId);
    },
    onMessage(roomId, userId, data) {
      const dataStr = Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString("utf8");
      console.log("handleUpdate", roomId.toString(36), userId, dataStr);
      states.get(roomId)!.get(userId)!.target = JSON.parse(dataStr);
    },
  },
});
console.log(`Connected to coordinator at ${coordinator.host} with storeId ${coordinator.storeId}`);

function broadcastUpdates(roomId: RoomId) {
  const game = states.get(roomId)!;
  const data = [...game.entries()].map(([userId, { current }]) => ({ id: userId, x: current.x, y: current.y }));
  coordinator.broadcastMessage(roomId, Buffer.from(JSON.stringify(data), "utf8"));
}

setInterval(() => {
  states.forEach((game, roomId) => {
    [...game.keys()].forEach((userId) => {
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

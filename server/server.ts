import { register } from "./protocol.js";

type StateId = bigint;
type UserId = string;
type Point = { x: number; y: number };
type GameState = Map<UserId, { current: Point; target: Point }>;
const states: Map<StateId, { subscribers: Set<UserId>; game: GameState }> = new Map();

const coordinator = await register({
  newState(stateId, userId, data) {
    console.log("newState", stateId.toString(36), userId, data);
    states.set(stateId, { subscribers: new Set(), game: new Map() });
  },
  subscribeUser(stateId, userId) {
    console.log("subscribeUser", stateId.toString(36), userId);
    const { subscribers, game } = states.get(stateId)!;
    subscribers.add(userId);
    if (!game.has(userId)) {
      game.set(userId, { current: { x: 4900, y: 1700 }, target: { x: 4900, y: 1700 } });
    }
  },
  unsubscribeUser(stateId, userId) {
    console.log("unsubscribeUser", stateId.toString(36), userId);
    const { subscribers, game } = states.get(stateId)!;
    subscribers.delete(userId);
  },
  unsubscribeAll() {
    console.log("unsubscribeAll");
  },
  handleUpdate(stateId, userId, data) {
    const dataStr = Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString("utf8");
    console.log("handleUpdate", stateId.toString(36), userId, dataStr);
    states.get(stateId)!.game.get(userId)!.target = JSON.parse(dataStr);
  },
});

function broadcastUpdates(stateId: bigint) {
  const { subscribers, game } = states.get(stateId)!;
  const data = [...game.entries()].map(([userId, { current }]) => ({ id: userId, x: current.x, y: current.y }));
  subscribers.forEach((userId) => {
    coordinator.stateUpdate(stateId, userId, Buffer.from(JSON.stringify(data), "utf8"));
  });
}

setInterval(() => {
  states.forEach(({ game, subscribers }, stateId) => {
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
    broadcastUpdates(stateId);
  });
}, 50);

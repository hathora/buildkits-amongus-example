import { register } from "./protocol.js";

const coordinator = await register({
  newState(stateId, userId, data) {
    console.log("newState", stateId.toString(36), userId, data);
  },
  subscribeUser(stateId, userId) {
    console.log("subscribeUser", stateId.toString(36), userId);
  },
  unsubscribeUser(stateId, userId) {
    console.log("unsubscribeUser", stateId.toString(36), userId);
  },
  unsubscribeAll() {
    console.log("unsubscribeAll");
  },
  handleUpdate(stateId, userId, data) {
    const buf = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
    console.log("handleUpdate", stateId.toString(36), userId, buf.toString("utf8"));
    coordinator.stateUpdate(stateId, userId, buf);
  },
});

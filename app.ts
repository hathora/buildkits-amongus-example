import { HathoraClient } from "./client.js";

const client = new HathoraClient();
const token = await client.loginAnonymous();
const stateId = await client.create(token, Buffer.alloc(0));
const connection = await client.connect(
  token,
  stateId,
  (data) => console.log("onMessage", data),
  (e) => console.error("onClose", e.reason)
);

console.log("sending data");
setTimeout(() => {
  connection.write(Buffer.from("Hello, world!"));
  console.log("sent data");
}, 50);
// connection.write(Buffer.from("Hello, world!"));
// console.log("sent data");

import { HathoraClient } from "./client.js";

const client = new HathoraClient();
const token = await client.loginAnonymous();
const stateId = await client.create(token);
const connection = await client.connect(token, stateId);

setTimeout(() => connection.write(Buffer.from("Hello, world!")), 1000);

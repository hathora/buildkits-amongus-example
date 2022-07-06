import { HathoraClient } from "./client.js";
import readline from "readline";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const client = new HathoraClient();
const token = await client.loginAnonymous();
const stateId = await client.create(token, new Uint8Array());
const connection = await client.connect(
  token,
  stateId,
  (data) => console.log("onMessage", decoder.decode(data)),
  (e) => console.error("onClose", e.reason)
);

readline
  .createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  })
  .on("line", (line) => connection.write(encoder.encode(line)));

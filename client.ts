import { APP_ID, COORDINATOR_HOST } from "./protocol.js";
import axios from "axios";
import { Reader, Writer } from "bin-serde";
import WebSocket from "isomorphic-ws";

export class HathoraClient {
  public appId = APP_ID;

  public async loginAnonymous(): Promise<string> {
    const res = await axios.post(`https://${COORDINATOR_HOST}/${this.appId}/login/anonymous`);
    return res.data.token;
  }

  public async create(token: string, data: ArrayBuffer): Promise<string> {
    const res = await axios.post(`https://${COORDINATOR_HOST}/${this.appId}/create`, data, {
      headers: { Authorization: token, "Content-Type": "application/octet-stream" },
    });
    return res.data.stateId;
  }

  public async connect(
    token: string,
    stateId: string,
    onMessage: (data: ArrayBuffer) => void,
    onClose: (e: { code: number; reason: string }) => void
  ): Promise<WebSocketHathoraTransport> {
    const connection = new WebSocketHathoraTransport(this.appId);
    await connection.connect(stateId, token, onMessage, onClose);
    return connection;
  }
}

class WebSocketHathoraTransport {
  private socket: WebSocket;

  constructor(appId: string) {
    this.socket = new WebSocket(`wss://${COORDINATOR_HOST}/${appId}`);
  }

  public connect(
    stateId: string,
    token: string,
    onData: (data: ArrayBuffer) => void,
    onClose: (e: { code: number; reason: string }) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket.binaryType = "arraybuffer";
      this.socket.onclose = onClose;
      this.socket.onopen = () =>
        this.socket.send(
          new Writer()
            .writeUInt8(0)
            .writeString(token)
            .writeUInt64([...stateId].reduce((r, v) => r * 36n + BigInt(parseInt(v, 36)), 0n))
            .toBuffer()
        );
      this.socket.onmessage = ({ data }) => {
        if ((data as ArrayBuffer).byteLength === 0) {
          this.socket.onmessage = ({ data }) => onData(data as ArrayBuffer);
          resolve();
        } else {
          console.error("Unexpected initial message: ", data);
          reject();
        }
      };
    });
  }

  public disconnect(code?: number | undefined): void {
    if (code === undefined) {
      this.socket.onclose = () => {};
    }
    this.socket.close(code);
  }

  public isReady(): boolean {
    return this.socket.readyState === this.socket.OPEN;
  }

  public write(data: Uint8Array): void {
    this.socket.send(data);
  }

  public pong() {
    this.socket.ping();
  }
}

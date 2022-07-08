import axios from "axios";
import jwtDecode from "jwt-decode";
import { APP_ID, COORDINATOR_HOST } from "../common/base.js";
import { WebSocketHathoraTransport } from "./transport.js";

export class HathoraClient {
  public static getUserIdFromToken(token: string): string {
    return (jwtDecode(token) as { id: string }).id;
  }

  public async loginAnonymous(): Promise<string> {
    const res = await axios.post(`https://${COORDINATOR_HOST}/${APP_ID}/login/anonymous`);
    return res.data.token;
  }

  public async loginNickname(nickname: string): Promise<string> {
    const res = await axios.post(`https://${COORDINATOR_HOST}/${APP_ID}/login/nickname`, { nickname });
    return res.data.token;
  }

  public async loginGoogle(idToken: string): Promise<string> {
    const res = await axios.post(`https://${COORDINATOR_HOST}/${APP_ID}/login/google`, { idToken });
    return res.data.token;
  }

  public async create(token: string, data: ArrayBuffer): Promise<string> {
    const res = await axios.post(`https://${COORDINATOR_HOST}/${APP_ID}/create`, data, {
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
    const connection = new WebSocketHathoraTransport(COORDINATOR_HOST, APP_ID);
    await connection.connect(stateId, token, onMessage, onClose);
    return connection;
  }
}

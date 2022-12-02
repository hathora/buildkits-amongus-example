import { AnimatedSprite, Application, Loader, Sprite, Texture } from "pixi.js";
import { Viewport } from "pixi-viewport";
import { InterpolationBuffer } from "interpolation-buffer";
import { HathoraClient } from "@hathora/client-sdk";

const app = new Application({ resizeTo: window });
document.body.appendChild(app.view);

const { backgroundTexture, idleTextures, walkingTextures } = await loadTextures();
const viewport = setupViewport();
app.stage.addChild(viewport);
viewport.addChild(new Sprite(backgroundTexture));

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const client = new HathoraClient(process.env.APP_ID!, process.env.COORDINATOR_HOST);
if (sessionStorage.getItem("token") === null) {
  sessionStorage.setItem("token", await client.loginAnonymous());
}
const token = sessionStorage.getItem("token")!;
const userId = HathoraClient.getUserFromToken(token).id;

type Player = { id: string; x: number; y: number };
type GameState = Player[];
let buffer: InterpolationBuffer<GameState> | undefined;
const connection = await getClient((data) => {
  const state = JSON.parse(decoder.decode(data));
  if (buffer === undefined) {
    buffer = new InterpolationBuffer(state, 50, lerp);
  } else {
    buffer.enqueue(state, [], Date.now());
  }
});

function setupViewport() {
  const vp = new Viewport({
    screenWidth: app.view.width,
    screenHeight: app.view.height,
    worldWidth: backgroundTexture.width,
    worldHeight: backgroundTexture.height,
    interaction: app.renderer.plugins.interaction,
  });
  vp.setZoom(0.5);
  window.onresize = () => vp.resize();
  return vp;
}

app.view.addEventListener("click", (e) => {
  const pos = viewport.toWorld(e.x, e.y);
  connection.write(encoder.encode(JSON.stringify(pos)));
});

const playerSprites: Map<string, AnimatedSprite> = new Map();
app.ticker.add(() => {
  if (buffer === undefined) {
    return;
  }
  const { state } = buffer.getInterpolatedState(Date.now());
  state.forEach((player) => {
    if (!playerSprites.has(player.id)) {
      const playerSprite = new AnimatedSprite(idleTextures);
      playerSprite.anchor.set(0.5, 1);
      playerSprite.setTransform(player.x, player.y);
      if (player.id === userId) {
        viewport.follow(playerSprite);
      }
      viewport.addChild(playerSprite);
      playerSprites.set(player.id, playerSprite);
    } else {
      const playerSprite = playerSprites.get(player.id)!;
      const dx = player.x - playerSprite.x;
      const dy = player.y - playerSprite.y;
      if (dx === 0 && dy === 0) {
        playerSprite.textures = idleTextures;
      } else {
        if (!playerSprite.playing) {
          playerSprite.textures = walkingTextures;
          playerSprite.animationSpeed = 0.3;
          playerSprite.play();
        }
        playerSprite.setTransform(player.x, player.y);
        if (dx > 0) {
          playerSprite.scale.x = 1;
        } else if (dx < 0) {
          playerSprite.scale.x = -1;
        }
      }
    }
  });
});

async function getClient(onMessage: (data: ArrayBuffer) => void) {
  if (location.pathname.length > 1) {
    return client.connect(token, location.pathname.split("/").pop()!, onMessage, console.error);
  } else {
    const stateId = await client.create(token, new Uint8Array());
    history.pushState({}, "", `/${stateId}`);
    return client.connect(token, stateId, onMessage, console.error);
  }
}

function lerp(from: GameState, to: GameState, pctElapsed: number): GameState {
  return to.map((toPlayer) => {
    const fromPlayer = from.find((p) => p.id === toPlayer.id);
    return fromPlayer !== undefined ? lerpPlayer(fromPlayer, toPlayer, pctElapsed) : toPlayer;
  });
}

function lerpPlayer(from: Player, to: Player, pctElapsed: number): Player {
  return {
    id: from.id,
    x: from.x + (to.x - from.x) * pctElapsed,
    y: from.y + (to.y - from.y) * pctElapsed,
  };
}

function loadTextures(): Promise<{ backgroundTexture: Texture; idleTextures: Texture[]; walkingTextures: Texture[] }> {
  return new Promise((resolve) => {
    new Loader()
      .add("background", "The_Skeld_map.png")
      .add("character", "idle.png")
      .add("walk", "walk.json")
      .load((_, resources) => {
        resolve({
          backgroundTexture: resources.background.texture!,
          idleTextures: [resources.character.texture!],
          walkingTextures: resources.walk.spritesheet!.animations.walkcolor,
        });
      });
  });
}

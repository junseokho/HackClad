// apps/web/src/api/ws.ts
type WsMessage = any;

export class GameWS {
  private ws: WebSocket | null = null;
  private isConnecting = false;
  private pendingQueue: WsMessage[] = [];

  connect(token: string, onMessage: (msg: WsMessage) => void) {
    const url = import.meta.env.VITE_WS_URL as string;
    console.log("[WS] connect() called", {
      hasWs: !!this.ws,
      isConnecting: this.isConnecting,
      url,
      readyState: this.ws?.readyState
    });

    // ✅ 중복 connect 방지 (StrictMode / useEffect 재호출 대비)
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      console.log("[WS] connect() ignored: already connecting/open", { readyState: this.ws.readyState });
      return;
    }

    // ✅ 이상 상태면 정리 후 재연결
    if (this.ws && (this.ws.readyState === WebSocket.CLOSING || this.ws.readyState === WebSocket.CLOSED)) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }

    this.isConnecting = true;
    this.ws = new WebSocket(url);
    console.log("[WS] new WebSocket created", { readyState: this.ws.readyState });

    this.ws.onopen = () => {
      console.log("[WS] onopen");
      this.isConnecting = false;

      // auth는 open 이후에만
      this._sendRaw({ type: "auth", token });

      // ✅ open 전에 쌓인 메시지 flush
      if (this.pendingQueue.length > 0) {
        console.log("[WS] flushing pending queue", { count: this.pendingQueue.length });
        const q = this.pendingQueue.slice();
        this.pendingQueue = [];
        for (const item of q) this._sendRaw(item);
      }
    };

    this.ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(String(ev.data));
        console.log("[WS] recv", msg.type, msg);
        onMessage(msg);
      } catch {
        onMessage({ type: "error", error: "Invalid WS JSON" });
      }
    };

    this.ws.onerror = (ev) => {
      console.log("[WS] onerror", ev);
    };

    this.ws.onclose = (ev) => {
      console.log("[WS] onclose", { code: ev.code, reason: ev.reason, wasClean: ev.wasClean });
      this.isConnecting = false;
      this.ws = null;

      // 개발 중 재연결은 호출부에서 결정하는 게 더 안전함
      onMessage({ type: "ws:closed" });
    };
  }

  send(obj: WsMessage) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.log("[WS] send queued (not open)", { readyState: this.ws?.readyState, obj });
      this.pendingQueue.push(obj);
      return;
    }
    this._sendRaw(obj);
  }

  close() {
    console.log("[WS] close() called", { readyState: this.ws?.readyState });
    this.pendingQueue = [];
    this.isConnecting = false;

    try {
      this.ws?.close();
    } catch {
      // ignore
    }
    this.ws = null;
  }

  private _sendRaw(obj: WsMessage) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(obj));
  }
}

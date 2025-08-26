import { nlu } from '../services/nlu';
import { speak, stopSpeaking } from '../services/tts';
import { logEvent } from '../services/telemetry';
import * as Actions from '../services/actions';

export type DialogState = 'idle' | 'listening' | 'thinking' | 'speaking';

type Tool = {
  name: keyof typeof Actions;
  args: Record<string, unknown>;
};

export type DialogManagerOptions = {
  onState?: (state: DialogState) => void;
};

export class DialogManager {
  private state: DialogState = 'idle';
  private onState?: (state: DialogState) => void;

  constructor(options?: DialogManagerOptions) {
    this.onState = options?.onState;
  }

  private setState(next: DialogState) {
    this.state = next;
    this.onState?.(next);
  }

  getState(): DialogState {
    return this.state;
  }

  async handleUserText(text: string): Promise<void> {
    this.setState('thinking');
    logEvent('user_input', { text });
    const res = await nlu(text);
    logEvent('nlu_result', { reply: res.reply, tool: res.tool, needFollowup: res.needFollowup });

    if (res.tool && !res.needFollowup) {
      await this.runTool(res.tool as Tool);
    }

    this.setState('speaking');
    await speak(res.reply);
    this.setState('idle');
  }

  async runTool(tool: Tool): Promise<void> {
    const fn = (Actions as any)[tool.name];
    if (typeof fn === 'function') {
      try {
        const result = await fn(tool.args);
        logEvent('tool_executed', { tool, result });
        // Optional: Man könnte result.message ans System anhängen
        // Hier lediglich noop, wie spezifiziert: Keine andere Logik.
      } catch (e) {
        // Ignoriere Tool-Fehler im Stub
      }
    }
  }

  bargeIn(): void {
    stopSpeaking();
    this.setState('listening');
  }
}



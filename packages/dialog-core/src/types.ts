export type Role = 'user' | 'assistant' | 'system';

export type IntentName = 'greet' | 'time' | 'help' | 'fallback' | 'create_customer' | 'invoice' | 'rapport';

export interface Turn {
  role: Role;
  text: string;
}

export type EngineEventType =
  | 'FLOW_STARTED'
  | 'STEP_PROMPT'
  | 'STEP_VALID'
  | 'STEP_INVALID'
  | 'FLOW_COMPLETED'
  | 'ASSISTANT_REPLY';

export interface EngineEventBase { type: EngineEventType; flowId?: string; stepId?: string; }
export interface FlowStarted extends EngineEventBase { type: 'FLOW_STARTED'; }
export interface StepPrompt extends EngineEventBase { type: 'STEP_PROMPT'; prompt: string; }
export interface StepValid extends EngineEventBase { type: 'STEP_VALID'; value: unknown; }
export interface StepInvalid extends EngineEventBase { type: 'STEP_INVALID'; error: string; prompt: string; }
export interface FlowCompleted extends EngineEventBase { type: 'FLOW_COMPLETED'; summary: string; }
export interface AssistantReply extends EngineEventBase { type: 'ASSISTANT_REPLY'; text: string; }

export type EngineEvent = FlowStarted | StepPrompt | StepValid | StepInvalid | FlowCompleted | AssistantReply;

export interface EngineDispatchUserText { type: 'USER_TEXT'; text: string; }
export type EngineDispatch = EngineDispatchUserText;

export interface EngineResult {
  turn?: Turn;
  events: EngineEvent[];
}




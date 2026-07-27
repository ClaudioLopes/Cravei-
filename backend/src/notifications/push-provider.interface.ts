export const PUSH_PROVIDER = Symbol('PUSH_PROVIDER');

export interface PushMessage {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

// Abstração de envio de push, isolada conforme requisito não-funcional de confiabilidade (seção 9).
// Implementação padrão do MVP (ConsolePushProvider) apenas loga; para produção, implemente
// FcmPushProvider usando as credenciais de um projeto Firebase e troque o provider no módulo.
export interface PushProvider {
  send(message: PushMessage): Promise<void>;
}

export const PUSH_PROVIDER = Symbol('PUSH_PROVIDER');

export interface PushMessage {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

// Abstração de envio de push, isolada conforme requisito não-funcional de confiabilidade (seção 9).
// Implementação real (ExpoPushProvider) usa o serviço de push do Expo, endereçando pelo
// pushToken salvo em cada usuário — ver expo-push.provider.ts.
export interface PushProvider {
  send(message: PushMessage): Promise<void>;
}

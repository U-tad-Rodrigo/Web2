import { EventEmitter } from 'events';

interface UserEventBase    { email: string }
interface UserInvitedEvent extends UserEventBase { invitedBy: string }
interface UserDeletedEvent extends UserEventBase { soft: boolean }

/**
 * EventEmitter (T2) para el ciclo de vida del usuario.
 * Listeners loguean por consola; en producción podrían enviar a Slack.
 */
class NotificationService extends EventEmitter {
  constructor() {
    super();
    this._registerListeners();
  }

  private _registerListeners(): void {
    this.on('user:registered', ({ email }: UserEventBase) => {
      console.log(`[user:registered] Nuevo usuario registrado: ${email}`);
    });

    this.on('user:verified', ({ email }: UserEventBase) => {
      console.log(`[user:verified] Email verificado: ${email}`);
    });

    this.on('user:invited', ({ email, invitedBy }: UserInvitedEvent) => {
      console.log(`[user:invited] ${invitedBy} invito a: ${email}`);
    });

    this.on('user:deleted', ({ email, soft }: UserDeletedEvent) => {
      const type = soft ? 'soft' : 'hard';
      console.log(`[user:deleted] Usuario eliminado (${type}): ${email}`);
    });
  }
}

export const notificationService = new NotificationService();

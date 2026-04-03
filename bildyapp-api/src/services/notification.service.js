import { EventEmitter } from 'events';

/**
 * Servicio de notificaciones basado en EventEmitter (T2).
 * Emite eventos en el ciclo de vida del usuario.
 * En la práctica final los listeners enviarán a Slack;
 * por ahora hacen log por consola.
 */
class NotificationService extends EventEmitter {
  constructor() {
    super();
    this._registerListeners();
  }

  _registerListeners() {
    this.on('user:registered', ({ email }) => {
      console.log(`📧 [user:registered] Nuevo usuario registrado: ${email}`);
    });

    this.on('user:verified', ({ email }) => {
      console.log(`✅ [user:verified] Email verificado: ${email}`);
    });

    this.on('user:invited', ({ email, invitedBy }) => {
      console.log(`📨 [user:invited] ${invitedBy} invitó a: ${email}`);
    });

    this.on('user:deleted', ({ email, soft }) => {
      const type = soft ? 'soft' : 'hard';
      console.log(`🗑️  [user:deleted] Usuario eliminado (${type}): ${email}`);
    });
  }
}

// Singleton — se comparte en toda la aplicación
export const notificationService = new NotificationService();


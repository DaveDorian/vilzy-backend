import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as serviceAccount from '../../../vilzy-app-firebase-adminsdk-fbsvc-a89d9c50ee.json';

@Injectable()
export class PushNotificationsService {
  private readonly logger = new Logger(PushNotificationsService.name);

  constructor() {
    /**
     * Inicialización del SDK de Firebase Admin.
     * El FIREBASE_CONFIG_PATH debe apuntar al archivo JSON descargado de la consola de Firebase.
     */
    if (admin.apps.length === 0) {
      /*const configPath = process.env.FIREBASE_CONFIG_PATH;
      
      if (!configPath) {
        this.logger.error('FIREBASE_CONFIG_PATH no definida en variables de entorno.');
        return;
      }*/

      try {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount as any),
        });
        this.logger.log('Firebase Admin SDK inicializado correctamente.');
      } catch (error) {
        this.logger.error('Error al inicializar Firebase Admin:', error);
      }
    }
  }

  /**
   * Envía una notificación a un dispositivo específico mediante su FCM Token.
   * Útil para actualizaciones de una orden específica a un cliente o conductor asignado.
   */
  async sendToDevice(
    token: string,
    title: string,
    body: string,
    data: Record<string, string> = {},
  ) {
    if (!token) return;

    const message: admin.messaging.Message = {
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
      token,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'orders_channel', // Configurado en Flutter para alta prioridad
          icon: 'notification_icon',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            contentAvailable: true,
          },
        },
      },
    };

    try {
      const response = await admin.messaging().send(message);
      this.logger.log(`Notificación individual enviada: ${response}`);
      return response;
    } catch (error) {
      this.handleFirebaseError(error, token);
    }
  }

  /**
   * Envía notificaciones masivas a múltiples conductores (Multicast).
   * Se usa cuando una orden pasa a SEARCHING_DRIVER para alertar a todos los cercanos.
   */
  async sendMulticast(
    tokens: string[],
    title: string,
    body: string,
    data: Record<string, string> = {},
  ) {
    const validTokens = tokens.filter((t) => t && t.length > 0);

    if (validTokens.length === 0) return;

    const message: admin.messaging.MulticastMessage = {
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
      tokens: validTokens,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'logistics_channel',
        },
      },
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);
      this.logger.log(
        `${response.successCount} notificaciones enviadas, ${response.failureCount} fallidas.`,
      );

      // Analizar fallos para limpiar tokens obsoletos si fuera necesario
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            this.handleFirebaseError(resp.error, validTokens[idx]);
          }
        });
      }
      return response;
    } catch (error) {
      this.logger.error('Error crítico en envío multicast:', error);
    }
  }

  /**
   * Manejo centralizado de errores de Firebase.
   */
  private handleFirebaseError(error: any, token: string) {
    if (
      error.code === 'messaging/registration-token-not-registered' ||
      error.code === 'messaging/invalid-registration-token'
    ) {
      this.logger.warn(
        `El token ${token.substring(0, 10)}... ya no es válido. Debería eliminarse de la DB.`,
      );
      // Aquí podrías disparar un evento para limpiar el token en la tabla User
    } else {
      this.logger.error(`Error de FCM: ${error.code} - ${error.message}`);
    }
  }
}

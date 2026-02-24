import * as admin from 'firebase-admin';
import { Injectable, OnModuleInit } from '@nestjs/common';
import * as serviceAccount from '../../../google-services.json';

@Injectable()
export class FirebaseService implements OnModuleInit {
  onModuleInit() {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as any),
    });
  }

  async sendToDriver(token: string, payload: any) {
    return admin.messaging().send({
      token,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data,
    });
  }
}

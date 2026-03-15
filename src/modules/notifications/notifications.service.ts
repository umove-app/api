import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as admin from 'firebase-admin';
import { Notification, NotificationType, NotificationStatus } from '../../entities/notification.entity';
import { User } from '../../entities/user.entity';
import { SendNotificationDto } from './dto/send-notification.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private firebaseApp: admin.app.App;

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService,
  ) {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      const credentialsPath = this.configService.get<string>('FIREBASE_CREDENTIALS_PATH');

      if (credentialsPath && require('fs').existsSync(credentialsPath)) {
        const serviceAccount = require(credentialsPath);
        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        this.logger.log('Firebase initialized successfully');
      } else {
        // Fallback to environment variables
        const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
        const privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY');
        const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');

        if (projectId && privateKey && clientEmail) {
          this.firebaseApp = admin.initializeApp({
            credential: admin.credential.cert({
              projectId,
              privateKey: privateKey.replace(/\\n/g, '\n'),
              clientEmail,
            }),
          });
          this.logger.log('Firebase initialized with environment variables');
        } else {
          this.logger.warn('Firebase not configured - notifications will be saved but not sent');
        }
      }
    } catch (error) {
      this.logger.error('Failed to initialize Firebase:', error.message);
    }
  }

  async sendNotification(dto: SendNotificationDto, createdBy?: string) {
    const { userId, audienceGroup, type, title, body, imageUrl, data } = dto;

    if (!userId && !audienceGroup) {
      throw new Error('Either userId or audienceGroup must be provided');
    }

    // Create notification record
    const notification = this.notificationRepository.create({
      userId,
      audienceGroup,
      type,
      title,
      body,
      imageUrl,
      data,
      status: NotificationStatus.PENDING,
      createdBy,
    });

    await this.notificationRepository.save(notification);

    // Send push notification
    if (userId) {
      await this.sendPushToUser(userId, title, body, data, imageUrl);
    } else if (audienceGroup) {
      await this.sendPushToGroup(audienceGroup, title, body, data, imageUrl);
    }

    notification.status = NotificationStatus.SENT;
    notification.sentAt = new Date();
    await this.notificationRepository.save(notification);

    return notification;
  }

  async sendOrderNotification(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    orderId: string,
  ) {
    return this.sendNotification({
      userId,
      type,
      title,
      body,
      data: { orderId, type: 'order' },
    });
  }

  async getUserNotifications(userId: string, page: number = 1, limit: number = 20) {
    const [notifications, total] = await this.notificationRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: notifications,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        unreadCount: await this.getUnreadCount(userId),
      },
    };
  }

  async getAllNotifications(page: number = 1, limit: number = 10) {
    const [notifications, total] = await this.notificationRepository.findAndCount({
      order: { sentAt: 'DESC', createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: notifications,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    notification.status = NotificationStatus.READ;
    notification.readAt = new Date();
    await this.notificationRepository.save(notification);

    return notification;
  }

  async markAllAsRead(userId: string) {
    await this.notificationRepository.update(
      { userId, status: NotificationStatus.SENT },
      { status: NotificationStatus.READ, readAt: new Date() },
    );

    return { message: 'All notifications marked as read' };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { userId, status: NotificationStatus.SENT },
    });
  }

  private async sendPushToUser(userId: string, title: string, body: string, data?: any, imageUrl?: string) {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });

      if (!user || !user.fcmToken) {
        this.logger.warn(`User ${userId} has no FCM token`);
        return;
      }

      if (!this.firebaseApp) {
        this.logger.warn('Firebase not initialized - skipping push notification');
        return;
      }

      const message: admin.messaging.Message = {
        token: user.fcmToken,
        notification: {
          title,
          body,
          ...(imageUrl && { imageUrl }),
        },
        data: data ? this.sanitizeData(data) : {},
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: await this.getUnreadCount(userId),
            },
          },
        },
      };

      await admin.messaging().send(message);
      this.logger.log(`Push notification sent to user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to send push notification to user ${userId}:`, error.message);
      // Don't throw error - notification is saved in DB
    }
  }

  private async sendPushToGroup(group: string, title: string, body: string, data?: any, imageUrl?: string) {
    try {
      // Get all users in the group (implement your own logic based on group type)
      const users = await this.getUsersByGroup(group);

      for (const user of users) {
        if (user.fcmToken) {
          await this.sendPushToUser(user.id, title, body, data, imageUrl);
        }
      }

      this.logger.log(`Push notifications sent to group ${group}`);
    } catch (error) {
      this.logger.error(`Failed to send push notification to group ${group}:`, error.message);
    }
  }

  private async getUsersByGroup(group: string): Promise<User[]> {
    // Implement logic to get users by group
    // For example: ALL_CUSTOMERS, ALL_DRIVERS, etc.
    const query = this.userRepository.createQueryBuilder('user').where('user.fcmToken IS NOT NULL');

    if (group === 'ALL_CUSTOMERS') {
      query.andWhere('user.role = :role', { role: 'CUSTOMER' });
    } else if (group === 'ALL_DRIVERS') {
      query.andWhere('user.role = :role', { role: 'DRIVER' });
    }

    return query.getMany();
  }

  private sanitizeData(data: any): Record<string, string> {
    // FCM requires all data values to be strings
    const sanitized: Record<string, string> = {};
    for (const key in data) {
      if (data[key] !== null && data[key] !== undefined) {
        sanitized[key] = String(data[key]);
      }
    }
    return sanitized;
  }
}

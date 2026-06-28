import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';
import { Payment } from '../../entities/payment.entity';
import { Order } from '../../entities/order.entity';
import { OrderEvent } from '../../entities/order-event.entity';
import { User } from '../../entities/user.entity';
import { PaymentProvider, PaymentStatus, OrderEventType, OrderPaymentMode } from '../../common/enums';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { REALTIME_EVENTS } from '../realtime/realtime.events';
import { DispatchService } from '../dispatch/dispatch.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private stripe: Stripe;

  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderEvent)
    private orderEventRepository: Repository<OrderEvent>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService,
    private realtime: RealtimeGateway,
    private dispatchService: DispatchService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
    }
    this.stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    });
  }

  async initiatePayment(userId: string, orderId: string, callbackUrl?: string) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['customer'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.customerId !== userId) {
      throw new BadRequestException('You are not authorized to pay for this order');
    }

    // Check if payment already exists
    let payment = await this.paymentRepository.findOne({ where: { orderId } });

    if (payment && payment.status === PaymentStatus.SUCCESS) {
      throw new BadRequestException('Payment already completed for this order');
    }

    const user = order.customer;
    const provider = this.getPaymentProvider(user.country);

    // Generate unique reference
    const reference = `UMV_${Date.now()}_${uuidv4().substring(0, 8)}`;

    if (!payment) {
      payment = this.paymentRepository.create({
        orderId,
        provider,
        reference,
        amount: order.total,
        currency: order.currency,
        status: PaymentStatus.PENDING,
      });
    } else {
      payment.reference = reference;
      payment.status = PaymentStatus.PENDING;
    }

    if (provider === PaymentProvider.PAYSTACK) {
      const paystackResponse = await this.initiatePaystackPayment(
        reference,
        order.total,
        user.email,
        callbackUrl,
      );
      payment.authorizationUrl = paystackResponse.authorization_url;
      payment.accessCode = paystackResponse.access_code;
      payment.providerResponse = paystackResponse;
    } else {
      const stripeResponse = await this.initiateStripePayment(
        reference,
        order.total,
        order.currency,
        user.email,
        callbackUrl,
      );
      payment.authorizationUrl = stripeResponse.url;
      payment.providerReference = stripeResponse.id;
      payment.providerResponse = stripeResponse;
    }

    await this.paymentRepository.save(payment);

    // Create order event
    await this.createOrderEvent(orderId, OrderEventType.PAYMENT_INITIATED, 'Payment initiated', userId);

    return {
      reference: payment.reference,
      authorizationUrl: payment.authorizationUrl,
      accessCode: payment.accessCode,
      provider,
      amount: payment.amount,
      currency: payment.currency,
    };
  }

  async verifyPayment(reference: string) {
    const payment = await this.paymentRepository.findOne({
      where: { reference },
      relations: ['order'],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status === PaymentStatus.SUCCESS) {
      return {
        status: 'success',
        message: 'Payment already verified',
        payment,
      };
    }

    let verified = false;

    if (payment.provider === PaymentProvider.PAYSTACK) {
      verified = await this.verifyPaystackPayment(reference);
    } else {
      verified = await this.verifyStripePayment(payment.providerReference);
    }

    if (verified) {
      payment.status = PaymentStatus.SUCCESS;
      payment.paidAt = new Date();
      await this.paymentRepository.save(payment);

      // Create order event
      await this.createOrderEvent(
        payment.orderId,
        OrderEventType.PAYMENT_SUCCESS,
        'Payment completed successfully',
        null,
      );

      // Mark the order paid and, for PREPAID orders that were held awaiting
      // payment, hand off to the dispatch engine now (unless it's scheduled).
      const paidOrder = await this.orderRepository.findOne({ where: { id: payment.orderId } });
      if (paidOrder && !paidOrder.isPaid) {
        paidOrder.isPaid = true;
        await this.orderRepository.save(paidOrder);

        const shouldDispatch =
          paidOrder.paymentMode === OrderPaymentMode.PREPAID &&
          !paidOrder.isScheduled &&
          !paidOrder.driverId;
        if (shouldDispatch) {
          this.dispatchService
            .dispatchOrder(paidOrder.id)
            .catch((err) => this.logger.error(`dispatchOrder after payment failed: ${err.message}`));
        }
      }

      await this.emitPaymentSuccess(payment.orderId, payment.reference, Number(payment.amount));

      return {
        status: 'success',
        message: 'Payment verified successfully',
        payment,
      };
    } else {
      payment.status = PaymentStatus.FAILED;
      payment.failedAt = new Date();
      payment.failureReason = 'Payment verification failed';
      await this.paymentRepository.save(payment);

      // Create order event
      await this.createOrderEvent(
        payment.orderId,
        OrderEventType.PAYMENT_FAILED,
        'Payment verification failed',
        null,
      );

      throw new BadRequestException('Payment verification failed');
    }
  }

  async handlePaystackWebhook(body: any, signature: string) {
    const secret = this.configService.get<string>('PAYSTACK_WEBHOOK_SECRET');
    const hash = require('crypto').createHmac('sha512', secret).update(JSON.stringify(body)).digest('hex');

    if (hash !== signature) {
      this.logger.warn('Invalid Paystack webhook signature');
      throw new BadRequestException('Invalid signature');
    }

    const event = body.event;
    const data = body.data;

    this.logger.log(`Paystack webhook received: ${event}`);

    if (event === 'charge.success') {
      const payment = await this.paymentRepository.findOne({
        where: { reference: data.reference },
      });

      if (payment && payment.status !== PaymentStatus.SUCCESS) {
        payment.status = PaymentStatus.SUCCESS;
        payment.paidAt = new Date();
        payment.providerReference = data.id;
        payment.providerResponse = data;
        await this.paymentRepository.save(payment);

        await this.createOrderEvent(
          payment.orderId,
          OrderEventType.PAYMENT_SUCCESS,
          'Payment completed via webhook',
          null,
        );

        await this.emitPaymentSuccess(payment.orderId, payment.reference, Number(payment.amount));

        this.logger.log(`Payment ${payment.reference} marked as successful`);
      }
    }

    return { status: 'success' };
  }

  async handleStripeWebhook(body: any, signature: string) {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new BadRequestException('Stripe webhook secret not configured');
    }

    let event: any;
    try {
      event = this.stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      this.logger.warn(`Stripe webhook signature verification failed: ${err.message}`);
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }

    this.logger.log(`Stripe webhook received: ${event.type}`);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;

      const payment = await this.paymentRepository.findOne({
        where: { providerReference: session.id },
      });

      if (payment && payment.status !== PaymentStatus.SUCCESS) {
        payment.status = PaymentStatus.SUCCESS;
        payment.paidAt = new Date();
        payment.providerResponse = session;
        await this.paymentRepository.save(payment);

        await this.createOrderEvent(
          payment.orderId,
          OrderEventType.PAYMENT_SUCCESS,
          'Payment completed via webhook',
          null,
        );

        await this.emitPaymentSuccess(payment.orderId, payment.reference, Number(payment.amount));

        this.logger.log(`Payment ${payment.reference} marked as successful`);
      }
    }

    return { status: 'success' };
  }

  async getPaymentStatus(orderId: string, userId: string) {
    const payment = await this.paymentRepository.findOne({
      where: { orderId },
      relations: ['order'],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found for this order');
    }

    const order = payment.order;
    if (order.customerId !== userId) {
      throw new BadRequestException('You are not authorized to view this payment');
    }

    return {
      reference: payment.reference,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      provider: payment.provider,
      paidAt: payment.paidAt,
      failedAt: payment.failedAt,
      failureReason: payment.failureReason,
    };
  }

  private getPaymentProvider(country: string): PaymentProvider {
    if (country?.toLowerCase() === 'nigeria') {
      return PaymentProvider.PAYSTACK;
    }
    return PaymentProvider.STRIPE;
  }

  private async initiatePaystackPayment(
    reference: string,
    amount: number,
    email: string,
    callbackUrl?: string,
  ) {
    // Strip accidental surrounding quotes/whitespace (a common env-var mistake
    // where the value is pasted as "sk_test_..." including the quotes, which
    // Paystack then rejects as an Invalid key).
    const paystackSecretKey = this.configService
      .get<string>('PAYSTACK_SECRET_KEY', '')
      .trim()
      .replace(/^["']|["']$/g, '');

    if (!paystackSecretKey) {
      this.logger.error('PAYSTACK_SECRET_KEY is not configured');
      throw new BadRequestException(
        'Payment provider is not configured. Please contact support.',
      );
    }

    try {
      const response = await axios.post(
        'https://api.paystack.co/transaction/initialize',
        {
          reference,
          amount: Math.round(amount * 100), // Convert to kobo
          email,
          callback_url: callbackUrl,
          currency: 'NGN',
        },
        {
          headers: {
            Authorization: `Bearer ${paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data.data;
    } catch (error) {
      const paystackMessage =
        error.response?.data?.message || error.message || 'Unknown error';
      this.logger.error(`Paystack initialization error: ${paystackMessage}`, error.response?.data);
      // Surface the real Paystack reason to the client so failures are actionable.
      throw new BadRequestException(`Failed to initialize payment: ${paystackMessage}`);
    }
  }

  private async verifyPaystackPayment(reference: string): Promise<boolean> {
    const paystackSecretKey = this.configService
      .get<string>('PAYSTACK_SECRET_KEY', '')
      .trim()
      .replace(/^["']|["']$/g, '');

    try {
      const response = await axios.get(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${paystackSecretKey}`,
          },
        },
      );

      const data = response.data.data;
      return data.status === 'success';
    } catch (error) {
      this.logger.error('Paystack verification error:', error.response?.data || error.message);
      return false;
    }
  }

  private async initiateStripePayment(
    reference: string,
    amount: number,
    currency: string,
    email: string,
    callbackUrl?: string,
  ) {
    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: currency.toLowerCase(),
              product_data: {
                name: 'UMove Logistics Service',
                description: `Payment for order ${reference}`,
              },
              unit_amount: Math.round(amount * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: callbackUrl || `${this.configService.get('CUSTOMER_APP_URL')}/payment/success?reference=${reference}`,
        cancel_url: callbackUrl || `${this.configService.get('CUSTOMER_APP_URL')}/payment/cancel`,
        customer_email: email,
        metadata: {
          reference,
        },
      });

      return session;
    } catch (error) {
      this.logger.error('Stripe initialization error:', error.message);
      throw new BadRequestException('Failed to initialize Stripe payment');
    }
  }

  private async verifyStripePayment(sessionId: string): Promise<boolean> {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);
      return session.payment_status === 'paid';
    } catch (error) {
      this.logger.error('Stripe verification error:', error.message);
      return false;
    }
  }

  private async createOrderEvent(
    orderId: string,
    eventType: OrderEventType,
    message: string,
    // performedBy is a uuid column (nullable). System-generated events must
    // pass null, NOT a string like 'SYSTEM', which would fail uuid validation.
    performedBy: string | null = null,
  ) {
    const event = this.orderEventRepository.create({
      orderId,
      eventType,
      message,
      performedBy,
      performedByRole: performedBy ? undefined : 'SYSTEM',
    });
    await this.orderEventRepository.save(event);
  }

  /**
   * Notify the customer and driver in real time that an order's payment
   * succeeded so both apps can update without polling.
   */
  private async emitPaymentSuccess(orderId: string, reference: string, amount: number) {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    const payload = { orderId, reference, amount };
    this.realtime.emitToOrder(orderId, REALTIME_EVENTS.PAYMENT_SUCCESS, payload);
    if (order?.customerId) {
      this.realtime.emitToUser(order.customerId, REALTIME_EVENTS.PAYMENT_SUCCESS, payload);
    }
    if (order?.driverId) {
      this.realtime.emitToUser(order.driverId, REALTIME_EVENTS.PAYMENT_SUCCESS, payload);
    }
  }
}

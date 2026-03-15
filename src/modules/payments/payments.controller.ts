import { Controller, Post, Get, Body, Param, Headers, RawBodyRequest, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initiate')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate payment for an order' })
  @ApiResponse({ status: 200, description: 'Returns payment authorization URL' })
  async initiatePayment(@CurrentUser() user: any, @Body() dto: InitiatePaymentDto) {
    return this.paymentsService.initiatePayment(user.id, dto.orderId, dto.callbackUrl);
  }

  @Post('verify')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify payment status' })
  @ApiResponse({ status: 200, description: 'Returns payment verification result' })
  async verifyPayment(@Body() dto: VerifyPaymentDto) {
    return this.paymentsService.verifyPayment(dto.reference);
  }

  @Get(':orderId/status')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment status for an order' })
  @ApiResponse({ status: 200, description: 'Returns payment status' })
  async getPaymentStatus(@CurrentUser() user: any, @Param('orderId') orderId: string) {
    return this.paymentsService.getPaymentStatus(orderId, user.id);
  }

  @Post('webhooks/paystack')
  @Public()
  @ApiOperation({ summary: 'Paystack webhook endpoint' })
  async handlePaystackWebhook(@Req() req: RawBodyRequest<Request>, @Headers('x-paystack-signature') signature: string) {
    return this.paymentsService.handlePaystackWebhook(req.body, signature);
  }

  @Post('webhooks/stripe')
  @Public()
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  async handleStripeWebhook(@Req() req: RawBodyRequest<Request>, @Headers('stripe-signature') signature: string) {
    return this.paymentsService.handleStripeWebhook(req.body, signature);
  }
}

import { Customer, Order, PrismaClient } from "@prisma/client";
import { CustomerData } from "../interfaces/CustomerData";
import { PaymentData } from "../interfaces/PaymentData";
import { SnackData } from "./../interfaces/SnackData";
import PaymentService from "./PaymentService";
export default class CheckoutService {
  private prisma: PrismaClient;
  constructor() {
    this.prisma = new PrismaClient();
  }
  async process(
    cart: SnackData[],
    customer: CustomerData,
    payment: PaymentData
  ): Promise<{
    id: number;
    transactionId: string;
    status: string;
  }> {
    // TODO: puxar os dados de snacks do BD
    const snacks = await this.prisma.snack.findMany({
      where: {
        id: { in: cart.map((item) => item.id) },
      },
    });

    const snacksInCart = snacks.map<SnackData>((snack) => ({
      ...snack,
      price: Number(snack.price),
      quantity: cart.find((item) => item.id === 1)?.quantity ?? 0,
      subTotal: (cart.find((item) => item.id === 1)?.quantity ?? 0) * Number(snack.price),
    }));

    // TODO: registrar os dados do cliente no BD
    const customerCreated = await this.createCustomer(customer);

    // TODO: criar uma ordem orderItem
    let orderCreated = await this.createOrder(snacksInCart, customerCreated);

    // TODO: processar o pagamento
    const { transactionId, status } = await new PaymentService().process(orderCreated, customerCreated, payment);

    orderCreated = await this.prisma.order.update({
      where: { id: orderCreated.id },
      data: { status, transactionId },
    });

    return {
      id: orderCreated.id,
      transactionId: orderCreated.transactionId!,
      status: orderCreated.status,
    };
  }

  private async createCustomer(customer: CustomerData): Promise<Customer> {
    const customerCreated = await this.prisma.customer.upsert({
      where: { email: customer.email },
      update: customer,
      create: customer,
    });

    return customerCreated;
  }

  private async createOrder(snacksInCart: SnackData[], customer: CustomerData): Promise<Order> {
    const total = snacksInCart.reduce((acc, item) => acc + item.subTotal, 0);

    const orderCreated = await this.prisma.order.create({
      data: {
        total,
        customer: {
          connect: { id: customer.id },
        },

        orderItems: {
          createMany: {
            data: snacksInCart.map((snack) => ({
              snackId: snack.id,
              snack: {
                connect: { id: snack.id },
              },
              quantity: snack.quantity,
              subTotal: snack.subTotal,
            })),
          },
        },
      },
      include: {
        customer: true,
        orderItems: { include: { snack: true } },
      },
    });

    return orderCreated;
  }
}

import { Customer, Order, PrismaClient } from "@prisma/client";
import { CustomerData } from "../interfaces/CustomerData";
import { PaymentData } from "../interfaces/PaymentData";
import { SnackData } from "./../interfaces/SnackData";
import PaymentService from "./PaymentService";
export default class CheckoutService {
  private prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = new PrismaClient();
  }
  async process(cart: SnackData[], customer: CustomerData, payment: PaymentData) {
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

    const customerCreated = await this.createCustomer(customer);

    const orderCreated = await this.createOrder(snacksInCart, customerCreated);

    const transaction = await new PaymentService().process(orderCreated, customerCreated, payment);
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

// video 1703

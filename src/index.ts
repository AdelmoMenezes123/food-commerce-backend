import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import express, { Express, Request, Response } from "express";
import { CustomerData } from "./interfaces/CustomerData";
import { PaymentData } from "./interfaces/PaymentData";
import { SnackData } from "./interfaces/SnackData";
import CheckoutService from "./services/CheckoutService";

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 5000;
const prisma = new PrismaClient();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((err: Error, req: Request, res: Response, next: Function) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  console.log("Prisma client disconnected");
  process.exit(0);
});

app.get("/snacks", async (req: Request, res: Response) => {
  const snack = req.query.snack as string;

  // if (!snack) {
  //   return res.status(400).json({ error: "Snack is required" });
  // }

  try {
    const snacks = await prisma.snack.findMany({
      where: {
        snack,
      },
    });

    res.json(snacks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.get("/orders/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const orders = await prisma.order.findUnique({
    where: {
      id: parseInt(id),
    },
    include: { customer: true, orderItems: { include: { snack: true } } },
  });

  // if (!orders) {
  //   return res.status(404).send({ error: "Order not found" });
  // }

  res.send(orders);
});

interface checkoutRequest extends Request {
  body: {
    cart: SnackData[];
    customer: CustomerData;
    payment: PaymentData;
  };
}
app.post("/checkout", async (req: Request, res: Response) => {
  const { cart, customer, payment } = req.body;

  const orderCreated = await new CheckoutService().process(cart, customer, payment);

  res.send({ message: "Checkout successful", success: true });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

export default app;

// 1801

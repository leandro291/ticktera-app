import { randomInt } from "node:crypto";

/** Sin 0/O/1/I/L para que el código se pueda dictar sin confusión. */
export const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

type RandomInt = (max: number) => number;

const randomCode = (length: number, rand: RandomInt) =>
  Array.from({ length }, () => CODE_ALPHABET[rand(CODE_ALPHABET.length)]).join("");

/** "TK-K7M2Q" */
export const generateOrderCode = (rand: RandomInt = randomInt) => `TK-${randomCode(5, rand)}`;

/** 12 caracteres aleatorios: es el contenido del QR, no debe ser adivinable. */
export const generateTicketCode = (rand: RandomInt = randomInt) => randomCode(12, rand);

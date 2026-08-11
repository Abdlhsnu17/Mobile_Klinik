import { randomUUID } from "crypto";

export const now = () => new Date().toISOString();
export const generateId = () => randomUUID();

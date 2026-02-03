import { Type } from "../db/entities/refreshToken.js";

export type Payload = {
  subjectId: number;
  type: Type;
};

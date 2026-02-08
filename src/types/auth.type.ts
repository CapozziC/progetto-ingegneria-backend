import { Type } from "../entities/refreshToken.js";

export type Payload = {
  subjectId: number;
  type: Type;
};

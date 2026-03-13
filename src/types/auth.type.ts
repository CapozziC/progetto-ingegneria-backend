import { Type } from "../entities/refreshToken.js";
import {Request} from "express"

export type Payload = {
  subjectId: number;
  type: Type;
};



export type RequestWithResetToken = Request & {
  resetToken?: {
    subjectId: number;
    type: Type;
  };
};
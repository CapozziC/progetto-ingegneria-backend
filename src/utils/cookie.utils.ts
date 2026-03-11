import { Response } from "express";
const isProd = process.env.NODE_ENV === "production";
/**
 * Sets authentication cookies for the user
 * @param res The response object
 * @param accessToken The access token to set
 * @param refreshToken The refresh token to set
 */
export const setAuthCookies = (
  res: Response,
  accessToken: string,
  refreshToken: string,
) => {
  if (isProd) {
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      domain: ".dietiestates.cloud",
      maxAge: 20 * 60 * 1000,
    });
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      domain: ".dietiestates.cloud",
      maxAge:  6 * 24 * 60 * 60 * 1000,// 6 days
    });
  } else {
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 20 * 60 * 1000,
    });
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 6 * 24 * 60 * 60 * 1000,
    });
  }
};
/**
 * Sets a short-lived access token cookie for first login scenarios where password change is required
 * @param res The response object
 * @param accessToken The access token to set
 */
export const setFirstLoginAccessCookie = (
  res: Response,
  accessToken: string,
) => {
  if (isProd) {
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      domain: ".dietiestates.cloud",
      maxAge: 15 * 60 * 1000,
    });
  } else {
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 15 * 60 * 1000,
    });
  }
};

/**
 * Clears authentication cookies for the user
 * @param res The response object
 */
export const clearAuthCookies = (res: Response) => {
  if (isProd) {
    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      domain: ".dietiestates.cloud",
      path: "/",
    });
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      domain: ".dietiestates.cloud",
      path: "/",
    });
  } else {
    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
    });
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
    });
  }
};
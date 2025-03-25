import { Response, Request } from "express";

export const register = (_req: Request, res: Response) => {
  res.send("Register");
}


export const login = (_req: Request, res: Response) => {
  res.send("login");
}


export const logout = (_req: Request, res: Response) => {
  res.send("logout");
}

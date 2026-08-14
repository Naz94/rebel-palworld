import type { NextFunction, Request, Response } from "express";

import { supabase } from "../lib/supabase.js";

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email?: string;
  };
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Unauthorized",
    });
  }

  const token = authorization.slice("Bearer ".length).trim();

  if (!token) {
    return res.status(401).json({
      error: "Unauthorized",
    });
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({
      error: "Unauthorized",
    });
  }

  (req as AuthenticatedRequest).user = {
    id: user.id,
    email: user.email,
  };

  next();
}
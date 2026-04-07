import { NextFunction, Request, Response } from "express";
import { tableExists } from "../utils/tableValidator";

export const checkTableExists = async (
  req: Request<{ resource: string }>,
  res: Response,
  next: NextFunction,
) => {
  const { resource } = req.params;

  try {
    if (!(await tableExists(resource))) {
      return res
        .status(404)
        .json({ error: `Resource '${resource}' not found` });
    }
    next();
  } catch (e) {
    res.status(500).json({ error: `Server error` });
  }
};

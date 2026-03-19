import User from '../models/user.model.js';
import { verifyAccessToken } from '../utils/handleJwt.js';
import { handleHttpError } from '../utils/handleError.js';

const authMiddleware = async (req, res, next) => {
  try {
    if (!req.headers.authorization) {
      return handleHttpError(res, 'NOT_TOKEN', 401);
    }

    const token = req.headers.authorization.split(' ').pop();
    const dataToken = verifyAccessToken(token);

    if (!dataToken || !dataToken._id) {
      return handleHttpError(res, 'ERROR_ID_TOKEN', 401);
    }

    const user = await User.findById(dataToken._id);
    if (!user) {
      return handleHttpError(res, 'USER_NOT_FOUND', 401);
    }

    req.user = user;
    return next();
  } catch (_err) {
    return handleHttpError(res, 'NOT_SESSION', 401);
  }
};

export default authMiddleware;


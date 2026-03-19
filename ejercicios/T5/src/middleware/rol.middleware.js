import { handleHttpError } from '../utils/handleError.js';

const checkRol = (roles = []) => (req, res, next) => {
  try {
    const { user } = req;
    if (!user) return handleHttpError(res, 'NOT_SESSION', 401);

    const isAllowed = roles.includes(user.role);
    if (!isAllowed) return handleHttpError(res, 'NOT_ALLOWED', 403);

    return next();
  } catch (_err) {
    return handleHttpError(res, 'ERROR_PERMISSIONS', 403);
  }
};

export default checkRol;


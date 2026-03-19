import User from '../models/user.model.js';
import RefreshToken from '../models/refreshToken.model.js';
import { encrypt, compare } from '../utils/handlePassword.js';
import {
  generateAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiry
} from '../utils/handleJwt.js';
import { handleHttpError } from '../utils/handleError.js';

const buildAuthResponse = (user, accessToken, refreshToken) => {
  user.set('password', undefined, { strict: false });
  return {
    accessToken,
    refreshToken,
    user
  };
};

export const registerCtrl = async (req, res, next) => {
  try {
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) return handleHttpError(res, 'EMAIL_ALREADY_EXISTS', 409);

    const password = await encrypt(req.body.password);
    const dataUser = await User.create({ ...req.body, password });

    const accessToken = generateAccessToken(dataUser);
    const refreshToken = generateRefreshToken();

    await RefreshToken.create({
      token: refreshToken,
      user: dataUser._id,
      expiresAt: getRefreshTokenExpiry(),
      createdByIp: req.ip
    });

    return res.status(201).json(buildAuthResponse(dataUser, accessToken, refreshToken));
  } catch (error) {
    if (error?.code === 11000) return handleHttpError(res, 'EMAIL_ALREADY_EXISTS', 409);
    return next(error);
  }
};

export const loginCtrl = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');

    if (!user) return handleHttpError(res, 'USER_NOT_EXISTS', 404);

    const check = await compare(password, user.password);
    if (!check) return handleHttpError(res, 'INVALID_PASSWORD', 401);

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken();

    await RefreshToken.create({
      token: refreshToken,
      user: user._id,
      expiresAt: getRefreshTokenExpiry(),
      createdByIp: req.ip
    });

    return res.json(buildAuthResponse(user, accessToken, refreshToken));
  } catch (error) {
    return next(error);
  }
};

export const refreshCtrl = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    const storedToken = await RefreshToken.findOne({ token: refreshToken }).populate('user');
    if (!storedToken || !storedToken.isActive()) {
      return handleHttpError(res, 'REFRESH_TOKEN_INVALID_OR_EXPIRED', 401);
    }

    const accessToken = generateAccessToken(storedToken.user);
    return res.json({ accessToken });
  } catch (error) {
    return next(error);
  }
};

export const logoutCtrl = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await RefreshToken.findOneAndUpdate(
        { token: refreshToken },
        { revokedAt: new Date(), revokedByIp: req.ip }
      );
    }

    return res.json({ message: 'Sesion cerrada' });
  } catch (error) {
    return next(error);
  }
};

export const revokeAllTokensCtrl = async (req, res, next) => {
  try {
    await RefreshToken.updateMany(
      { user: req.user._id, revokedAt: null },
      { revokedAt: new Date(), revokedByIp: req.ip }
    );

    return res.json({ message: 'Todas las sesiones cerradas' });
  } catch (error) {
    return next(error);
  }
};

export const meCtrl = async (req, res) => {
  const user = req.user.toObject();
  delete user.password;
  res.json({ user });
};


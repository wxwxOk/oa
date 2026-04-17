// 统一错误 & 业务异常
export class BizError extends Error {
  status: number;
  code: string;
  constructor(message: string, status = 400, code = 'BIZ_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const unauthorized = (msg = '未登录或登录已过期') => new BizError(msg, 401, 'UNAUTHORIZED');
export const forbidden = (msg = '无权限访问') => new BizError(msg, 403, 'FORBIDDEN');
export const notFound = (msg = '资源不存在') => new BizError(msg, 404, 'NOT_FOUND');

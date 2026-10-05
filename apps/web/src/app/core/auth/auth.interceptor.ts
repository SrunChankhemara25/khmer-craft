import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('khmercraft_token') : null;
  const authReq = request.clone({
    withCredentials: true,
    ...(token && !request.headers.has('Authorization')
      ? { setHeaders: { Authorization: `Bearer ${token}` } }
      : {}),
  });
  return next(authReq);
};

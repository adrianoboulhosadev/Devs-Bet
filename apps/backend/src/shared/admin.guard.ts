import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Errors } from 'shared'
import { RequestWithUser } from '../auth/auth.middleware'

/**
 * Edge role guard: allows the request only if the authenticated user is admin.
 * Complements the domain-level AdminUseCase (defense in depth). Apply on
 * admin-only controllers AFTER the AuthMiddleware has resolved req.user.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>()
    if (request.user?.role !== 'admin') {
      throw new ForbiddenException({ statusCode: 403, errors: [{ code: Errors.NOT_ADMIN }] })
    }
    return true
  }
}

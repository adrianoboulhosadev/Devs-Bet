import { HttpException, HttpStatus, Injectable, NestMiddleware } from '@nestjs/common'
import { NextFunction, Request, Response } from 'express'
import { JwtPayload, UserDTO } from '@auth/adapters'
import * as jwt from 'jsonwebtoken'
import { PrismaUserRepository } from './prisma-user-repository'

export interface RequestWithUser extends Request {
  user: UserDTO
}

/**
 * Validates the access token (Bearer), resolves the UserDTO and attaches it to the
 * request. It is the edge where the authenticated identity is established — the
 * protected controllers read `req.user` via @authenticatedUser (anti-IDOR lives here).
 */
@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly userRepository: PrismaUserRepository) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '')
      if (!token) throw new HttpException('Invalid token', HttpStatus.UNAUTHORIZED)

      const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload

      const user = await this.userRepository.findByIdQuery(payload.userId)
      if (!user) throw new HttpException('User not found', HttpStatus.UNAUTHORIZED)

      ;(req as RequestWithUser).user = user
    } catch {
      throw new HttpException('Invalid token', HttpStatus.UNAUTHORIZED)
    }
    next()
  }
}

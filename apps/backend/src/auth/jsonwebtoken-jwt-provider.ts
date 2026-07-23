import { Injectable } from '@nestjs/common'
import { JwtProvider, JwtTokens } from '@auth/adapters'
import * as jwt from 'jsonwebtoken'

// Access (15m) and refresh (7d) are JWTs. The refresh carries {userId,email,role}
// so that /refresh can verify it and discover whose session it is.
@Injectable()
export class JsonWebTokenProvider implements JwtProvider {
  generateToken(payload: string | object): string {
    const secret = process.env.JWT_SECRET
    return jwt.sign(payload, secret!, { expiresIn: '15m' })
  }

  generateTokens(payload: object): JwtTokens {
    const secret = process.env.JWT_SECRET
    const accessToken = jwt.sign(payload, secret!, { expiresIn: '15m' })
    const refreshToken = jwt.sign(payload, secret!, { expiresIn: '7d' })
    return { accessToken, refreshToken }
  }

  verifyToken(token: string, secret: string): string | object {
    return jwt.verify(token, secret)
  }
}

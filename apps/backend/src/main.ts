import * as dotenv from 'dotenv'
dotenv.config()
import cookieParser from 'cookie-parser'

import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { DomainExceptionFilter } from './shared/domain-exception.filter'

async function bootstrap() {
  // CORS with credentials: the SPA sends the refresh cookie, so it needs a
  // specific origin (a wildcard is not allowed together with credentials).
  const app = await NestFactory.create(AppModule, {
    cors: { origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000', credentials: true },
  })
  app.use(cookieParser())
  app.useGlobalFilters(new DomainExceptionFilter())
  await app.listen(process.env.PORT ?? 5000)
}
bootstrap()

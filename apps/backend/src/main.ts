import * as dotenv from 'dotenv'
dotenv.config()
import cookieParser from 'cookie-parser'
import { mkdirSync } from 'fs'
import { join } from 'path'

import { NestFactory } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import { AppModule } from './app.module'
import { DomainExceptionFilter } from './shared/domain-exception.filter'
import { UPLOADS_DIR, UPLOADS_SUBDIRS } from './upload/uploads.config'

async function bootstrap() {
  // Local (no cloud) file storage: ensure the uploads root and its per-theme
  // subfolders (e.g. uploads/matchs) exist before multer writes into them.
  for (const subdir of UPLOADS_SUBDIRS) {
    mkdirSync(join(UPLOADS_DIR, subdir), { recursive: true })
  }

  // CORS with credentials: the SPA sends the refresh cookie, so it needs a
  // specific origin (a wildcard is not allowed together with credentials).
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: { origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000', credentials: true },
  })
  app.use(cookieParser())
  app.useGlobalFilters(new DomainExceptionFilter())
  // Serve the uploaded files statically at /uploads/** (e.g. /uploads/matchs/x.png).
  app.useStaticAssets(UPLOADS_DIR, { prefix: '/uploads/' })
  await app.listen(process.env.PORT ?? 5000)
}
bootstrap()

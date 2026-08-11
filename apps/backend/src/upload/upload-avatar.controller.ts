import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { extname } from 'path'
import { randomUUID } from 'crypto'
import { AVATARS_UPLOAD_DIR } from './uploads.config'

const MAX_AVATAR_BYTES = 5 * 1024 * 1024 // 5 MB

// Guarded by the AuthMiddleware only (see upload.module): any authenticated user
// uploads their OWN profile picture — same self-service shape as the receipt
// upload, not admin-only. The public URL is saved on User.avatarUrl via
// PATCH /user/me.
@Controller('upload')
export class UploadAvatarController {
  @Post('avatars')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: AVATARS_UPLOAD_DIR,
        filename: (_req, file, callback) =>
          callback(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`),
      }),
      limits: { fileSize: MAX_AVATAR_BYTES },
      fileFilter: (_req, file, callback) => {
        if (!file.mimetype.startsWith('image/')) {
          return callback(new BadRequestException('Only image files are allowed'), false)
        }
        callback(null, true)
      },
    }),
  )
  uploadAvatar(@UploadedFile() file?: Express.Multer.File): { url: string } {
    if (!file) throw new BadRequestException('No avatar uploaded')
    return { url: `/uploads/avatars/${file.filename}` }
  }
}

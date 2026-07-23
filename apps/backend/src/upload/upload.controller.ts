import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { extname } from 'path'
import { randomUUID } from 'crypto'
import { AdminGuard } from '../shared/admin.guard'
import { MATCHS_UPLOAD_DIR } from './uploads.config'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5 MB

// Guarded by the AuthMiddleware (see upload.module) + AdminGuard: only the admin
// (the owner) uploads images. The file is stored locally under uploads/<theme>/
// and the public URL (served at /uploads/**) is returned to be saved on the entity.
@Controller('upload')
@UseGuards(AdminGuard)
export class UploadController {
  @Post('matchs')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: MATCHS_UPLOAD_DIR,
        filename: (_req, file, callback) =>
          callback(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`),
      }),
      limits: { fileSize: MAX_IMAGE_BYTES },
      fileFilter: (_req, file, callback) => {
        if (!file.mimetype.startsWith('image/')) {
          return callback(new BadRequestException('Only image files are allowed'), false)
        }
        callback(null, true)
      },
    }),
  )
  uploadMatchImage(@UploadedFile() file?: Express.Multer.File): { url: string } {
    if (!file) throw new BadRequestException('No image uploaded')
    return { url: `/uploads/matchs/${file.filename}` }
  }
}

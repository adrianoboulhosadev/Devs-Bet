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
import { RECEIPTS_UPLOAD_DIR } from './uploads.config'

const MAX_RECEIPT_BYTES = 10 * 1024 * 1024 // 10 MB

// Guarded by the AuthMiddleware only (see upload.module): any authenticated user
// uploads their OWN Pix receipt as part of opening a deposit — unlike the match
// image upload, this is not admin-only. The file is stored locally under
// uploads/receipts/ and the public URL (served at /uploads/**) is saved on the
// Payment (receiptUrl), which already carries the depositing user's id.
@Controller('upload')
export class UploadReceiptController {
  @Post('receipts')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: RECEIPTS_UPLOAD_DIR,
        filename: (_req, file, callback) =>
          callback(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`),
      }),
      limits: { fileSize: MAX_RECEIPT_BYTES },
      fileFilter: (_req, file, callback) => {
        if (!file.mimetype.startsWith('image/') && file.mimetype !== 'application/pdf') {
          return callback(new BadRequestException('Only image or PDF files are allowed'), false)
        }
        callback(null, true)
      },
    }),
  )
  uploadReceipt(@UploadedFile() file?: Express.Multer.File): { url: string } {
    if (!file) throw new BadRequestException('No receipt uploaded')
    return { url: `/uploads/receipts/${file.filename}` }
  }
}

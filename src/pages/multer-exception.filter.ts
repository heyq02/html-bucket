import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common'
import { Catch, HttpStatus } from '@nestjs/common'
import { MulterError } from 'multer'

import { resolveMaxFileSizeBytes } from './pages.constants.ts'

@Catch(MulterError)
export class MulterExceptionFilter implements ExceptionFilter {
  catch(exception: MulterError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<{
      status: (code: number) => { json: (body: unknown) => void }
    }>()

    if (exception.code === 'LIMIT_FILE_SIZE') {
      const maxBytes = resolveMaxFileSizeBytes()
      response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: `HTML file exceeds max size of ${maxBytes} bytes`
      })
      return
    }

    response.status(HttpStatus.BAD_REQUEST).json({
      statusCode: HttpStatus.BAD_REQUEST,
      message: exception.message || 'Invalid upload'
    })
  }
}

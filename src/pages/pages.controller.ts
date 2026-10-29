import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseFilters,
  UseInterceptors
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { memoryStorage } from 'multer'

import { MulterExceptionFilter } from './multer-exception.filter.ts'
import { resolveMaxFileSizeBytes } from './pages.constants.ts'
import { PagesService } from './pages.service.ts'

interface PublishBody {
  path?: string
  overwrite?: string
}

interface PatchBody {
  path?: string
  enabled?: boolean
}

function parseOverwrite(value: string | undefined): boolean {
  if (value === undefined) {
    return false
  }
  return ['true', '1', 'on', 'yes'].includes(value.toLowerCase())
}

@Controller()
export class PagesController {
  constructor(@Inject(PagesService) private readonly pagesService: PagesService) {}

  @Get('health')
  health() {
    return { status: 'ok' }
  }

  @Post('api/pages')
  @UseFilters(MulterExceptionFilter)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: resolveMaxFileSizeBytes() },
      // Multer's fileFilter API is callback-based.
      // oxlint-disable-next-line promise/prefer-await-to-callbacks -- Multer API
      fileFilter: (_req, file, callback) => {
        const isHtml =
          file.mimetype === 'text/html' || file.originalname.toLowerCase().endsWith('.html')
        if (!isHtml) {
          // oxlint-disable-next-line promise/prefer-await-to-callbacks -- Multer API
          callback(new BadRequestException('Only HTML files are allowed'), false)
          return
        }
        // oxlint-disable-next-line promise/prefer-await-to-callbacks -- Multer API
        callback(null, true)
      }
    })
  )
  async publish(@UploadedFile() file: Express.Multer.File | undefined, @Body() body: PublishBody) {
    if (!file) {
      throw new BadRequestException('HTML file is required')
    }
    if (!body.path) {
      throw new BadRequestException('path is required')
    }

    const maxBytes = resolveMaxFileSizeBytes()
    if (file.size > maxBytes) {
      throw new BadRequestException(`HTML file exceeds max size of ${maxBytes} bytes`)
    }

    return this.pagesService.publish(
      body.path,
      file.buffer.toString('utf8'),
      parseOverwrite(body.overwrite)
    )
  }

  @Get('api/pages')
  async list(@Query('q') q?: string) {
    return this.pagesService.list(q)
  }

  @Patch('api/pages')
  async patch(@Body() body: PatchBody) {
    if (!body.path) {
      throw new BadRequestException('path is required')
    }
    if (typeof body.enabled !== 'boolean') {
      throw new BadRequestException('enabled must be a boolean')
    }
    return this.pagesService.setEnabled(body.path, body.enabled)
  }

  @Delete('api/pages')
  async remove(@Query('path') path?: string) {
    if (!path) {
      throw new BadRequestException('path is required')
    }
    return this.pagesService.remove(path)
  }

  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  async ui(): Promise<string> {
    return readFile(join(process.cwd(), 'dist', 'web', 'index.html'), 'utf8')
  }

  @Get('*path')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async serve(@Param('path') path: string | string[]) {
    const relativePath = Array.isArray(path) ? path.join('/') : path
    // Vite-built assets are served by Nest static middleware under /assets/*.
    if (relativePath === 'assets' || relativePath.startsWith('assets/')) {
      throw new NotFoundException()
    }
    return this.pagesService.getHtml(relativePath)
  }
}

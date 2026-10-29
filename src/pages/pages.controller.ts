import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { memoryStorage } from 'multer';
import { PagesService } from './pages.service';

type PublishBody = {
  path?: string;
  overwrite?: string;
};

type PatchBody = {
  path?: string;
  enabled?: boolean;
};

function parseOverwrite(value: string | undefined): boolean {
  if (value === undefined) {
    return false;
  }
  return ['true', '1', 'on', 'yes'].includes(value.toLowerCase());
}

@Controller()
export class PagesController {
  constructor(private readonly pagesService: PagesService) {}

  @Post('api/pages')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 1024 * 1024 },
      fileFilter: (_req, file, callback) => {
        const isHtml =
          file.mimetype === 'text/html' ||
          file.originalname.toLowerCase().endsWith('.html');
        if (!isHtml) {
          callback(
            new BadRequestException('Only HTML files are allowed') as Error,
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  async publish(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: PublishBody,
  ) {
    if (!file) {
      throw new BadRequestException('HTML file is required');
    }
    if (!body.path) {
      throw new BadRequestException('path is required');
    }

    return this.pagesService.publish(
      body.path,
      file.buffer.toString('utf8'),
      parseOverwrite(body.overwrite),
    );
  }

  @Get('api/pages')
  async list(@Query('q') q?: string) {
    return this.pagesService.list(q);
  }

  @Patch('api/pages')
  async patch(@Body() body: PatchBody) {
    if (!body.path) {
      throw new BadRequestException('path is required');
    }
    if (typeof body.enabled !== 'boolean') {
      throw new BadRequestException('enabled must be a boolean');
    }
    return this.pagesService.setEnabled(body.path, body.enabled);
  }

  @Delete('api/pages')
  async remove(@Query('path') path?: string) {
    if (!path) {
      throw new BadRequestException('path is required');
    }
    return this.pagesService.remove(path);
  }

  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  async ui(): Promise<string> {
    return readFile(join(process.cwd(), 'public', 'index.html'), 'utf8');
  }

  @Get('*path')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async serve(@Param('path') path: string | string[]) {
    const relativePath = Array.isArray(path) ? path.join('/') : path;
    return this.pagesService.getHtml(relativePath);
  }
}

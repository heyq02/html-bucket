import { Module } from '@nestjs/common';
import { join } from 'node:path';
import { PAGE_STORE_ROOT, PUBLIC_BASE_URL } from './pages.constants';
import { PagesController } from './pages.controller';
import { PagesService } from './pages.service';

@Module({
  controllers: [PagesController],
  providers: [
    PagesService,
    {
      provide: PAGE_STORE_ROOT,
      useValue: process.env.PAGE_STORE_ROOT ?? join(process.cwd(), 'storage'),
    },
    {
      provide: PUBLIC_BASE_URL,
      useValue: process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000',
    },
  ],
})
export class PagesModule {}

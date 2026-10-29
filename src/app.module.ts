import { Module } from '@nestjs/common';
import { PagesModule } from './pages/pages.module';

@Module({
  imports: [PagesModule],
})
export class AppModule {}

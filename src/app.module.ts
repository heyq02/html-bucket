import { Module } from '@nestjs/common'

import { PagesModule } from './pages/pages.module.ts'

@Module({
  imports: [PagesModule]
})
export class AppModule {}

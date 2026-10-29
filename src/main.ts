import { join } from 'node:path'

import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'

import { AppModule } from './app.module.ts'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)
  app.useStaticAssets(join(process.cwd(), 'public', 'styles'), {
    prefix: '/styles'
  })
  await app.listen(process.env.PORT ?? 3000)
}
void bootstrap()

import { Global, Module } from '@nestjs/common';
import { CLOCK, systemClock } from '../common/clock';
import { ENV, loadEnv } from './env';

@Global()
@Module({
  providers: [
    { provide: ENV, useFactory: () => loadEnv() },
    { provide: CLOCK, useValue: systemClock },
  ],
  exports: [ENV, CLOCK],
})
export class ConfigModule {}

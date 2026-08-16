import * as migration_20260816_043904_initial from './20260816_043904_initial';

export const migrations = [
  {
    up: migration_20260816_043904_initial.up,
    down: migration_20260816_043904_initial.down,
    name: '20260816_043904_initial'
  },
];

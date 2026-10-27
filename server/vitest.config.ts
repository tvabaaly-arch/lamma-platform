import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgres://lamma:lamma@localhost:5432/lamma_test',
      OTP_DEV_CODE: '1234',
      PUBLIC_API_URL: 'http://localhost:8787',
      UPLOAD_DIR: './.test-uploads',
    },
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
})

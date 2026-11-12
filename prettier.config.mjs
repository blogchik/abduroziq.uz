import shared from './packages/config/prettier.mjs';

/** @type {import('prettier').Config} */
export default {
  ...shared,
  tailwindStylesheet: './apps/web/src/styles/global.css',
};

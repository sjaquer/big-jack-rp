import nextConfig from 'eslint-config-next';

export default [
  ...nextConfig,
  {
    // Ignore generated artifacts beyond the defaults baked into eslint-config-next
    ignores: ['node_modules/**', '.next/**', 'dist/**']
  }
];
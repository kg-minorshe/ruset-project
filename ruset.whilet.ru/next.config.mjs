/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',  // Включает статическую генерацию
  images: {
    unoptimized: true,  // Для статической генерации часто нужно отключить оптимизацию изображений
  },
  devIndicators: false,
  // Если у вас есть базовый путь, например, для GitHub Pages
  // basePath: '/your-repo-name',
  // trailingSlash: true, // Добавляйте, если нужны конечные слеши в URL
  reactStrictMode: false,
};

export default nextConfig;
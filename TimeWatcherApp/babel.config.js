// babel.config.js
module.exports = function(api) {
    api.cache(true);
    return {
      presets: ['babel-preset-expo'],
      plugins: [
        [
          'module-resolver',
          {
            root: ['./'], // Your project's root directory
            alias: {
              // Ensure these aliases match your project structure
              // Adjust paths if your components are in a 'src' folder (e.g., './src/components')
              '@/assets': './assets',
              '@/components': './components', // This is the one you need!
              '@/constants': './constants',
              '@/hooks': './hooks',
              '@/navigation': './navigation',
              // Add any other aliases you use (e.g., '@/utils', '@/api', '@/screens')
            },
          },
        ],
      ],
    };
  };
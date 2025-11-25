module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // NOTE: Keep this plugin LAST in the list
      'react-native-reanimated/plugin'
    ]
  };
};

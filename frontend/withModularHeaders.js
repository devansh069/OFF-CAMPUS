const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withModularHeaders = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfile = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfile, 'utf8');
      
      if (!contents.includes('use_modular_headers!')) {
        // Insert use_modular_headers! right after use_expo_modules!
        contents = contents.replace(
          /use_expo_modules!/,
          "use_expo_modules!\n  use_modular_headers!"
        );
        fs.writeFileSync(podfile, contents);
      }
      return config;
    },
  ]);
};

module.exports = withModularHeaders;

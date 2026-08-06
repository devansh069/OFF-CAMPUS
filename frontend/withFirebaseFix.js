const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withFirebaseFix = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfile = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      if (!fs.existsSync(podfile)) {
        return config;
      }
      let contents = fs.readFileSync(podfile, 'utf8');
      
      const snippet = `
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
    end
  end
`;
      if (!contents.includes('CLANG_ALLOW_NON_MODULAR_INCLUDES')) {
        contents = contents.replace(
          /post_install do \|installer\|/,
          `post_install do |installer|\n${snippet}`
        );
        fs.writeFileSync(podfile, contents);
      }
      return config;
    },
  ]);
};

module.exports = withFirebaseFix;

// Custom Expo config plugin to ensure FirebaseApp.configure() is called in Swift AppDelegate
// This is needed because @react-native-firebase/app may fail to inject it on Swift AppDelegates

const { withAppDelegate } = require('@expo/config-plugins');

const withFirebaseSwiftAppDelegate = (config) => {
  return withAppDelegate(config, (modConfig) => {
    const { language } = modConfig.modResults;

    // Only apply for Swift AppDelegates
    if (language !== 'swift') {
      return modConfig;
    }

    let contents = modConfig.modResults.contents;

    // 1. Add 'import FirebaseCore' if not already present
    if (!contents.includes('import FirebaseCore') && !contents.includes('import Firebase')) {
      // Insert after the last import statement
      const lastImportIndex = contents.lastIndexOf('import ');
      const endOfLastImport = contents.indexOf('\n', lastImportIndex);
      contents =
        contents.slice(0, endOfLastImport + 1) +
        'import FirebaseCore\n' +
        contents.slice(endOfLastImport + 1);
    }

    // 2. Add FirebaseApp.configure() in didFinishLaunchingWithOptions if not present
    if (
      !contents.includes('FirebaseApp.configure()') &&
      !contents.includes('FIRApp.configure()')
    ) {
      // Match the didFinishLaunchingWithOptions method opening brace
      const didFinishRegex =
        /(func\s+application\s*\(\s*_\s+application\s*:\s*UIApplication\s*,\s*didFinishLaunchingWithOptions[\s\S]*?\{\s*\n)/;
      const match = contents.match(didFinishRegex);
      if (match) {
        contents = contents.replace(
          match[0],
          match[0] + '    FirebaseApp.configure()\n'
        );
      } else {
        // Fallback: try a simpler pattern
        const simpleRegex = /(didFinishLaunchingWithOptions[^{]*\{\s*\n)/;
        const simpleMatch = contents.match(simpleRegex);
        if (simpleMatch) {
          contents = contents.replace(
            simpleMatch[0],
            simpleMatch[0] + '    FirebaseApp.configure()\n'
          );
        }
      }
    }

    modConfig.modResults.contents = contents;
    return modConfig;
  });
};

module.exports = withFirebaseSwiftAppDelegate;

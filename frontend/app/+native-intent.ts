export function redirectSystemPath({
  path,
  initial,
}: {
  path: string;
  initial: boolean;
}) {
  try {
    if (path.includes('firebaseauth')) {
      return '/welcome';
    }
    return path;
  } catch {
    return '/welcome';
  }
}

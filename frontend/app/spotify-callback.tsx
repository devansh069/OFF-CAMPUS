import { Redirect } from 'expo-router';
import React from 'react';

export default function SpotifyCallback() {
  return <Redirect href="/(tabs)/profile" />;
}

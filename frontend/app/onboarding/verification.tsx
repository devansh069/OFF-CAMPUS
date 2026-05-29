import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function Verification() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Verification (Coming Soon)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#FFF',
    fontSize: 18,
  },
});

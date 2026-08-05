import React from 'react';
import { View, StyleSheet } from 'react-native';

interface SpeedometerRingProps {
  size: number;
  strokeWidth: number;
  percentage: number;
  bgStrokeColor?: string;
  activeStrokeColor?: string;
  children?: React.ReactNode;
}

export const SpeedometerRing: React.FC<SpeedometerRingProps> = ({
  size,
  strokeWidth,
  percentage,
  bgStrokeColor = 'rgba(255, 255, 255, 0.15)',
  activeStrokeColor = '#8E8E93',
  children,
}) => {
  const radius = size / 2;
  const clampedPct = Math.min(100, Math.max(0, percentage));

  // Angles in degrees
  const angle1 = Math.min(180, (clampedPct / 100) * 360);
  const angle2 = Math.max(0, ((clampedPct - 50) / 100) * 360);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Background Ring */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: radius,
          borderWidth: strokeWidth,
          borderColor: bgStrokeColor,
        }}
      />

      {/* First 50% Arc (Right half: 0 to 180 degrees) */}
      {clampedPct > 0 && (
        <View
          style={{
            position: 'absolute',
            width: radius,
            height: size,
            left: radius,
            top: 0,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              position: 'absolute',
              width: size,
              height: size,
              left: -radius,
              top: 0,
              borderRadius: radius,
              borderWidth: strokeWidth,
              borderRightColor: activeStrokeColor,
              borderTopColor: activeStrokeColor,
              borderLeftColor: 'transparent',
              borderBottomColor: 'transparent',
              transform: [{ rotate: `${angle1 - 180}deg` }],
            }}
          />
        </View>
      )}

      {/* Second 50% Arc (Left half: 180 to 360 degrees) */}
      {clampedPct > 50 && (
        <View
          style={{
            position: 'absolute',
            width: radius,
            height: size,
            left: 0,
            top: 0,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              position: 'absolute',
              width: size,
              height: size,
              left: 0,
              top: 0,
              borderRadius: radius,
              borderWidth: strokeWidth,
              borderLeftColor: activeStrokeColor,
              borderBottomColor: activeStrokeColor,
              borderRightColor: 'transparent',
              borderTopColor: 'transparent',
              transform: [{ rotate: `${angle2 - 180}deg` }],
            }}
          />
        </View>
      )}

      {/* Children inside ring (Avatar) */}
      <View
        style={{
          width: size - strokeWidth * 2 - 8,
          height: size - strokeWidth * 2 - 8,
          borderRadius: (size - strokeWidth * 2 - 8) / 2,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {children}
      </View>
    </View>
  );
};

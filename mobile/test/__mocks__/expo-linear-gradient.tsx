import React from 'react';
import { View } from 'react-native';

const MockLinearGradient = (props: any) =>
  React.createElement(View, { ...props, testID: 'linear-gradient-mock' });

MockLinearGradient.displayName = 'LinearGradient';

export default MockLinearGradient;
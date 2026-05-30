const React = require('react');
const { View } = require('react-native');

const createMockComponent = (displayName: string) => {
  const MockComponent = (props: any) =>
    React.createElement(View, { ...props, testID: `${displayName}-mock` });
  MockComponent.displayName = displayName;
  return MockComponent;
};

const MapView: any = createMockComponent('MapView');
MapView.Camera = createMockComponent('Camera');
MapView.UserLocation = createMockComponent('UserLocation');
MapView.PointAnnotation = createMockComponent('PointAnnotation');
MapView.Callout = createMockComponent('Callout');
MapView.ShapeSource = createMockComponent('ShapeSource');
MapView.LineLayer = createMockComponent('LineLayer');
MapView.CircleLayer = createMockComponent('CircleLayer');
MapView.FillLayer = createMockComponent('FillLayer');
MapView.MarkerView = createMockComponent('MarkerView');
MapView.Images = createMockComponent('Images');
MapView.Image = createMockComponent('Image');

module.exports = { __esModule: true, default: MapView, MapView };
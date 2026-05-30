export default jest.fn().mockImplementation(() => ({
  addListener: jest.fn(() => ({ remove: jest.fn() })),
}));
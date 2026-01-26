// Mock for ../config/database

const mockQuery = jest.fn();
const mockGetClient = jest.fn();

module.exports = {
  query: mockQuery,
  getClient: mockGetClient,
  pool: {
    on: jest.fn(),
    connect: jest.fn(),
    end: jest.fn()
  }
};

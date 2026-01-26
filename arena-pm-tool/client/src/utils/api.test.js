/* eslint-disable import/first */
jest.mock('axios', () => require('axios/dist/node/axios.cjs'));

import { safeApiCall } from './api';

test('retries retryable errors before succeeding', async () => {
  const request = jest
    .fn()
    .mockRejectedValueOnce({ response: { status: 500 } })
    .mockResolvedValueOnce({ data: 'ok' });

  const result = await safeApiCall(request, { retries: 1, retryDelay: 0 });

  expect(result).toEqual({ data: 'ok' });
  expect(request).toHaveBeenCalledTimes(2);
});

test('does not retry non-retryable errors', async () => {
  const request = jest.fn().mockRejectedValue({ response: { status: 400 } });

  await expect(
    safeApiCall(request, { retries: 2, retryDelay: 0 })
  ).rejects.toEqual({ response: { status: 400 } });
  expect(request).toHaveBeenCalledTimes(1);
});

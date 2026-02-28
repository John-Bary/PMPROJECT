/* eslint-disable import/first */
jest.mock('axios', () => require('axios/dist/node/axios.cjs'));

import api, {
  safeApiCall,
  resetAuthInterceptorFlag,
  authAPI,
  tasksAPI,
  categoriesAPI,
  usersAPI,
  commentsAPI,
  holidaysAPI,
  workspacesAPI,
  meAPI,
  billingAPI,
  adminAPI,
} from './api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a mock function that rejects N times then resolves. */
const failThenSucceed = (failures, result = { data: 'ok' }) => {
  const fn = jest.fn();
  for (let i = 0; i < failures.length; i++) {
    fn.mockRejectedValueOnce(failures[i]);
  }
  fn.mockResolvedValueOnce(result);
  return fn;
};

// ---------------------------------------------------------------------------
// 1. safeApiCall — additional scenarios
// ---------------------------------------------------------------------------
describe('safeApiCall', () => {
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

  test('retries network errors (no error.response)', async () => {
    const networkErr = new Error('Network Error');
    const request = failThenSucceed([networkErr], { data: 'recovered' });

    const result = await safeApiCall(request, { retries: 1, retryDelay: 0 });
    expect(result).toEqual({ data: 'recovered' });
    expect(request).toHaveBeenCalledTimes(2);
  });

  test('retries on 429 status', async () => {
    const request = failThenSucceed(
      [{ response: { status: 429 } }],
      { data: 'rate-limit-recovered' }
    );
    const result = await safeApiCall(request, { retries: 1, retryDelay: 0 });
    expect(result).toEqual({ data: 'rate-limit-recovered' });
    expect(request).toHaveBeenCalledTimes(2);
  });

  test('retries on 502 status', async () => {
    const request = failThenSucceed(
      [{ response: { status: 502 } }],
      { data: 'ok' }
    );
    const result = await safeApiCall(request, { retries: 1, retryDelay: 0 });
    expect(result).toEqual({ data: 'ok' });
    expect(request).toHaveBeenCalledTimes(2);
  });

  test('retries on 503 status', async () => {
    const request = failThenSucceed(
      [{ response: { status: 503 } }],
      { data: 'ok' }
    );
    const result = await safeApiCall(request, { retries: 1, retryDelay: 0 });
    expect(result).toEqual({ data: 'ok' });
    expect(request).toHaveBeenCalledTimes(2);
  });

  test('retries on 504 status', async () => {
    const request = failThenSucceed(
      [{ response: { status: 504 } }],
      { data: 'ok' }
    );
    const result = await safeApiCall(request, { retries: 1, retryDelay: 0 });
    expect(result).toEqual({ data: 'ok' });
    expect(request).toHaveBeenCalledTimes(2);
  });

  test('respects retries: 0 (no retries)', async () => {
    const request = jest.fn().mockRejectedValue({ response: { status: 500 } });

    await expect(
      safeApiCall(request, { retries: 0, retryDelay: 0 })
    ).rejects.toEqual({ response: { status: 500 } });
    expect(request).toHaveBeenCalledTimes(1);
  });

  test('respects custom retryDelay', async () => {
    const request = failThenSucceed(
      [{ response: { status: 500 } }],
      { data: 'delayed' }
    );

    const start = Date.now();
    const result = await safeApiCall(request, { retries: 1, retryDelay: 50 });
    const elapsed = Date.now() - start;

    expect(result).toEqual({ data: 'delayed' });
    // retryDelay * (attempt + 1) = 50 * 1 = 50ms minimum
    expect(elapsed).toBeGreaterThanOrEqual(40); // allow some timing slack
  });

  test('exhausts all retries and then throws', async () => {
    const retryableErr = { response: { status: 502 } };
    const request = jest.fn().mockRejectedValue(retryableErr);

    await expect(
      safeApiCall(request, { retries: 3, retryDelay: 0 })
    ).rejects.toEqual(retryableErr);
    // 1 initial + 3 retries = 4 total calls
    expect(request).toHaveBeenCalledTimes(4);
  });

  test('first attempt succeeds without retries', async () => {
    const request = jest.fn().mockResolvedValue({ data: 'instant' });

    const result = await safeApiCall(request, { retries: 3, retryDelay: 0 });
    expect(result).toEqual({ data: 'instant' });
    expect(request).toHaveBeenCalledTimes(1);
  });

  test('uses default options when none provided', async () => {
    const request = jest.fn().mockResolvedValue({ data: 'defaults' });
    const result = await safeApiCall(request);
    expect(result).toEqual({ data: 'defaults' });
    expect(request).toHaveBeenCalledTimes(1);
  });

  test('does not retry 401 errors', async () => {
    const request = jest.fn().mockRejectedValue({ response: { status: 401 } });
    await expect(
      safeApiCall(request, { retries: 2, retryDelay: 0 })
    ).rejects.toEqual({ response: { status: 401 } });
    expect(request).toHaveBeenCalledTimes(1);
  });

  test('does not retry 403 errors', async () => {
    const request = jest.fn().mockRejectedValue({ response: { status: 403 } });
    await expect(
      safeApiCall(request, { retries: 2, retryDelay: 0 })
    ).rejects.toEqual({ response: { status: 403 } });
    expect(request).toHaveBeenCalledTimes(1);
  });

  test('does not retry 404 errors', async () => {
    const request = jest.fn().mockRejectedValue({ response: { status: 404 } });
    await expect(
      safeApiCall(request, { retries: 2, retryDelay: 0 })
    ).rejects.toEqual({ response: { status: 404 } });
    expect(request).toHaveBeenCalledTimes(1);
  });

  test('does not retry 422 errors', async () => {
    const request = jest.fn().mockRejectedValue({ response: { status: 422 } });
    await expect(
      safeApiCall(request, { retries: 2, retryDelay: 0 })
    ).rejects.toEqual({ response: { status: 422 } });
    expect(request).toHaveBeenCalledTimes(1);
  });

  test('retries multiple times through different retryable statuses', async () => {
    const request = jest.fn()
      .mockRejectedValueOnce({ response: { status: 502 } })
      .mockRejectedValueOnce({ response: { status: 503 } })
      .mockResolvedValueOnce({ data: 'after-multiple-retries' });

    const result = await safeApiCall(request, { retries: 2, retryDelay: 0 });
    expect(result).toEqual({ data: 'after-multiple-retries' });
    expect(request).toHaveBeenCalledTimes(3);
  });
});

// ---------------------------------------------------------------------------
// 2. resetAuthInterceptorFlag
// ---------------------------------------------------------------------------
describe('resetAuthInterceptorFlag', () => {
  test('is a function', () => {
    expect(typeof resetAuthInterceptorFlag).toBe('function');
  });

  test('is callable and does not throw', () => {
    expect(() => resetAuthInterceptorFlag()).not.toThrow();
  });

  test('returns undefined', () => {
    expect(resetAuthInterceptorFlag()).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 3. Default export — api is an axios instance
// ---------------------------------------------------------------------------
describe('default export (api)', () => {
  test('is a callable axios instance', () => {
    // Axios instances are functions (callable) with methods attached
    expect(typeof api).toBe('function');
  });

  test('has axios instance methods', () => {
    expect(typeof api.get).toBe('function');
    expect(typeof api.post).toBe('function');
    expect(typeof api.put).toBe('function');
    expect(typeof api.patch).toBe('function');
    expect(typeof api.delete).toBe('function');
  });

  test('has interceptors', () => {
    expect(api.interceptors).toBeDefined();
    expect(api.interceptors.request).toBeDefined();
    expect(api.interceptors.response).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 4. API object exports — verify structure and method types
// ---------------------------------------------------------------------------
describe('authAPI', () => {
  const expectedMethods = [
    'login', 'register', 'logout', 'refresh', 'getCurrentUser',
    'getAllUsers', 'forgotPassword', 'resetPassword', 'verifyEmail',
    'resendVerification',
  ];

  test.each(expectedMethods)('%s is a function', (method) => {
    expect(typeof authAPI[method]).toBe('function');
  });
});

describe('tasksAPI', () => {
  const expectedMethods = [
    'getAll', 'getById', 'create', 'update', 'updatePosition',
    'delete', 'getSubtasks',
  ];

  test.each(expectedMethods)('%s is a function', (method) => {
    expect(typeof tasksAPI[method]).toBe('function');
  });
});

describe('categoriesAPI', () => {
  const expectedMethods = [
    'getAll', 'getById', 'create', 'update', 'delete', 'reorder',
  ];

  test.each(expectedMethods)('%s is a function', (method) => {
    expect(typeof categoriesAPI[method]).toBe('function');
  });
});

describe('usersAPI', () => {
  const expectedMethods = ['getAll', 'getById'];

  test.each(expectedMethods)('%s is a function', (method) => {
    expect(typeof usersAPI[method]).toBe('function');
  });
});

describe('commentsAPI', () => {
  const expectedMethods = ['getByTaskId', 'create', 'update', 'delete'];

  test.each(expectedMethods)('%s is a function', (method) => {
    expect(typeof commentsAPI[method]).toBe('function');
  });
});

describe('holidaysAPI', () => {
  test('getByYear is a function', () => {
    expect(typeof holidaysAPI.getByYear).toBe('function');
  });
});

describe('workspacesAPI', () => {
  const expectedMethods = [
    'getAll', 'getById', 'create', 'update', 'delete',
    'getMembers', 'updateMemberRole', 'removeMember',
    'invite', 'getInvitations', 'cancelInvitation', 'acceptInvitation',
    'getInviteInfo', 'getUsers',
    'getOnboardingStatus', 'startOnboarding', 'updateOnboardingProgress',
    'completeOnboarding', 'skipOnboarding',
    'getActivity',
  ];

  test.each(expectedMethods)('%s is a function', (method) => {
    expect(typeof workspacesAPI[method]).toBe('function');
  });
});

describe('meAPI', () => {
  const expectedMethods = [
    'getProfile', 'updateProfile', 'updatePreferences', 'updateNotifications',
    'uploadAvatar', 'deleteAvatar', 'changePassword', 'deleteAccount',
    'exportTasksCsv', 'getMyTasks',
  ];

  test.each(expectedMethods)('%s is a function', (method) => {
    expect(typeof meAPI[method]).toBe('function');
  });
});

describe('billingAPI', () => {
  const expectedMethods = [
    'getPlans', 'getSubscription', 'createCheckout', 'createPortalSession',
  ];

  test.each(expectedMethods)('%s is a function', (method) => {
    expect(typeof billingAPI[method]).toBe('function');
  });
});

describe('adminAPI', () => {
  test('getStats is a function', () => {
    expect(typeof adminAPI.getStats).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// 5–8. API methods that build query strings / use special options
//       We spy on the internal api instance to verify correct URL construction.
// ---------------------------------------------------------------------------
describe('tasksAPI.getAll with filters', () => {
  let getSpy;

  beforeEach(() => {
    getSpy = jest.spyOn(api, 'get').mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    getSpy.mockRestore();
  });

  test('passes filter parameters as URL query string', async () => {
    await tasksAPI.getAll({ status: 'todo', priority: 'high' });
    expect(getSpy).toHaveBeenCalledTimes(1);
    const url = getSpy.mock.calls[0][0];
    expect(url).toContain('status=todo');
    expect(url).toContain('priority=high');
  });

  test('skips undefined values', async () => {
    await tasksAPI.getAll({ status: 'todo', assignee: undefined });
    const url = getSpy.mock.calls[0][0];
    expect(url).toContain('status=todo');
    expect(url).not.toContain('assignee');
  });

  test('skips null values', async () => {
    await tasksAPI.getAll({ status: 'todo', assignee: null });
    const url = getSpy.mock.calls[0][0];
    expect(url).toContain('status=todo');
    expect(url).not.toContain('assignee');
  });

  test('skips empty string values', async () => {
    await tasksAPI.getAll({ status: 'todo', search: '' });
    const url = getSpy.mock.calls[0][0];
    expect(url).toContain('status=todo');
    expect(url).not.toContain('search');
  });

  test('produces clean URL with no filters', async () => {
    await tasksAPI.getAll({});
    const url = getSpy.mock.calls[0][0];
    expect(url).toBe('/tasks?');
  });

  test('uses empty object as default filters', async () => {
    await tasksAPI.getAll();
    const url = getSpy.mock.calls[0][0];
    expect(url).toBe('/tasks?');
  });
});

describe('categoriesAPI.getAll with params', () => {
  let getSpy;

  beforeEach(() => {
    getSpy = jest.spyOn(api, 'get').mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    getSpy.mockRestore();
  });

  test('passes parameters as URL query string', async () => {
    await categoriesAPI.getAll({ workspace_id: 'ws-123', page: '1' });
    const url = getSpy.mock.calls[0][0];
    expect(url).toContain('workspace_id=ws-123');
    expect(url).toContain('page=1');
  });

  test('returns clean URL when no params provided', async () => {
    await categoriesAPI.getAll();
    const url = getSpy.mock.calls[0][0];
    expect(url).toBe('/categories');
  });

  test('returns clean URL when params are empty object', async () => {
    await categoriesAPI.getAll({});
    const url = getSpy.mock.calls[0][0];
    expect(url).toBe('/categories');
  });

  test('skips undefined, null, and empty string values', async () => {
    await categoriesAPI.getAll({ workspace_id: 'ws-1', a: undefined, b: null, c: '' });
    const url = getSpy.mock.calls[0][0];
    expect(url).toContain('workspace_id=ws-1');
    expect(url).not.toContain('a=');
    expect(url).not.toContain('b=');
    expect(url).not.toContain('c=');
  });
});

describe('meAPI.exportTasksCsv', () => {
  let getSpy;

  beforeEach(() => {
    getSpy = jest.spyOn(api, 'get').mockResolvedValue({ data: 'csv-blob' });
  });

  afterEach(() => {
    getSpy.mockRestore();
  });

  test('uses responseType blob', async () => {
    await meAPI.exportTasksCsv();
    expect(getSpy).toHaveBeenCalledTimes(1);
    const [, config] = getSpy.mock.calls[0];
    expect(config).toEqual({ responseType: 'blob' });
  });

  test('passes query params', async () => {
    await meAPI.exportTasksCsv({ status: 'completed', workspace_id: 'ws-1' });
    const url = getSpy.mock.calls[0][0];
    expect(url).toContain('status=completed');
    expect(url).toContain('workspace_id=ws-1');
  });

  test('produces clean URL with no params', async () => {
    await meAPI.exportTasksCsv();
    const url = getSpy.mock.calls[0][0];
    expect(url).toBe('/me/tasks/export');
  });

  test('skips undefined, null, and empty string values', async () => {
    await meAPI.exportTasksCsv({ status: 'done', x: undefined, y: null, z: '' });
    const url = getSpy.mock.calls[0][0];
    expect(url).toContain('status=done');
    expect(url).not.toContain('x=');
    expect(url).not.toContain('y=');
    expect(url).not.toContain('z=');
  });
});

describe('meAPI.getMyTasks with params', () => {
  let getSpy;

  beforeEach(() => {
    getSpy = jest.spyOn(api, 'get').mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    getSpy.mockRestore();
  });

  test('passes query params', async () => {
    await meAPI.getMyTasks({ workspace_id: 'ws-1', status: 'in_progress' });
    const url = getSpy.mock.calls[0][0];
    expect(url).toContain('workspace_id=ws-1');
    expect(url).toContain('status=in_progress');
  });

  test('produces clean URL with no params', async () => {
    await meAPI.getMyTasks();
    const url = getSpy.mock.calls[0][0];
    expect(url).toBe('/me/tasks');
  });

  test('skips undefined, null, and empty string values', async () => {
    await meAPI.getMyTasks({ status: 'todo', a: undefined, b: null, c: '' });
    const url = getSpy.mock.calls[0][0];
    expect(url).toContain('status=todo');
    expect(url).not.toContain('a=');
    expect(url).not.toContain('b=');
    expect(url).not.toContain('c=');
  });
});

describe('workspacesAPI.getActivity with params', () => {
  let getSpy;

  beforeEach(() => {
    getSpy = jest.spyOn(api, 'get').mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    getSpy.mockRestore();
  });

  test('passes limit and offset as query params', async () => {
    await workspacesAPI.getActivity('ws-1', { limit: 20, offset: 5 });
    const url = getSpy.mock.calls[0][0];
    expect(url).toContain('/workspaces/ws-1/activity');
    expect(url).toContain('limit=20');
    expect(url).toContain('offset=5');
  });

  test('produces clean URL with no params', async () => {
    await workspacesAPI.getActivity('ws-1');
    const url = getSpy.mock.calls[0][0];
    expect(url).toBe('/workspaces/ws-1/activity');
  });

  test('produces clean URL with empty params', async () => {
    await workspacesAPI.getActivity('ws-1', {});
    const url = getSpy.mock.calls[0][0];
    expect(url).toBe('/workspaces/ws-1/activity');
  });

  test('passes only limit when offset is missing', async () => {
    await workspacesAPI.getActivity('ws-1', { limit: 10 });
    const url = getSpy.mock.calls[0][0];
    expect(url).toContain('limit=10');
    expect(url).not.toContain('offset');
  });
});

// ---------------------------------------------------------------------------
// Additional API method URL / payload verification
// ---------------------------------------------------------------------------
describe('tasksAPI methods call correct endpoints', () => {
  let getSpy, postSpy, putSpy, patchSpy, deleteSpy;

  beforeEach(() => {
    getSpy = jest.spyOn(api, 'get').mockResolvedValue({ data: {} });
    postSpy = jest.spyOn(api, 'post').mockResolvedValue({ data: {} });
    putSpy = jest.spyOn(api, 'put').mockResolvedValue({ data: {} });
    patchSpy = jest.spyOn(api, 'patch').mockResolvedValue({ data: {} });
    deleteSpy = jest.spyOn(api, 'delete').mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    getSpy.mockRestore();
    postSpy.mockRestore();
    putSpy.mockRestore();
    patchSpy.mockRestore();
    deleteSpy.mockRestore();
  });

  test('getById calls GET /tasks/:id', async () => {
    await tasksAPI.getById('t-1');
    expect(getSpy).toHaveBeenCalledWith('/tasks/t-1');
  });

  test('create calls POST /tasks', async () => {
    const data = { title: 'New' };
    await tasksAPI.create(data);
    expect(postSpy).toHaveBeenCalledWith('/tasks', data);
  });

  test('update calls PUT /tasks/:id', async () => {
    const data = { title: 'Updated' };
    await tasksAPI.update('t-1', data);
    expect(putSpy).toHaveBeenCalledWith('/tasks/t-1', data);
  });

  test('updatePosition calls PATCH /tasks/:id/position', async () => {
    const data = { position: 5 };
    await tasksAPI.updatePosition('t-1', data);
    expect(patchSpy).toHaveBeenCalledWith('/tasks/t-1/position', data);
  });

  test('delete calls DELETE /tasks/:id', async () => {
    await tasksAPI.delete('t-1');
    expect(deleteSpy).toHaveBeenCalledWith('/tasks/t-1');
  });

  test('getSubtasks calls GET /tasks/:id/subtasks', async () => {
    await tasksAPI.getSubtasks('t-1');
    expect(getSpy).toHaveBeenCalledWith('/tasks/t-1/subtasks');
  });
});

describe('categoriesAPI methods call correct endpoints', () => {
  let getSpy, postSpy, putSpy, patchSpy, deleteSpy;

  beforeEach(() => {
    getSpy = jest.spyOn(api, 'get').mockResolvedValue({ data: {} });
    postSpy = jest.spyOn(api, 'post').mockResolvedValue({ data: {} });
    putSpy = jest.spyOn(api, 'put').mockResolvedValue({ data: {} });
    patchSpy = jest.spyOn(api, 'patch').mockResolvedValue({ data: {} });
    deleteSpy = jest.spyOn(api, 'delete').mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    getSpy.mockRestore();
    postSpy.mockRestore();
    putSpy.mockRestore();
    patchSpy.mockRestore();
    deleteSpy.mockRestore();
  });

  test('getById calls GET /categories/:id', async () => {
    await categoriesAPI.getById('c-1');
    expect(getSpy).toHaveBeenCalledWith('/categories/c-1');
  });

  test('create calls POST /categories', async () => {
    const data = { name: 'Cat' };
    await categoriesAPI.create(data);
    expect(postSpy).toHaveBeenCalledWith('/categories', data);
  });

  test('update calls PUT /categories/:id', async () => {
    const data = { name: 'Updated Cat' };
    await categoriesAPI.update('c-1', data);
    expect(putSpy).toHaveBeenCalledWith('/categories/c-1', data);
  });

  test('delete calls DELETE /categories/:id', async () => {
    await categoriesAPI.delete('c-1');
    expect(deleteSpy).toHaveBeenCalledWith('/categories/c-1');
  });

  test('reorder calls PATCH /categories/reorder', async () => {
    const ids = ['c-1', 'c-2', 'c-3'];
    await categoriesAPI.reorder(ids);
    expect(patchSpy).toHaveBeenCalledWith('/categories/reorder', { categoryIds: ids });
  });
});

describe('commentsAPI methods call correct endpoints', () => {
  let getSpy, postSpy, putSpy, deleteSpy;

  beforeEach(() => {
    getSpy = jest.spyOn(api, 'get').mockResolvedValue({ data: {} });
    postSpy = jest.spyOn(api, 'post').mockResolvedValue({ data: {} });
    putSpy = jest.spyOn(api, 'put').mockResolvedValue({ data: {} });
    deleteSpy = jest.spyOn(api, 'delete').mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    getSpy.mockRestore();
    postSpy.mockRestore();
    putSpy.mockRestore();
    deleteSpy.mockRestore();
  });

  test('getByTaskId calls GET /tasks/:taskId/comments', async () => {
    await commentsAPI.getByTaskId('t-1');
    expect(getSpy).toHaveBeenCalledWith('/tasks/t-1/comments');
  });

  test('create calls POST /tasks/:taskId/comments', async () => {
    const data = { content: 'Hello' };
    await commentsAPI.create('t-1', data);
    expect(postSpy).toHaveBeenCalledWith('/tasks/t-1/comments', data);
  });

  test('update calls PUT /comments/:id', async () => {
    const data = { content: 'Updated' };
    await commentsAPI.update('cm-1', data);
    expect(putSpy).toHaveBeenCalledWith('/comments/cm-1', data);
  });

  test('delete calls DELETE /comments/:id', async () => {
    await commentsAPI.delete('cm-1');
    expect(deleteSpy).toHaveBeenCalledWith('/comments/cm-1');
  });
});

describe('holidaysAPI methods call correct endpoints', () => {
  let getSpy;

  beforeEach(() => {
    getSpy = jest.spyOn(api, 'get').mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    getSpy.mockRestore();
  });

  test('getByYear calls GET /holidays?year=...', async () => {
    await holidaysAPI.getByYear(2026);
    expect(getSpy).toHaveBeenCalledWith('/holidays?year=2026');
  });
});

describe('usersAPI methods call correct endpoints', () => {
  let getSpy;

  beforeEach(() => {
    getSpy = jest.spyOn(api, 'get').mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    getSpy.mockRestore();
  });

  test('getAll calls GET /auth/users', async () => {
    await usersAPI.getAll();
    expect(getSpy).toHaveBeenCalledWith('/auth/users');
  });

  test('getById calls GET /auth/users/:id', async () => {
    await usersAPI.getById('u-1');
    expect(getSpy).toHaveBeenCalledWith('/auth/users/u-1');
  });
});

describe('authAPI methods call correct endpoints', () => {
  let getSpy, postSpy;

  beforeEach(() => {
    getSpy = jest.spyOn(api, 'get').mockResolvedValue({ data: {} });
    postSpy = jest.spyOn(api, 'post').mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    getSpy.mockRestore();
    postSpy.mockRestore();
  });

  test('login calls POST /auth/login with credentials', async () => {
    const creds = { email: 'a@b.com', password: 'pass' };
    await authAPI.login(creds);
    expect(postSpy).toHaveBeenCalledWith('/auth/login', creds);
  });

  test('register calls POST /auth/register with user data', async () => {
    const data = { email: 'a@b.com', password: 'pass', name: 'Test' };
    await authAPI.register(data);
    expect(postSpy).toHaveBeenCalledWith('/auth/register', data);
  });

  test('logout calls POST /auth/logout', async () => {
    await authAPI.logout();
    expect(postSpy).toHaveBeenCalledWith('/auth/logout');
  });

  test('refresh calls POST /auth/refresh', async () => {
    await authAPI.refresh();
    expect(postSpy).toHaveBeenCalledWith('/auth/refresh');
  });

  test('getCurrentUser calls GET /auth/me', async () => {
    await authAPI.getCurrentUser();
    expect(getSpy).toHaveBeenCalledWith('/auth/me');
  });

  test('getAllUsers calls GET /auth/users', async () => {
    await authAPI.getAllUsers();
    expect(getSpy).toHaveBeenCalledWith('/auth/users');
  });

  test('forgotPassword calls POST /auth/forgot-password', async () => {
    await authAPI.forgotPassword('a@b.com');
    expect(postSpy).toHaveBeenCalledWith('/auth/forgot-password', { email: 'a@b.com' });
  });

  test('resetPassword calls POST /auth/reset-password', async () => {
    await authAPI.resetPassword('tok', 'newpass');
    expect(postSpy).toHaveBeenCalledWith('/auth/reset-password', { token: 'tok', password: 'newpass' });
  });

  test('verifyEmail calls POST /auth/verify-email', async () => {
    await authAPI.verifyEmail('tok');
    expect(postSpy).toHaveBeenCalledWith('/auth/verify-email', { token: 'tok' });
  });

  test('resendVerification calls POST /auth/resend-verification', async () => {
    await authAPI.resendVerification();
    expect(postSpy).toHaveBeenCalledWith('/auth/resend-verification');
  });
});

describe('workspacesAPI methods call correct endpoints', () => {
  let getSpy, postSpy, putSpy, patchSpy, deleteSpy;

  beforeEach(() => {
    getSpy = jest.spyOn(api, 'get').mockResolvedValue({ data: {} });
    postSpy = jest.spyOn(api, 'post').mockResolvedValue({ data: {} });
    putSpy = jest.spyOn(api, 'put').mockResolvedValue({ data: {} });
    patchSpy = jest.spyOn(api, 'patch').mockResolvedValue({ data: {} });
    deleteSpy = jest.spyOn(api, 'delete').mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    getSpy.mockRestore();
    postSpy.mockRestore();
    putSpy.mockRestore();
    patchSpy.mockRestore();
    deleteSpy.mockRestore();
  });

  test('getAll calls GET /workspaces', async () => {
    await workspacesAPI.getAll();
    expect(getSpy).toHaveBeenCalledWith('/workspaces');
  });

  test('getById calls GET /workspaces/:id', async () => {
    await workspacesAPI.getById('ws-1');
    expect(getSpy).toHaveBeenCalledWith('/workspaces/ws-1');
  });

  test('create calls POST /workspaces', async () => {
    const data = { name: 'WS' };
    await workspacesAPI.create(data);
    expect(postSpy).toHaveBeenCalledWith('/workspaces', data);
  });

  test('update calls PUT /workspaces/:id', async () => {
    const data = { name: 'Updated WS' };
    await workspacesAPI.update('ws-1', data);
    expect(putSpy).toHaveBeenCalledWith('/workspaces/ws-1', data);
  });

  test('delete calls DELETE /workspaces/:id', async () => {
    await workspacesAPI.delete('ws-1');
    expect(deleteSpy).toHaveBeenCalledWith('/workspaces/ws-1');
  });

  test('getMembers calls GET /workspaces/:id/members', async () => {
    await workspacesAPI.getMembers('ws-1');
    expect(getSpy).toHaveBeenCalledWith('/workspaces/ws-1/members');
  });

  test('updateMemberRole calls PATCH /workspaces/:id/members/:memberId', async () => {
    await workspacesAPI.updateMemberRole('ws-1', 'm-1', 'admin');
    expect(patchSpy).toHaveBeenCalledWith('/workspaces/ws-1/members/m-1', { role: 'admin' });
  });

  test('removeMember calls DELETE /workspaces/:id/members/:memberId', async () => {
    await workspacesAPI.removeMember('ws-1', 'm-1');
    expect(deleteSpy).toHaveBeenCalledWith('/workspaces/ws-1/members/m-1');
  });

  test('invite calls POST /workspaces/:id/invite', async () => {
    await workspacesAPI.invite('ws-1', 'a@b.com', 'admin');
    expect(postSpy).toHaveBeenCalledWith('/workspaces/ws-1/invite', { email: 'a@b.com', role: 'admin' });
  });

  test('invite uses default role "member"', async () => {
    await workspacesAPI.invite('ws-1', 'a@b.com');
    expect(postSpy).toHaveBeenCalledWith('/workspaces/ws-1/invite', { email: 'a@b.com', role: 'member' });
  });

  test('getInvitations calls GET /workspaces/:id/invitations', async () => {
    await workspacesAPI.getInvitations('ws-1');
    expect(getSpy).toHaveBeenCalledWith('/workspaces/ws-1/invitations');
  });

  test('cancelInvitation calls DELETE /workspaces/:id/invitations/:invitationId', async () => {
    await workspacesAPI.cancelInvitation('ws-1', 'inv-1');
    expect(deleteSpy).toHaveBeenCalledWith('/workspaces/ws-1/invitations/inv-1');
  });

  test('acceptInvitation calls POST /workspaces/accept-invite/:token', async () => {
    await workspacesAPI.acceptInvitation('tok-123');
    expect(postSpy).toHaveBeenCalledWith('/workspaces/accept-invite/tok-123');
  });

  test('getInviteInfo calls GET /workspaces/invite-info/:token', async () => {
    await workspacesAPI.getInviteInfo('tok-123');
    expect(getSpy).toHaveBeenCalledWith('/workspaces/invite-info/tok-123');
  });

  test('getUsers calls GET /workspaces/users?workspace_id=...', async () => {
    await workspacesAPI.getUsers('ws-1');
    expect(getSpy).toHaveBeenCalledWith('/workspaces/users?workspace_id=ws-1');
  });

  test('getOnboardingStatus calls GET /workspaces/:id/onboarding', async () => {
    await workspacesAPI.getOnboardingStatus('ws-1');
    expect(getSpy).toHaveBeenCalledWith('/workspaces/ws-1/onboarding');
  });

  test('startOnboarding calls POST /workspaces/:id/onboarding/start', async () => {
    await workspacesAPI.startOnboarding('ws-1');
    expect(postSpy).toHaveBeenCalledWith('/workspaces/ws-1/onboarding/start');
  });

  test('updateOnboardingProgress calls PUT /workspaces/:id/onboarding/progress', async () => {
    const data = { step: 2 };
    await workspacesAPI.updateOnboardingProgress('ws-1', data);
    expect(putSpy).toHaveBeenCalledWith('/workspaces/ws-1/onboarding/progress', data);
  });

  test('completeOnboarding calls POST /workspaces/:id/onboarding/complete', async () => {
    await workspacesAPI.completeOnboarding('ws-1');
    expect(postSpy).toHaveBeenCalledWith('/workspaces/ws-1/onboarding/complete');
  });

  test('skipOnboarding calls POST /workspaces/:id/onboarding/skip', async () => {
    await workspacesAPI.skipOnboarding('ws-1');
    expect(postSpy).toHaveBeenCalledWith('/workspaces/ws-1/onboarding/skip');
  });
});

describe('meAPI methods call correct endpoints', () => {
  let getSpy, postSpy, patchSpy, deleteSpy;

  beforeEach(() => {
    getSpy = jest.spyOn(api, 'get').mockResolvedValue({ data: {} });
    postSpy = jest.spyOn(api, 'post').mockResolvedValue({ data: {} });
    patchSpy = jest.spyOn(api, 'patch').mockResolvedValue({ data: {} });
    deleteSpy = jest.spyOn(api, 'delete').mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    getSpy.mockRestore();
    postSpy.mockRestore();
    patchSpy.mockRestore();
    deleteSpy.mockRestore();
  });

  test('getProfile calls GET /me', async () => {
    await meAPI.getProfile();
    expect(getSpy).toHaveBeenCalledWith('/me');
  });

  test('updateProfile calls PATCH /me', async () => {
    const data = { name: 'New' };
    await meAPI.updateProfile(data);
    expect(patchSpy).toHaveBeenCalledWith('/me', data);
  });

  test('updatePreferences calls PATCH /me/preferences', async () => {
    const data = { language: 'lt' };
    await meAPI.updatePreferences(data);
    expect(patchSpy).toHaveBeenCalledWith('/me/preferences', data);
  });

  test('updateNotifications calls PATCH /me/notifications', async () => {
    const data = { email_reminders: false };
    await meAPI.updateNotifications(data);
    expect(patchSpy).toHaveBeenCalledWith('/me/notifications', data);
  });

  test('uploadAvatar calls POST /me/avatar with FormData and multipart header', async () => {
    const fakeFile = new Blob(['img'], { type: 'image/png' });
    await meAPI.uploadAvatar(fakeFile);
    expect(postSpy).toHaveBeenCalledTimes(1);
    const [url, body, config] = postSpy.mock.calls[0];
    expect(url).toBe('/me/avatar');
    expect(body).toBeInstanceOf(FormData);
    expect(config).toEqual({ headers: { 'Content-Type': 'multipart/form-data' } });
  });

  test('deleteAvatar calls DELETE /me/avatar', async () => {
    await meAPI.deleteAvatar();
    expect(deleteSpy).toHaveBeenCalledWith('/me/avatar');
  });

  test('changePassword calls POST /me/password', async () => {
    const data = { oldPassword: 'old', newPassword: 'new' };
    await meAPI.changePassword(data);
    expect(postSpy).toHaveBeenCalledWith('/me/password', data);
  });

  test('deleteAccount calls DELETE /me/account with data in config', async () => {
    const data = { password: 'confirm' };
    await meAPI.deleteAccount(data);
    expect(deleteSpy).toHaveBeenCalledWith('/me/account', { data });
  });
});

describe('billingAPI methods call correct endpoints', () => {
  let getSpy, postSpy;

  beforeEach(() => {
    getSpy = jest.spyOn(api, 'get').mockResolvedValue({ data: {} });
    postSpy = jest.spyOn(api, 'post').mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    getSpy.mockRestore();
    postSpy.mockRestore();
  });

  test('getPlans calls GET /billing/plans', async () => {
    await billingAPI.getPlans();
    expect(getSpy).toHaveBeenCalledWith('/billing/plans');
  });

  test('getSubscription calls GET /billing/subscription?workspace_id=...', async () => {
    await billingAPI.getSubscription('ws-1');
    expect(getSpy).toHaveBeenCalledWith('/billing/subscription?workspace_id=ws-1');
  });

  test('createCheckout calls POST /billing/checkout', async () => {
    await billingAPI.createCheckout('ws-1');
    expect(postSpy).toHaveBeenCalledWith('/billing/checkout', { workspace_id: 'ws-1' });
  });

  test('createPortalSession calls POST /billing/portal', async () => {
    await billingAPI.createPortalSession('ws-1');
    expect(postSpy).toHaveBeenCalledWith('/billing/portal', { workspace_id: 'ws-1' });
  });
});

describe('adminAPI methods call correct endpoints', () => {
  let getSpy;

  beforeEach(() => {
    getSpy = jest.spyOn(api, 'get').mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    getSpy.mockRestore();
  });

  test('getStats calls GET /admin/stats', async () => {
    await adminAPI.getStats();
    expect(getSpy).toHaveBeenCalledWith('/admin/stats');
  });
});

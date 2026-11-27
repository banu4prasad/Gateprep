import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authAPI, fetcher, testAPI } from './api';
import api from './client';

vi.mock('./client', () => {
  return {
    default: {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    }
  };
});

describe('API Wrappers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetcher', () => {
    it('should call api.get and return data', async () => {
      const mockData = { message: 'success' };
      vi.mocked(api.get).mockResolvedValueOnce({ data: mockData });
      
      const result = await fetcher('/test-url');
      
      expect(api.get).toHaveBeenCalledWith('/test-url');
      expect(result).toEqual(mockData);
    });
  });

  describe('authAPI', () => {
    it('register should call POST /auth/register', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({ data: 'registered' });
      const userData = { email: 'test@example.com', full_name: 'Test User', password: 'password123' };
      
      await authAPI.register(userData);
      
      expect(api.post).toHaveBeenCalledWith('/auth/register', userData);
    });

    it('login should call POST /auth/login', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({ data: 'logged_in' });
      const credentials = { email: 'test@example.com', password: 'password123' };
      
      await authAPI.login(credentials);
      
      expect(api.post).toHaveBeenCalledWith('/auth/login', credentials);
    });

    it('resetPassword should call POST /auth/reset-password', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({ data: 'reset_sent' });
      const resetData = { token: 'reset-token', password: 'password123' };
      
      await authAPI.resetPassword(resetData);
      
      expect(api.post).toHaveBeenCalledWith('/auth/reset-password', resetData);
    });

    it('logout should call POST /auth/logout', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({ data: 'logged_out' });
      
      await authAPI.logout();
      
      expect(api.post).toHaveBeenCalledWith('/auth/logout');
    });

    it('me should call GET /auth/me', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: { id: 1, name: 'Test User' } });
      
      await authAPI.me();
      
      expect(api.get).toHaveBeenCalledWith('/auth/me');
    });
  });

  describe('testAPI report downloads', () => {
    it('downloadResultHtml should GET the persisted report as a blob', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: new Blob(['x']) });

      await testAPI.downloadResultHtml(42);

      expect(api.get).toHaveBeenCalledWith('/tests/attempt/42/result.html', { responseType: 'blob' });
    });

    it('downloadPracticeResultHtml should POST the payload and request a blob', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({ data: new Blob(['x']) });
      const payload = {
        test_id: 7,
        answers: [{ question_id: 1, selected_answer: 'A', time_spent_seconds: 5 }],
        attempt_number: 2,
        attempts_remaining: 4,
        tab_violations: 0,
      };

      await testAPI.downloadPracticeResultHtml(payload);

      expect(api.post).toHaveBeenCalledWith('/tests/practice/result.html', payload, { responseType: 'blob' });
    });
  });
});

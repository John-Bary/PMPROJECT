import { act } from 'react';
import useBillingStore from '../billingStore';
import useWorkspaceStore from '../workspaceStore';
import { billingAPI } from '../../utils/api';
import { toast } from 'sonner';

// Mock the API module
jest.mock('../../utils/api', () => ({
  billingAPI: {
    getSubscription: jest.fn(),
    getPlans: jest.fn(),
    createCheckout: jest.fn(),
    createPortalSession: jest.fn(),
  },
}));

// Mock sonner
jest.mock('sonner', () => ({
  toast: Object.assign(jest.fn(), {
    success: jest.fn(),
    error: jest.fn(),
  }),
}));

// Helper: default initial state for resetting
const initialState = {
  subscription: null,
  plan: null,
  usage: null,
  plans: [],
  isLoading: false,
  error: null,
};

describe('Billing Store', () => {
  // Save original location so we can spy on it
  const originalLocation = window.location;

  beforeEach(() => {
    // Set workspace ID so store operations don't bail early
    useWorkspaceStore.setState({ currentWorkspaceId: 'ws-1' });
    // Reset billing store to initial state
    useBillingStore.setState(initialState);
    jest.clearAllMocks();

    // Mock window.location.href for redirect tests
    delete window.location;
    window.location = { href: '' };
  });

  afterAll(() => {
    window.location = originalLocation;
  });

  // ─── fetchSubscription ────────────────────────────────────
  describe('fetchSubscription', () => {
    it('should bail out when no workspace is selected', async () => {
      useWorkspaceStore.setState({ currentWorkspaceId: null });

      await act(async () => {
        await useBillingStore.getState().fetchSubscription();
      });

      expect(billingAPI.getSubscription).not.toHaveBeenCalled();
      expect(useBillingStore.getState().isLoading).toBe(false);
    });

    it('should set isLoading to true during fetch', async () => {
      billingAPI.getSubscription.mockImplementation(() => new Promise(() => {})); // never resolves

      // eslint-disable-next-line no-unused-vars
      const promise = useBillingStore.getState().fetchSubscription();

      expect(useBillingStore.getState().isLoading).toBe(true);
    });

    it('should fetch subscription, plan and usage on success', async () => {
      const mockSubscription = {
        id: 'sub-1',
        status: 'active',
        stripeSubscriptionId: 'sub_stripe_123',
      };
      const mockPlan = { id: 'pro', name: 'Pro', pricePerSeatCents: 300 };
      const mockUsage = { members: 3, tasks: 42, maxMembers: 50, maxTasks: 5000 };

      billingAPI.getSubscription.mockResolvedValue({
        data: {
          data: {
            subscription: mockSubscription,
            plan: mockPlan,
            usage: mockUsage,
          },
        },
      });

      await act(async () => {
        await useBillingStore.getState().fetchSubscription();
      });

      const state = useBillingStore.getState();
      expect(state.subscription).toEqual(mockSubscription);
      expect(state.plan).toEqual(mockPlan);
      expect(state.usage).toEqual(mockUsage);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(billingAPI.getSubscription).toHaveBeenCalledWith('ws-1');
    });

    it('should handle fetch error with API message', async () => {
      billingAPI.getSubscription.mockRejectedValue({
        response: { data: { message: 'Subscription not found' } },
      });

      await act(async () => {
        await useBillingStore.getState().fetchSubscription();
      });

      const state = useBillingStore.getState();
      expect(state.error).toBe('Subscription not found');
      expect(state.isLoading).toBe(false);
    });

    it('should handle fetch error with fallback message', async () => {
      billingAPI.getSubscription.mockRejectedValue(new Error('Network error'));

      await act(async () => {
        await useBillingStore.getState().fetchSubscription();
      });

      expect(useBillingStore.getState().error).toBe('Failed to fetch subscription');
    });
  });

  // ─── fetchPlans ───────────────────────────────────────────
  describe('fetchPlans', () => {
    it('should fetch and store available plans', async () => {
      const mockPlans = [
        { id: 'free', name: 'Free', pricePerSeatCents: 0 },
        { id: 'pro', name: 'Pro', pricePerSeatCents: 300 },
      ];
      billingAPI.getPlans.mockResolvedValue({
        data: { data: { plans: mockPlans } },
      });

      await act(async () => {
        await useBillingStore.getState().fetchPlans();
      });

      expect(useBillingStore.getState().plans).toEqual(mockPlans);
    });

    it('should handle fetch plans error gracefully (no toast)', async () => {
      billingAPI.getPlans.mockRejectedValue(new Error('Server error'));

      await act(async () => {
        await useBillingStore.getState().fetchPlans();
      });

      // Should not crash; plans remain empty
      expect(useBillingStore.getState().plans).toEqual([]);
      // No toast shown for this error (silent fail)
      expect(toast.error).not.toHaveBeenCalled();
    });
  });

  // ─── startCheckout ────────────────────────────────────────
  describe('startCheckout', () => {
    it('should return error when no workspace is selected', async () => {
      useWorkspaceStore.setState({ currentWorkspaceId: null });

      await act(async () => {
        const result = await useBillingStore.getState().startCheckout();
        expect(result.success).toBe(false);
      });

      expect(toast.error).toHaveBeenCalledWith('No workspace selected');
      expect(billingAPI.createCheckout).not.toHaveBeenCalled();
    });

    it('should redirect to Stripe checkout URL on success', async () => {
      const checkoutUrl = 'https://checkout.stripe.com/session/cs_test_123';
      billingAPI.createCheckout.mockResolvedValue({
        data: { data: { checkoutUrl } },
      });

      await act(async () => {
        const result = await useBillingStore.getState().startCheckout();
        expect(result.success).toBe(true);
      });

      expect(billingAPI.createCheckout).toHaveBeenCalledWith('ws-1');
      expect(window.location.href).toBe(checkoutUrl);
    });

    it('should handle checkout error with API message', async () => {
      billingAPI.createCheckout.mockRejectedValue({
        response: { data: { message: 'Payment method required' } },
      });

      await act(async () => {
        const result = await useBillingStore.getState().startCheckout();
        expect(result.success).toBe(false);
        expect(result.error).toBe('Payment method required');
      });

      expect(toast.error).toHaveBeenCalledWith('Payment method required');
    });

    it('should handle checkout error with fallback message', async () => {
      billingAPI.createCheckout.mockRejectedValue(new Error('Network error'));

      await act(async () => {
        const result = await useBillingStore.getState().startCheckout();
        expect(result.success).toBe(false);
        expect(result.error).toBe('Failed to start checkout');
      });

      expect(toast.error).toHaveBeenCalledWith('Failed to start checkout');
    });
  });

  // ─── openPortal ───────────────────────────────────────────
  describe('openPortal', () => {
    it('should return error when no workspace is selected', async () => {
      useWorkspaceStore.setState({ currentWorkspaceId: null });

      await act(async () => {
        const result = await useBillingStore.getState().openPortal();
        expect(result.success).toBe(false);
      });

      expect(toast.error).toHaveBeenCalledWith('No workspace selected');
      expect(billingAPI.createPortalSession).not.toHaveBeenCalled();
    });

    it('should redirect to Stripe portal URL on success', async () => {
      const portalUrl = 'https://billing.stripe.com/session/bps_test_123';
      billingAPI.createPortalSession.mockResolvedValue({
        data: { data: { portalUrl } },
      });

      await act(async () => {
        const result = await useBillingStore.getState().openPortal();
        expect(result.success).toBe(true);
      });

      expect(billingAPI.createPortalSession).toHaveBeenCalledWith('ws-1');
      expect(window.location.href).toBe(portalUrl);
    });

    it('should handle portal error with API message', async () => {
      billingAPI.createPortalSession.mockRejectedValue({
        response: { data: { message: 'No Stripe customer' } },
      });

      await act(async () => {
        const result = await useBillingStore.getState().openPortal();
        expect(result.success).toBe(false);
        expect(result.error).toBe('No Stripe customer');
      });

      expect(toast.error).toHaveBeenCalledWith('No Stripe customer');
    });

    it('should handle portal error with fallback message', async () => {
      billingAPI.createPortalSession.mockRejectedValue(new Error('Timeout'));

      await act(async () => {
        const result = await useBillingStore.getState().openPortal();
        expect(result.success).toBe(false);
        expect(result.error).toBe('Failed to open billing portal');
      });

      expect(toast.error).toHaveBeenCalledWith('Failed to open billing portal');
    });
  });

  // ─── isPro ────────────────────────────────────────────────
  describe('isPro', () => {
    it('should return true when plan id is pro', () => {
      useBillingStore.setState({ plan: { id: 'pro', name: 'Pro' } });
      expect(useBillingStore.getState().isPro()).toBe(true);
    });

    it('should return false when plan id is free', () => {
      useBillingStore.setState({ plan: { id: 'free', name: 'Free' } });
      expect(useBillingStore.getState().isPro()).toBe(false);
    });

    it('should return false when plan is null', () => {
      useBillingStore.setState({ plan: null });
      expect(useBillingStore.getState().isPro()).toBe(false);
    });
  });

  // ─── isFree ───────────────────────────────────────────────
  describe('isFree', () => {
    it('should return true when plan is null (no subscription)', () => {
      useBillingStore.setState({ plan: null });
      expect(useBillingStore.getState().isFree()).toBe(true);
    });

    it('should return true when plan id is free', () => {
      useBillingStore.setState({ plan: { id: 'free', name: 'Free' } });
      expect(useBillingStore.getState().isFree()).toBe(true);
    });

    it('should return false when plan id is pro', () => {
      useBillingStore.setState({ plan: { id: 'pro', name: 'Pro' } });
      expect(useBillingStore.getState().isFree()).toBe(false);
    });
  });

  // ─── clearBilling ─────────────────────────────────────────
  describe('clearBilling', () => {
    it('should reset subscription, plan, usage and error', () => {
      useBillingStore.setState({
        subscription: { id: 'sub-1' },
        plan: { id: 'pro' },
        usage: { members: 3 },
        plans: [{ id: 'free' }, { id: 'pro' }],
        isLoading: true,
        error: 'some error',
      });

      act(() => {
        useBillingStore.getState().clearBilling();
      });

      const state = useBillingStore.getState();
      expect(state.subscription).toBeNull();
      expect(state.plan).toBeNull();
      expect(state.usage).toBeNull();
      expect(state.error).toBeNull();
      // plans and isLoading should NOT be cleared by clearBilling
      expect(state.plans).toEqual([{ id: 'free' }, { id: 'pro' }]);
      expect(state.isLoading).toBe(true);
    });
  });
});

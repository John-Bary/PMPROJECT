// Billing State Management with Zustand
import { create } from 'zustand';
import { billingAPI } from '../utils/api';
import { toast } from 'sonner';
import useWorkspaceStore from './workspaceStore';

// Helper to get current workspace ID
const getWorkspaceId = () => useWorkspaceStore.getState().currentWorkspaceId;

const useBillingStore = create((set, get) => ({
  subscription: null,
  plan: null,
  usage: null,
  plans: [],
  isLoading: false,
  error: null,

  // Fetch current workspace subscription
  fetchSubscription: async () => {
    const workspaceId = getWorkspaceId();
    if (!workspaceId) return;

    set({ isLoading: true, error: null });
    try {
      const response = await billingAPI.getSubscription(workspaceId);
      const { subscription, plan, usage } = response.data.data;
      set({
        subscription,
        plan,
        usage,
        isLoading: false,
      });
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch subscription';
      set({ error: errorMessage, isLoading: false });
    }
  },

  // Fetch available plans
  fetchPlans: async () => {
    try {
      const response = await billingAPI.getPlans();
      set({ plans: response.data.data.plans });
    } catch (error) {
      console.error('Failed to fetch plans:', error);
    }
  },

  // Start checkout (redirect to Stripe)
  startCheckout: async () => {
    const workspaceId = getWorkspaceId();
    if (!workspaceId) {
      toast.error('No workspace selected');
      return { success: false };
    }

    try {
      const response = await billingAPI.createCheckout(workspaceId);
      const { checkoutUrl } = response.data.data;
      window.location.href = checkoutUrl;
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to start checkout';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  // Open Stripe Customer Portal
  openPortal: async () => {
    const workspaceId = getWorkspaceId();
    if (!workspaceId) {
      toast.error('No workspace selected');
      return { success: false };
    }

    try {
      const response = await billingAPI.createPortalSession(workspaceId);
      const { portalUrl } = response.data.data;
      window.location.href = portalUrl;
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to open billing portal';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  // Check if workspace is on a specific plan
  isPro: () => {
    const { plan } = get();
    return plan?.id === 'pro';
  },

  isFree: () => {
    const { plan } = get();
    return !plan || plan.id === 'free';
  },

  // Clear billing data (used when switching workspaces)
  clearBilling: () => {
    set({
      subscription: null,
      plan: null,
      usage: null,
      error: null,
    });
  },
}));

export default useBillingStore;

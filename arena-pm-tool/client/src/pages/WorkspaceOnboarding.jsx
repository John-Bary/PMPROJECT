import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Sparkles, User, Layout, Shield, Rocket,
  ArrowRight, ArrowLeft, X, Check, Loader2,
  Users, FolderKanban, ListChecks, Calendar,
  ChevronRight, Camera
} from 'lucide-react';
import { workspacesAPI, meAPI } from '../utils/api';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

const STEPS = [
  { id: 'welcome', label: 'Welcome', icon: Sparkles },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'tour', label: 'Tour', icon: Layout },
  { id: 'roles', label: 'Your Role', icon: Shield },
  { id: 'getting-started', label: 'Get Started', icon: Rocket },
];

function WorkspaceOnboarding() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const workspaceId = searchParams.get('workspaceId');
  const { user, fetchProfile } = useAuthStore();

  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [onboardingData, setOnboardingData] = useState(null);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // Profile form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);

  // Fetch onboarding data
  const fetchOnboarding = useCallback(async () => {
    if (!workspaceId) {
      setError('No workspace specified');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response = await workspacesAPI.getOnboardingStatus(workspaceId);
      const data = response.data.data;
      setOnboardingData(data);

      // If already completed or skipped, redirect to dashboard
      if (data.onboarding.isCompleted || data.onboarding.isSkipped) {
        navigate('/dashboard', { replace: true });
        return;
      }

      // Restore progress
      if (data.onboarding.currentStep > 1) {
        setCurrentStep(Math.min(data.onboarding.currentStep - 1, STEPS.length - 1));
      }

      // Pre-fill profile data
      if (data.user) {
        setFirstName(data.user.firstName || '');
        setLastName(data.user.lastName || '');
        setAvatarPreview(data.user.avatarUrl || null);
      }
    } catch (err) {
      console.error('Failed to fetch onboarding:', err);
      setRetryCount(prev => prev + 1);
      setError('Failed to load onboarding data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, navigate]);

  useEffect(() => {
    fetchOnboarding();
  }, [fetchOnboarding]);

  // Save step progress
  const saveStepProgress = async (stepIndex) => {
    if (!workspaceId) return;
    try {
      await workspacesAPI.updateOnboardingProgress(workspaceId, {
        step: stepIndex + 1,
        stepName: STEPS[stepIndex].id,
      });
    } catch (err) {
      console.error('Failed to save progress:', err);
    }
  };

  // Handle next step
  const handleNext = async () => {
    await saveStepProgress(currentStep);

    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Handle previous step
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Handle profile save
  const handleProfileSave = async () => {
    setIsSaving(true);
    try {
      // Update name if changed
      if (firstName || lastName) {
        await meAPI.updateProfile({
          first_name: firstName,
          last_name: lastName,
        });
      }

      // Upload avatar if selected
      if (avatarFile) {
        await meAPI.uploadAvatar(avatarFile);
      }

      // Refresh user profile in auth store
      if (fetchProfile) {
        await fetchProfile();
      }

      toast.success('Profile updated');
    } catch (err) {
      console.error('Failed to save profile:', err);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }

    await handleNext();
  };

  // Handle complete
  const handleComplete = async () => {
    setIsSaving(true);
    try {
      await saveStepProgress(currentStep);
      await workspacesAPI.completeOnboarding(workspaceId);
      toast.success('Welcome aboard! You\'re all set.');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
      toast.error('Something went wrong');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle skip
  const handleSkip = async () => {
    try {
      await workspacesAPI.skipOnboarding(workspaceId);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('Failed to skip onboarding:', err);
      navigate('/dashboard', { replace: true });
    }
  };

  // Handle avatar file selection
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be under 5MB');
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setAvatarPreview(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  // Get role display info
  const getRoleInfo = (role) => {
    switch (role) {
      case 'admin':
        return {
          label: 'Admin',
          color: 'text-amber-400',
          bgColor: 'bg-amber-500/10 border-amber-500/20',
          description: 'Full access to manage the workspace, members, and all content.',
          permissions: [
            'Create, edit, and delete tasks',
            'Manage categories and workspace settings',
            'Invite and remove team members',
            'Change member roles',
          ],
        };
      case 'member':
        return {
          label: 'Member',
          color: 'text-teal-400',
          bgColor: 'bg-teal-500/10 border-teal-500/20',
          description: 'Can create and manage tasks and collaborate with the team.',
          permissions: [
            'Create, edit, and delete tasks',
            'Add comments to tasks',
            'Manage categories',
            'View team members',
          ],
        };
      case 'viewer':
        return {
          label: 'Viewer',
          color: 'text-blue-400',
          bgColor: 'bg-blue-500/10 border-blue-500/20',
          description: 'Read-only access to view tasks and workspace content.',
          permissions: [
            'View all tasks and categories',
            'View team members',
            'Add comments to tasks',
            'Cannot edit or create tasks',
          ],
        };
      default:
        return { label: role, color: 'text-neutral-400', bgColor: 'bg-neutral-500/10', description: '', permissions: [] };
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 text-teal-500 animate-spin mx-auto mb-4" />
          <p className="text-neutral-400">Preparing your onboarding...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !onboardingData) {
    const maxRetriesReached = retryCount >= 3;
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 max-w-md w-full text-center">
          <X className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Unable to Load</h2>
          <p className="text-neutral-400 mb-6">
            {maxRetriesReached
              ? 'We were unable to load onboarding after several attempts. You can continue to the dashboard and your workspace will be ready to use.'
              : error || 'Could not load onboarding data.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {!maxRetriesReached && (
              <button
                onClick={fetchOnboarding}
                className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors"
              >
                Try Again
              </button>
            )}
            <button
              onClick={() => navigate('/dashboard', { replace: true })}
              className={`px-6 py-2.5 rounded-lg transition-colors ${
                maxRetriesReached
                  ? 'bg-teal-600 hover:bg-teal-700 text-white'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
              }`}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { workspace, invitation, userRole, members } = onboardingData;
  const roleInfo = getRoleInfo(userRole);
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col">
      {/* Header with progress */}
      <header className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-teal-400" />
            </div>
            <span className="text-sm font-medium text-neutral-300">
              {workspace.name}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Step indicators */}
            <div className="hidden sm:flex items-center gap-1.5">
              {STEPS.map((step, idx) => (
                <div
                  key={step.id}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === currentStep
                      ? 'w-6 bg-teal-500'
                      : idx < currentStep
                      ? 'bg-teal-500/60'
                      : 'bg-neutral-700'
                  }`}
                />
              ))}
            </div>

            <span className="text-xs text-neutral-500">
              {currentStep + 1}/{STEPS.length}
            </span>

            <button
              onClick={handleSkip}
              className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              Skip
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-0.5 bg-neutral-800">
          <div
            className="h-full bg-teal-500 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-2xl">
          {/* Step 1: Welcome */}
          {currentStep === 0 && (
            <div className="text-center animate-fade-in">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 border border-teal-500/10 flex items-center justify-center mx-auto mb-8">
                <Sparkles className="h-10 w-10 text-teal-400" />
              </div>

              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
                Welcome to {workspace.name}
              </h1>

              {invitation?.inviterName && (
                <p className="text-lg text-neutral-400 mb-2">
                  {invitation.inviterName} invited you to join
                </p>
              )}

              <p className="text-neutral-500 mb-10 max-w-md mx-auto">
                Let&apos;s get you set up so you can start collaborating with your team.
                This will only take a moment.
              </p>

              {/* Workspace stats */}
              <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto mb-10">
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                  <p className="text-2xl font-bold text-white">{workspace.memberCount}</p>
                  <p className="text-xs text-neutral-500 mt-1">Members</p>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                  <p className="text-2xl font-bold text-white">{workspace.categoryCount}</p>
                  <p className="text-xs text-neutral-500 mt-1">Categories</p>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                  <p className="text-2xl font-bold text-white">{workspace.taskCount}</p>
                  <p className="text-xs text-neutral-500 mt-1">Tasks</p>
                </div>
              </div>

              <button
                onClick={handleNext}
                className="inline-flex items-center gap-2 px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-xl transition-colors text-lg"
              >
                Get Started
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          )}

          {/* Step 2: Profile Setup */}
          {currentStep === 1 && (
            <div className="animate-fade-in">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/10 flex items-center justify-center mx-auto mb-6">
                  <User className="h-8 w-8 text-violet-400" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                  Set Up Your Profile
                </h2>
                <p className="text-neutral-400">
                  Help your team recognize you
                </p>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8 max-w-md mx-auto">
                {/* Avatar */}
                <div className="flex justify-center mb-6">
                  <label className="relative cursor-pointer group">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-neutral-700 group-hover:border-teal-500 transition-colors">
                      {avatarPreview ? (
                        <img
                          src={avatarPreview}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center text-2xl font-bold text-white"
                          style={{ backgroundColor: onboardingData.user?.avatarColor || '#6366f1' }}
                        >
                          {(firstName || user?.name || 'U')[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center border-2 border-neutral-900 group-hover:bg-teal-500 transition-colors">
                      <Camera className="h-3.5 w-3.5 text-white" />
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </label>
                </div>

                {/* Name fields */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Enter your first name"
                      className="w-full px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder:text-neutral-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Enter your last name"
                      className="w-full px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder:text-neutral-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                    />
                  </div>
                </div>

                <p className="text-xs text-neutral-500 mt-4 text-center">
                  You can always update these later in your profile settings.
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between mt-8 max-w-md mx-auto">
                <button
                  onClick={handleBack}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-neutral-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  onClick={handleProfileSave}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-medium rounded-xl transition-colors"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Workspace Tour */}
          {currentStep === 2 && (
            <div className="animate-fade-in">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/10 flex items-center justify-center mx-auto mb-6">
                  <Layout className="h-8 w-8 text-blue-400" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                  Workspace Tour
                </h2>
                <p className="text-neutral-400">
                  Here&apos;s what you can do in {workspace.name}
                </p>
              </div>

              {/* Feature cards */}
              <div className="grid gap-4 sm:grid-cols-2 max-w-lg mx-auto mb-8">
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 hover:border-neutral-700 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center mb-3">
                    <FolderKanban className="h-5 w-5 text-teal-400" />
                  </div>
                  <h3 className="font-semibold text-white mb-1">Task Board</h3>
                  <p className="text-sm text-neutral-400">
                    Organize tasks with drag-and-drop across categories
                  </p>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 hover:border-neutral-700 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center mb-3">
                    <ListChecks className="h-5 w-5 text-violet-400" />
                  </div>
                  <h3 className="font-semibold text-white mb-1">List View</h3>
                  <p className="text-sm text-neutral-400">
                    See all tasks in a filterable, sortable list
                  </p>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 hover:border-neutral-700 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center mb-3">
                    <Calendar className="h-5 w-5 text-amber-400" />
                  </div>
                  <h3 className="font-semibold text-white mb-1">Calendar</h3>
                  <p className="text-sm text-neutral-400">
                    View tasks by due date on a calendar
                  </p>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 hover:border-neutral-700 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center mb-3">
                    <Users className="h-5 w-5 text-pink-400" />
                  </div>
                  <h3 className="font-semibold text-white mb-1">Team</h3>
                  <p className="text-sm text-neutral-400">
                    Collaborate, assign tasks, and leave comments
                  </p>
                </div>
              </div>

              {/* Team members preview */}
              {members.length > 0 && (
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 max-w-lg mx-auto mb-8">
                  <h3 className="text-sm font-medium text-neutral-300 mb-3">
                    Your Team ({workspace.memberCount} members)
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {members.map((member) => (
                      <div key={member.id} className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white overflow-hidden"
                          style={{ backgroundColor: member.avatarColor || '#6366f1' }}
                        >
                          {member.avatarUrl ? (
                            <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" />
                          ) : (
                            (member.name || '?')[0].toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-white leading-tight">{member.name || 'Team Member'}</p>
                          <p className="text-xs text-neutral-500 capitalize">{member.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between max-w-lg mx-auto">
                <button
                  onClick={handleBack}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-neutral-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  onClick={handleNext}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-xl transition-colors"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Role & Permissions */}
          {currentStep === 3 && (
            <div className="animate-fade-in">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/10 flex items-center justify-center mx-auto mb-6">
                  <Shield className="h-8 w-8 text-amber-400" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                  Your Role
                </h2>
                <p className="text-neutral-400">
                  Here&apos;s what you can do in this workspace
                </p>
              </div>

              <div className="max-w-md mx-auto">
                {/* Role badge */}
                <div className={`border rounded-2xl p-6 mb-6 ${roleInfo.bgColor}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <Shield className={`h-6 w-6 ${roleInfo.color}`} />
                    <h3 className={`text-xl font-bold ${roleInfo.color}`}>
                      {roleInfo.label}
                    </h3>
                  </div>
                  <p className="text-neutral-300 mb-4">
                    {roleInfo.description}
                  </p>
                </div>

                {/* Permissions list */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                  <h4 className="text-sm font-medium text-neutral-300 mb-3">
                    What you can do:
                  </h4>
                  <ul className="space-y-2.5">
                    {roleInfo.permissions.map((perm, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <Check className="h-4 w-4 text-teal-400 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-neutral-300">{perm}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <p className="text-xs text-neutral-500 mt-4 text-center">
                  Your workspace admin can change your role at any time.
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between mt-8 max-w-md mx-auto">
                <button
                  onClick={handleBack}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-neutral-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  onClick={handleNext}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-xl transition-colors"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Getting Started */}
          {currentStep === 4 && (
            <div className="animate-fade-in">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/10 flex items-center justify-center mx-auto mb-6">
                  <Rocket className="h-8 w-8 text-green-400" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                  You&apos;re All Set!
                </h2>
                <p className="text-neutral-400">
                  Here are some things to try first
                </p>
              </div>

              <div className="max-w-md mx-auto space-y-3 mb-10">
                <button
                  onClick={handleComplete}
                  disabled={isSaving}
                  className="w-full flex items-center gap-4 bg-neutral-900 border border-neutral-800 hover:border-teal-500/30 rounded-xl p-4 transition-colors text-left group"
                >
                  <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center flex-shrink-0">
                    <FolderKanban className="h-5 w-5 text-teal-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white">Open the Task Board</p>
                    <p className="text-sm text-neutral-500">View and manage tasks across categories</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-neutral-600 group-hover:text-teal-400 transition-colors flex-shrink-0" />
                </button>

                <button
                  onClick={handleComplete}
                  disabled={isSaving}
                  className="w-full flex items-center gap-4 bg-neutral-900 border border-neutral-800 hover:border-violet-500/30 rounded-xl p-4 transition-colors text-left group"
                >
                  <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                    <ListChecks className="h-5 w-5 text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white">Browse Tasks</p>
                    <p className="text-sm text-neutral-500">See tasks assigned to you or your team</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-neutral-600 group-hover:text-violet-400 transition-colors flex-shrink-0" />
                </button>

                <button
                  onClick={handleComplete}
                  disabled={isSaving}
                  className="w-full flex items-center gap-4 bg-neutral-900 border border-neutral-800 hover:border-pink-500/30 rounded-xl p-4 transition-colors text-left group"
                >
                  <div className="w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center flex-shrink-0">
                    <Users className="h-5 w-5 text-pink-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white">Meet the Team</p>
                    <p className="text-sm text-neutral-500">View team members and their roles</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-neutral-600 group-hover:text-pink-400 transition-colors flex-shrink-0" />
                </button>
              </div>

              {/* Main CTA */}
              <div className="flex items-center justify-between max-w-md mx-auto">
                <button
                  onClick={handleBack}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-neutral-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  onClick={handleComplete}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-medium rounded-xl transition-colors text-lg"
                >
                  {isSaving ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Go to Dashboard
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default WorkspaceOnboarding;

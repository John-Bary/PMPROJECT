import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

function DemoRedirect() {
  const navigate = useNavigate();
  const { startDemo, isAuthenticated } = useAuthStore();
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
      return;
    }

    if (hasStarted) return;
    setHasStarted(true);

    const init = async () => {
      const result = await startDemo();
      if (result.success) {
        toast.success('Welcome to the demo!');
        navigate('/dashboard', { replace: true });
      } else {
        toast.error(result.error || 'Could not start demo');
        navigate('/login', { replace: true });
      }
    };

    init();
  }, [startDemo, navigate, isAuthenticated, hasStarted]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="mt-4 text-sm text-neutral-500">Setting up your demo workspace...</p>
      </div>
    </div>
  );
}

export default DemoRedirect;

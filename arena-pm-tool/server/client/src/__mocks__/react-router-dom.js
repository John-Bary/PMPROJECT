const React = require('react');

const RouterContext = React.createContext({
  pathname: '/',
  navigate: () => {},
  location: { pathname: '/', state: null },
});

const normalizePath = (path) => {
  if (!path) return '/';
  return path === '/' ? '/' : path.replace(/\/+$/, '') || '/';
};

const matchPath = (routePath, pathname) => {
  if (!routePath) return false;
  if (routePath === '*') return true;
  const current = normalizePath(pathname);
  const target = normalizePath(routePath);
  return current === target;
};

function RouterProvider({ children, initialEntries }) {
  const initialPath = initialEntries?.[0] || (typeof window !== 'undefined' ? window.location.pathname : '/');
  const [pathname, setPathname] = React.useState(normalizePath(initialPath));
  const [state, setState] = React.useState(null);

  const navigate = React.useCallback((to, options = {}) => {
    const nextPath = typeof to === 'string' ? to : to?.pathname || '/';
    setPathname(normalizePath(nextPath));
    setState(options.state || null);
    if (typeof window !== 'undefined') {
      window.history.replaceState(options.state || {}, '', nextPath);
    }
  }, []);

  const location = React.useMemo(() => ({ pathname, state }), [pathname, state]);
  const value = React.useMemo(() => ({ pathname, navigate, location }), [pathname, navigate, location]);

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

const BrowserRouter = ({ children }) => <RouterProvider>{children}</RouterProvider>;
const MemoryRouter = ({ children, initialEntries }) => (
  <RouterProvider initialEntries={initialEntries}>{children}</RouterProvider>
);

const Routes = ({ children }) => {
  const { pathname } = React.useContext(RouterContext);
  const childArray = React.Children.toArray(children);
  const match = childArray.find((child) => matchPath(child.props.path, pathname)) || null;
  return match ? match.props.element : null;
};

const Route = ({ element }) => element || null;

const Navigate = ({ to }) => {
  const { navigate } = React.useContext(RouterContext);
  React.useEffect(() => {
    navigate(to);
  }, [navigate, to]);
  return null;
};

const Link = ({ to, children, ...props }) => (
  <a href={to} {...props}>
    {children}
  </a>
);

const useNavigate = () => {
  const { navigate } = React.useContext(RouterContext);
  return navigate;
};

const useLocation = () => {
  const { location } = React.useContext(RouterContext);
  return location;
};

module.exports = {
  BrowserRouter,
  MemoryRouter,
  Routes,
  Route,
  Navigate,
  Link,
  useNavigate,
  useLocation,
};

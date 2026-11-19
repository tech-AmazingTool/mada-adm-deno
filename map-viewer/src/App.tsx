import {
  ErrorBoundary,
  lazy,
  LocationProvider,
  Route,
  Router,
} from "preact-iso";

import AppLayout from "@/layouts/AppLayout.tsx";

const LandingPage = lazy(() => import("./pages/LandingPage.tsx"));
const PinsPage = lazy(() => import("@/pages/PinsPage.tsx"));
const DataSourcesPage = lazy(() => import("./pages/DataSourcesPage.tsx"));
const AdmExplorerPage = lazy(() => import("./pages/AdmExplorerPage.tsx"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage.tsx"));

export default function App() {
  return (
    <LocationProvider>
      <ErrorBoundary>
        <AppLayout>
          <Router>
            <Route path="/" component={LandingPage} />
            <Route path="/pins" component={PinsPage} />
            <Route path="/data-sources" component={DataSourcesPage} />
            <Route path="/adm-explorer" component={AdmExplorerPage} />
            <Route default component={NotFoundPage} />
          </Router>
        </AppLayout>
      </ErrorBoundary>
    </LocationProvider>
  );
}

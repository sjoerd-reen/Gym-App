import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router";
import { ACTIVE_WORKOUT_KEY, UserProvider, useUser } from "./app/providers/UserProvider";
import { RoutinesProvider } from "./app/providers/RoutinesProvider";
import { AppLayout } from "./layouts/AppLayout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { WorkoutsPage } from "./pages/WorkoutsPage";
import { WorkoutSessionPage } from "./pages/WorkoutSessionPage";
import { HistoryPage } from "./pages/HistoryPage";

function RequireUser() {
  const { user } = useUser();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <RoutinesProvider key={user} user={user}>
      <Outlet />
    </RoutinesProvider>
  );
}

function RootRedirect() {
  const { user } = useUser();
  if (!user) return <Navigate to="/login" replace />;
  const active = localStorage.getItem(ACTIVE_WORKOUT_KEY);
  return <Navigate to={active ? `/workout/${encodeURIComponent(active)}` : "/dashboard"} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <UserProvider>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireUser />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/workout" element={<WorkoutsPage />} />
              <Route path="/history" element={<HistoryPage />} />
            </Route>
            <Route path="/workout/:routineId" element={<WorkoutSessionPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </UserProvider>
    </BrowserRouter>
  );
}

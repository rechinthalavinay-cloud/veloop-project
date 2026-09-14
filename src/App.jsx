import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import GameHome from "./pages/GameHome";
import Redeem from "./pages/Redeem";
import Rewards from "./pages/Rewards";
import Withdraw from "./pages/Withdraw";

const GamePlay = lazy(() => import("./pages/GamePlay"));

function Protected({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Suspense
      fallback={
        <div className="app-shell" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
          Loading Game...
        </div>
      }
    >
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <Protected>
              <Home />
            </Protected>
          }
        />
        <Route
          path="/games/:slug"
          element={
            <Protected>
              <GameHome />
            </Protected>
          }
        />
        <Route
          path="/games/:slug/play"
          element={
            <Protected>
              <GamePlay />
            </Protected>
          }
        />
        <Route
          path="/redeem"
          element={
            <Protected>
              <Redeem />
            </Protected>
          }
        />
        <Route
          path="/rewards"
          element={
            <Protected>
              <Rewards />
            </Protected>
          }
        />
        <Route
          path="/withdraw"
          element={
            <Protected>
              <Withdraw />
            </Protected>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

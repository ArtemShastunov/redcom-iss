import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./routes/Home";
import Login from "./routes/Login";
import NotFound from "./routes/NotFound";
import OperatorDetail from "./routes/OperatorDetail";
import Operators from "./routes/Operators";
import PeriodDetail from "./routes/PeriodDetail";
import Periods from "./routes/Periods";
import Users from "./routes/Users";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/periods" element={<Periods />} />
          <Route path="/periods/:id" element={<PeriodDetail />} />
          <Route
            path="/periods/:id/operators/:opId"
            element={<OperatorDetail />}
          />
          <Route path="/operators" element={<Operators />} />
          <Route path="/users" element={<Users />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}

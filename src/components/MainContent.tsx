
import { useView } from "@/contexts/ViewContext";
import { UserDashboard } from "./UserDashboard";
import { AdminDashboard } from "./admin/AdminDashboard";

export function MainContent() {
  const { isAdmin } = useView();

  return isAdmin ? <AdminDashboard /> : <UserDashboard />;
}

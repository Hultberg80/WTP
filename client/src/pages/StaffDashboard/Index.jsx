// StaffDashboard/index.jsx
// Detta är en wrapper-komponent för att hantera staff dashboard
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context";
import Header from "./Header";
import Main from "./Main";

function StaffDashboard() {
  const navigate = useNavigate();
  const { isAuthenticated, role, DEV_MODE } = useAuth();

  // Redirect till login om användaren inte är autentiserad
  useEffect(() => {
    if (!DEV_MODE && (!isAuthenticated || role !== 'staff')) {
      navigate('/staff/login');
    }
  }, [isAuthenticated, role, navigate, DEV_MODE]);

  // Skip auth check i dev mode
  if (!DEV_MODE && (!isAuthenticated || role !== 'staff')) {
    return <div>Laddar...</div>;
  }

  return (
    <div className="staff-dashboard">
      <Header />
      <Main />
    </div>
  );
}

export default StaffDashboard;
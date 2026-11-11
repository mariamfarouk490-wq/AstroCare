import { createBrowserRouter } from "react-router-dom";

import HomePage from "../ui/pages/HomePage";
import MeasurePage from "../ui/pages/MeasurePage";
import TrendsPage from "../ui/pages/TrendsPage";
import EmergencyPage from "../ui/pages/EmergencyPage";

export const router = createBrowserRouter([
{
    path: "/",
    element: <HomePage />,
  },
  {
    path: "/measure",
    element: <MeasurePage />,
  },
  {
    path: "/trends",
    element: <TrendsPage />,
  },
  {
    path: "/emergency",
    element: <EmergencyPage />,
  },
]);

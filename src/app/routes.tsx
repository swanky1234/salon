import { createBrowserRouter } from "react-router";
import { Layout } from "./components/layout";
import { Home } from "./pages/home";
import { Services } from "./pages/services";
import { Booking } from "./pages/booking";
import { Favorites } from "./pages/favorites";
import { Profile } from "./pages/profile";
import { Login } from "./pages/login";
import { SignUp } from "./pages/signup";
import { ForgotPassword } from "./pages/forgot-password";
import { ResetPassword } from "./pages/reset-password";
import { Terms } from "./pages/terms";
import { Privacy } from "./pages/privacy";
import { AdminLogin } from "./pages/admin/login";
import { AdminSignup } from "./pages/admin/signup";
import { AdminForgotPassword } from "./pages/admin/forgot-password";
import { AdminLayout } from "./components/admin-layout";
import { AdminDashboard } from "./pages/admin/dashboard";
import { AdminCatalogue } from "./pages/admin/catalogue";
import { AdminStylists } from "./pages/admin/stylists";
import { AdminAvailability } from "./pages/admin/availability";
import { AdminReports } from "./pages/admin/reports";
import { AdminSettings } from "./pages/admin/settings";
import { NotFound } from "./pages/not-found";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Home },
      { path: "services", Component: Services },
      { path: "booking", Component: Booking },
      { path: "favorites", Component: Favorites },
      { path: "profile", Component: Profile },
      { path: "login", Component: Login },
      { path: "signup", Component: SignUp },
      { path: "forgot-password", Component: ForgotPassword },
      { path: "reset-password", Component: ResetPassword },
      { path: "terms", Component: Terms },
      { path: "privacy", Component: Privacy },
    ],
  },
  {
    path: "/admin/login",
    Component: AdminLogin,
  },
  {
    path: "/admin/signup",
    Component: AdminSignup,
  },
  {
    path: "/admin/forgot-password",
    Component: AdminForgotPassword,
  },
  {
    path: "/admin",
    Component: AdminLayout,
    children: [
      { index: true, Component: AdminDashboard },
      { path: "catalogue", Component: AdminCatalogue },
      { path: "stylists", Component: AdminStylists },
      { path: "availability", Component: AdminAvailability },
      { path: "reports", Component: AdminReports },
      { path: "settings", Component: AdminSettings },
    ],
  },
  {
    path: "*",
    Component: NotFound,
  },
]);
import { type ReactNode } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { AppLayout } from "@/components/shared/AppLayout";
import { LoginPage } from "@/modules/auth/LoginPage";
import { RegisterPage } from "@/modules/auth/RegisterPage";
import { DashboardPage } from "@/modules/dashboard/DashboardPage";
import { AccountsPage } from "@/modules/accounts/AccountsPage";
import { IncomesPage } from "@/modules/incomes/IncomesPage";
import { ExpensesPage } from "@/modules/expenses/ExpensesPage";
import { CategoriesPage } from "@/modules/categories/CategoriesPage";
import { CardsPage } from "@/modules/cards/CardsPage";
import { TransfersPage } from "@/modules/transfers/TransfersPage";
import { RecurringPage } from "@/modules/recurring/RecurringPage";
import { BudgetPage } from "@/modules/budget/BudgetPage";
import { PayablesPage } from "@/modules/payables/PayablesPage";
import { GoalsPage } from "@/modules/goals/GoalsPage";
import { CalendarPage } from "@/modules/calendar/CalendarPage";
import { ReportsPage } from "@/modules/reports/ReportsPage";

function Protected({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}

const protectedRoutes: { path: string; element: ReactNode }[] = [
  { path: "/", element: <DashboardPage /> },
  { path: "/accounts", element: <AccountsPage /> },
  { path: "/cards", element: <CardsPage /> },
  { path: "/transfers", element: <TransfersPage /> },
  { path: "/incomes", element: <IncomesPage /> },
  { path: "/expenses", element: <ExpensesPage /> },
  { path: "/recurring", element: <RecurringPage /> },
  { path: "/categories", element: <CategoriesPage /> },
  { path: "/budget", element: <BudgetPage /> },
  { path: "/payables", element: <PayablesPage /> },
  { path: "/goals", element: <GoalsPage /> },
  { path: "/calendar", element: <CalendarPage /> },
  { path: "/reports", element: <ReportsPage /> },
];

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            {protectedRoutes.map((route) => (
              <Route key={route.path} path={route.path} element={<Protected>{route.element}</Protected>} />
            ))}
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

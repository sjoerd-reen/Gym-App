import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { User } from "@/src/lib/storage";

const USER_KEY = "fitness_user";
export const ACTIVE_WORKOUT_KEY = "fitness_active_workout";

interface UserContextValue {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextValue | null>(null);

function readStoredUser(): User | null {
  const stored = localStorage.getItem(USER_KEY);
  return stored === "Sjoerd" || stored === "Nikita" ? stored : null;
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(readStoredUser);

  const login = useCallback((next: User) => {
    localStorage.setItem(USER_KEY, next);
    setUser(next);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ACTIVE_WORKOUT_KEY);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used inside UserProvider");
  return ctx;
}

export function useRequiredUser(): User {
  const { user } = useUser();
  if (!user) throw new Error("No user selected");
  return user;
}

import { useState, useEffect } from "react";
import { UserSelection } from "./components/UserSelection";
import { Dashboard } from "./components/Dashboard";
import { WorkoutSession } from "./components/WorkoutSession";
import { AnimatePresence, motion } from "motion/react";

type User = "Sjoerd" | "Nikita" | null;

export default function App() {
  const [user, setUser] = useState<User>(null);
  const [activeWorkout, setActiveWorkout] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("fitness_user");
    if (storedUser === "Sjoerd" || storedUser === "Nikita") {
      setUser(storedUser);
    }
    setIsLoaded(true);
  }, []);

  const handleSelectUser = (selectedUser: "Sjoerd" | "Nikita") => {
    localStorage.setItem("fitness_user", selectedUser);
    setUser(selectedUser);
  };

  const handleLogout = () => {
    localStorage.removeItem("fitness_user");
    setUser(null);
    setActiveWorkout(null);
  };

  if (!isLoaded) return null;

  return (
    <div className="bg-slate-50 min-h-screen text-slate-900 overflow-hidden">
      <AnimatePresence mode="wait">
        {!user ? (
          <motion.div
            key="user-selection"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <UserSelection onSelectUser={handleSelectUser} />
          </motion.div>
        ) : !activeWorkout ? (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Dashboard
              user={user}
              onSelectWorkout={setActiveWorkout}
              onLogout={handleLogout}
            />
          </motion.div>
        ) : (
          <motion.div
            key="workout"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <WorkoutSession
              workoutId={activeWorkout}
              user={user}
              onBack={() => setActiveWorkout(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

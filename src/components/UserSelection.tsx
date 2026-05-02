import { motion } from "motion/react";
import { ChevronRight, Dumbbell } from "lucide-react";

interface UserSelectionProps {
  onSelectUser: (user: "Sjoerd" | "Nikita") => void;
}

export function UserSelection({ onSelectUser }: UserSelectionProps) {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center p-6 font-sans overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="text-center mb-10 relative z-10"
      >
        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5">
          <Dumbbell className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
          Wie traint er vandaag?
        </h1>
        <p className="text-white/40 text-base">Selecteer je profiel om te beginnen</p>
      </motion.div>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm relative z-10">
        <UserCard name="Sjoerd" delay={0.1} gradient="from-indigo-500 to-violet-600" onClick={() => onSelectUser("Sjoerd")} />
        <UserCard name="Nikita" delay={0.18} gradient="from-emerald-500 to-teal-600" onClick={() => onSelectUser("Nikita")} />
      </div>
    </div>
  );
}

interface UserCardProps {
  name: "Sjoerd" | "Nikita";
  gradient: string;
  delay: number;
  onClick: () => void;
}

function UserCard({ name, gradient, delay, onClick }: UserCardProps) {
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className="flex-1 group relative rounded-3xl overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
    >
      {/* Gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-90`} />

      {/* Texture overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.15)_0%,_transparent_60%)]" />

      {/* Bottom fade */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

      {/* Content */}
      <div className="relative p-7 flex flex-col items-center gap-4 py-10">
        <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white text-4xl font-bold shadow-inner">
          {name.charAt(0)}
        </div>
        <div className="text-center">
          <p className="text-white text-xl font-bold tracking-tight">{name}</p>
          <p className="text-white/60 text-sm mt-0.5">Tik om te starten</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center group-hover:bg-white/25 transition-colors">
          <ChevronRight className="w-5 h-5 text-white" />
        </div>
      </div>
    </motion.button>
  );
}

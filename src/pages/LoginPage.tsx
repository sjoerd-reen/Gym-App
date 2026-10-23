import { Navigate, useNavigate } from "react-router";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { useUser } from "@/src/app/providers/UserProvider";
import type { User } from "@/src/lib/storage";

const PROFILES: { name: User; tint: string }[] = [
  { name: "Sjoerd", tint: "from-[#3d5afe] to-[#7b8cff]" },
  { name: "Nikita", tint: "from-[#12b76a] to-[#5fd9a3]" },
];

export function LoginPage() {
  const { user, login } = useUser();
  const navigate = useNavigate();
  if (user) return <Navigate to="/dashboard" replace />;

  const choose = (name: User) => {
    login(name);
    navigate("/dashboard", { replace: true });
  };

  return (
    <div className="min-h-dvh bg-canvas relative overflow-hidden flex items-center justify-center px-6 py-16">
      <div className="pointer-events-none absolute -top-48 left-1/2 -translate-x-1/2 w-[720px] h-[520px] rounded-full bg-accent/10 blur-[120px]" />

      <div className="relative w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-12"
        >
          <img src="/brand/logo-light.png" alt="SN Lift" className="mx-auto h-16 w-auto" />
          <p className="mt-3 mb-8 text-[13px] font-semibold uppercase tracking-[0.18em] text-muted">SN Lift</p>
          <h1 className="text-[36px] leading-[1.05] font-bold tracking-[-0.035em] text-ink">
            Wie traint er<br />vandaag?
          </h1>
          <p className="mt-3 text-base text-muted">Kies je profiel om verder te gaan.</p>
        </motion.div>

        <div className="space-y-3">
          {PROFILES.map((p, i) => (
            <motion.button
              key={p.name}
              onClick={() => choose(p.name)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.1 + i * 0.07, ease: [0.16, 1, 0.3, 1] }}
              whileTap={{ scale: 0.98 }}
              className="group w-full flex items-center gap-4 p-4 pr-5 rounded-[28px] bg-surface shadow-card border border-transparent hover:border-line text-left transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/20"
            >
              <div className={`w-14 h-14 rounded-[20px] bg-gradient-to-br ${p.tint} text-white text-xl font-bold flex items-center justify-center`}>
                {p.name.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="text-lg font-semibold tracking-tight text-ink">{p.name}</p>
                <p className="text-sm text-muted">Tik om te starten</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-subtle text-ink-2 flex items-center justify-center transition-all group-hover:bg-accent group-hover:text-white">
                <ArrowRight className="w-[18px] h-[18px]" />
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

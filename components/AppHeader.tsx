"use client";

import { LogIn, LogOut, Upload as UploadIcon, User, ShieldCheck, Loader2, Check } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import SearchRateLimitDisplay from "@/components/SearchRateLimitDisplay";

export default function AppHeader() {
  const router = useRouter();
  const { user, isAdmin, isSessionLoading, setAuthModalOpen, logout, logoutState } = useAuth();

  return (
    <header className="border-b border-zinc-200 bg-white sticky top-0 z-40">
      <div className="w-full px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <div className="flex items-center">
          <div className="cursor-pointer" onClick={() => router.push("/")}>
            <h1 className="font-[family-name:var(--font-equinox)] font-black text-xl leading-none uppercase tracking-wider hover:text-zinc-600 transition-colors">
              ARQUIV
            </h1>
            <p className="text-zinc-400 text-xs mt-1">Normas para Projetos Arquitetónicos</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isSessionLoading ? (
            <div className="flex items-center gap-3">
              <div className="w-24 h-8 bg-zinc-200 rounded-full animate-pulse"></div>
              <div className="w-10 h-10 bg-zinc-200 rounded-full animate-pulse"></div>
            </div>
          ) : user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:block">
                <SearchRateLimitDisplay compact={true} onLimitExceeded={() => {}} />
              </div>
              {isAdmin && (
                <button
                  onClick={() => router.push("/upload")}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-full text-sm font-bold hover:bg-emerald-700 transition-all shadow-sm"
                >
                  <UploadIcon className="w-4 h-4" />
                  <span className="hidden xs:inline">Carregar Norma</span>
                  <span className="inline xs:hidden">Carregar</span>
                </button>
              )}
              <div className="flex items-center gap-3 p-2 bg-zinc-50 rounded-full">
                <div className="w-8 h-8 bg-zinc-900 rounded-full flex items-center justify-center">
                  {user.user_metadata?.avatar_url ? (
                    <Image
                      src={user.user_metadata.avatar_url}
                      alt="Avatar"
                      width={32}
                      height={32}
                      className="w-8 h-8 rounded-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <User className="w-4 h-4 text-zinc-500" />
                  )}
                </div>
                <span className="text-xs font-bold text-zinc-600 hidden xs:inline sm:inline">
                  {isAdmin ? "Admin" : user.user_metadata?.full_name || user.email?.split("@")[0]}
                </span>
                {isAdmin && <ShieldCheck className="w-3 h-3 text-emerald-500 hidden xs:inline sm:inline" />}
              </div>
              <button
                onClick={logout}
                disabled={logoutState !== "idle"}
                className={`p-2 transition-colors ${
                  logoutState === "success" ? "text-emerald-500" : "text-zinc-400 hover:text-red-600"
                }`}
                title="Sair"
              >
                {logoutState === "loading" ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : logoutState === "success" ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <LogOut className="w-5 h-5" />
                )}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="hidden sm:block">
                <SearchRateLimitDisplay compact={true} onLimitExceeded={() => {}} />
              </div>
              <button
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center gap-2 px-4 xs:px-6 py-2 bg-zinc-900 text-white rounded-full text-xs xs:text-sm font-bold hover:bg-zinc-800 transition-all shadow-sm"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden xs:inline">Entrar / Registar</span>
                <span className="inline xs:hidden">Entrar</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

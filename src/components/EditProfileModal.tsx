"use client";

import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { AlertCircle, Mail, ShieldCheck, User as UserIcon, X, Lock, Eye, EyeOff } from "lucide-react";
import { getCurrentUserProfile, updateCurrentUserProfile } from "@/actions/user.actions";
import { useSession } from "next-auth/react";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EditProfileModal({ isOpen, onClose }: EditProfileModalProps) {
  const { data: session, update } = useSession();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    emailVerified: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadProfile = async () => {
    try {
      const me = await getCurrentUserProfile();
      setForm({
        name: me.name || "",
        email: me.email || "",
        password: "",
        confirmPassword: "",
        emailVerified: !!me.emailVerified,
      });
      setErrors({});
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    loadProfile();
  }, [isOpen]);

  // Listen for email verification events to refresh the profile
  useEffect(() => {
    const handleEmailVerified = () => {
      if (isOpen) {
        loadProfile();
      }
    };

    window.addEventListener("email-verified", handleEmailVerified);
    return () => {
      window.removeEventListener("email-verified", handleEmailVerified);
    };
  }, [isOpen]);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Name is required";
    if (!form.email.trim()) next.email = "Email is required";
    if (form.password && form.password.length < 8) next.password = "Password must be 8+ characters";
    if (form.password && form.password !== form.confirmPassword) next.confirmPassword = "Passwords do not match";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      // Only send emailVerified if it's true (to verify), never send false to unverify
      await updateCurrentUserProfile({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password.trim() || undefined,
        // Only include emailVerified if it's true, don't allow unverifying
        ...(form.emailVerified ? { emailVerified: true } : {}),
      });

      try {
        await update({
          // next-auth session update: these fields are commonly supported
          name: form.name.trim(),
          email: form.email.trim(),
        } as unknown as Record<string, unknown>);
      } catch {
        // non-fatal if session update is unavailable
      }

      // Notify app to refresh any session consumers in real-time
      try {
        window.dispatchEvent(new CustomEvent("profile-updated", {
          detail: {
            userId: session?.user?.id,
            name: form.name.trim(),
            email: form.email.trim(),
          }
        }));
      } catch {}

      onClose();
    } catch (err) {
      const message = (err as Error)?.message || "";
      if (message === "EMAIL_TAKEN") {
        setErrors({ email: "Email is already in use" });
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Edit Profile</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Manage your account details</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="pl-9" />
            </div>
            {errors.name && (
              <p className="text-sm text-red-500 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="pl-9" />
            </div>
            {errors.email && (
              <p className="text-sm text-red-500 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.email}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input id="password" type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="pl-9 pr-9" placeholder="Leave blank to keep" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-500 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.password}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input id="confirm" type={showConfirmPassword ? "text" : "password"} value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} className="pl-9 pr-9" />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-red-500 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              id="verified"
              type="checkbox"
              aria-label="Email verified"
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-600"
              checked={form.emailVerified}
              disabled={true}
              readOnly
              onChange={() => {}} // Prevent any changes
            />
            <Label htmlFor="verified" className="cursor-default">
              Email verified
              {form.emailVerified && (
                <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">(Verified - cannot be unchecked)</span>
              )}
            </Label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white">
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}



import React, { useState, useEffect } from "react";
import { Eye, EyeOff, Shield, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";
import { API } from "../services/api";
import { cn } from "../lib/utils";

const PasswordModal = React.memo(({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [passwordData, setPasswordData] = useState({
    new_password: "",
    confirm_password: ""
  });

  const [showPassword, setShowPassword] = useState(false);
  const [changing, setChanging] = useState(false);
  const [strength, setStrength] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);

  // 🔒 lock background
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const handleChange = (value: string) => {
    setPasswordData(prev => ({ ...prev, new_password: value }));

    let s = 0;
    const err: string[] = [];

    if (value.length < 6) err.push("At least 6 characters");
    if (value.length >= 6) s++;
    if (/[A-Z]/.test(value)) s++;
    if (/[a-z]/.test(value)) s++;
    if (/[0-9]/.test(value)) s++;
    if (/[!@#$%^&*]/.test(value)) s++;

    setStrength(Math.min(s, 5));
    setErrors(err);
  };

  const handleSubmit = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      alert("Passwords do not match");
      return;
    }

    setChanging(true);

    try {
      const res = await API.updateProfile({
        newPassword: passwordData.new_password
      });

      if (!res.success) {
        alert(res.error || "Failed");
        return;
      }

      alert("Password changed ✅");
      onClose();
    } catch (e) {
      alert("Error");
    } finally {
      setChanging(false);
    }
  };

  const colors = ["#ef4444", "#f59e0b", "#eab308", "#84cc16", "#10b981"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      
      {/* BACKDROP */}
      <div
        className="absolute inset-0 bg-black/80"
        onClick={onClose}
      />

      {/* MODAL */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-zinc-900 p-6"
      >
        {/* HEADER */}
        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex gap-2 items-center">
            <Shield className="h-5 w-5 text-indigo-400" />
            Change Password
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">✕</button>
        </div>

        {/* NEW PASSWORD */}
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={passwordData.new_password}
            onChange={(e) => handleChange(e.target.value)}
            className="w-full mb-3 p-3 rounded bg-zinc-800 text-white"
            placeholder="New Password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-3 text-zinc-400"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        {/* STRENGTH */}
        {passwordData.new_password && (
          <div className="mb-3">
            <div className="flex gap-1">
              {[0,1,2,3,4].map(i => (
                <div key={i}
                  className="h-1 flex-1 rounded"
                  style={{ background: i < strength ? colors[strength-1] : "#333" }}
                />
              ))}
            </div>
            {errors.length > 0 && (
              <p className="text-xs text-red-400 mt-1">{errors[0]}</p>
            )}
          </div>
        )}

        {/* CONFIRM */}
        <input
          type={showPassword ? "text" : "password"}
          value={passwordData.confirm_password}
          onChange={(e) =>
            setPasswordData(p => ({ ...p, confirm_password: e.target.value }))
          }
          className="w-full mb-4 p-3 rounded bg-zinc-800 text-white"
          placeholder="Confirm Password"
        />

        {/* BUTTON */}
        <button
          onClick={handleSubmit}
          disabled={changing}
          className="w-full bg-indigo-600 py-3 rounded text-white font-bold hover:bg-indigo-500 transition-colors disabled:opacity-50"
        >
          {changing ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "Change Password"}
        </button>
      </motion.div>
    </div>
  );
});

export default PasswordModal;
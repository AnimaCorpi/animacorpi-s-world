import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, X } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function AccountDeletionModal({ user, onClose }) {
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  const CONFIRM_PHRASE = "DELETE MY ACCOUNT";

  const handleDelete = async () => {
    if (confirmText !== CONFIRM_PHRASE) {
      setError(`Please type "${CONFIRM_PHRASE}" to confirm.`);
      return;
    }
    setIsDeleting(true);
    try {
      await base44.entities.User.delete(user.id);
      await base44.auth.logout("/");
    } catch (err) {
      setError("Failed to delete account. Please contact support.");
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 select-none"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Delete Account</h2>
            <p className="text-sm text-gray-500">This action is permanent and cannot be undone.</p>
          </div>
        </div>

        <p className="text-sm text-gray-700 mb-4">
          Deleting your account will permanently remove all your data, posts, and activity from the platform.
        </p>

        <div className="mb-4">
          <Label htmlFor="confirm-delete" className="text-sm font-medium text-gray-700">
            Type <span className="font-mono font-bold text-red-600">{CONFIRM_PHRASE}</span> to confirm:
          </Label>
          <Input
            id="confirm-delete"
            value={confirmText}
            onChange={(e) => { setConfirmText(e.target.value); setError(""); }}
            placeholder={CONFIRM_PHRASE}
            className="mt-2 font-mono"
          />
          {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1 select-none">
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            disabled={isDeleting || confirmText !== CONFIRM_PHRASE}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white select-none"
          >
            {isDeleting ? "Deleting..." : "Delete My Account"}
          </Button>
        </div>
      </div>
    </div>
  );
}
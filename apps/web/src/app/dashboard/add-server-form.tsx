"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type AddServerFormProps = {
  userId: string;
};

export default function AddServerForm({
  userId,
}: AddServerFormProps) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [serverType, setServerType] = useState("pc");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);
    setLoading(true);

    const supabase = createClient();

    const { error: insertError } = await supabase
      .from("servers")
      .insert({
        owner_id: userId,
        name: name.trim(),
        server_type: serverType,
      });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    setName("");
    setServerType("pc");
    setLoading(false);
    setOpen(false);

    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-neutral-200"
      >
        + Add Server
      </button>
    );
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-900 p-6">
      <h3 className="text-lg font-semibold">
        Add Palworld Server
      </h3>

      <form
        onSubmit={handleSubmit}
        className="mt-5 space-y-5"
      >
        <div>
          <label
            htmlFor="server-name"
            className="mb-2 block text-sm text-neutral-300"
          >
            Server Name
          </label>

          <input
            id="server-name"
            type="text"
            required
            minLength={1}
            maxLength={100}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="My Palworld Server"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-white/30"
          />
        </div>

        <div>
          <label
            htmlFor="server-type"
            className="mb-2 block text-sm text-neutral-300"
          >
            Server Type
          </label>

          <select
            id="server-type"
            value={serverType}
            onChange={(event) => setServerType(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-neutral-950 px-4 py-3 text-white outline-none"
          >
            <option value="pc">
              PC / Steam
            </option>
          </select>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setOpen(false);
              setError(null);
            }}
            className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-sm transition hover:bg-white/5 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="flex-1 rounded-xl bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Adding..." : "Add Server"}
          </button>
        </div>
      </form>
    </div>
  );
}
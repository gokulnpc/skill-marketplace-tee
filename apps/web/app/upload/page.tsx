"use client";

import { useState } from "react";

import { uploadSkill } from "@/lib/api";

export default function UploadPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const form = new FormData(event.currentTarget);
    try {
      const listing = await uploadSkill({
        seller_id: String(form.get("seller_id")),
        skill_content: String(form.get("skill_content")),
        metadata: {
          name: String(form.get("name")),
          version: String(form.get("version")),
          category: String(form.get("category")),
          evaluation_type: String(form.get("evaluation_type")),
          description: String(form.get("description")),
        },
        price: Number(form.get("price")),
        publish: true,
      });
      setMessage(`Published skill: ${listing.skill_id}`);
      event.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold">Upload Skill</h1>
        <p className="mt-2 text-muted">Submit a private skill package for encrypted listing.</p>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-xl border border-border p-5">
        <input name="seller_id" defaultValue="seller_demo" placeholder="Seller ID" className="rounded-md border border-border bg-transparent px-3 py-2" />
        <input name="name" placeholder="Skill name" className="rounded-md border border-border bg-transparent px-3 py-2" required />
        <input name="version" defaultValue="0.1.0" placeholder="Version" className="rounded-md border border-border bg-transparent px-3 py-2" />
        <input name="category" defaultValue="redaction" placeholder="Category" className="rounded-md border border-border bg-transparent px-3 py-2" />
        <input name="evaluation_type" defaultValue="redaction" placeholder="Evaluation type" className="rounded-md border border-border bg-transparent px-3 py-2" />
        <input name="price" type="number" defaultValue="25" placeholder="Price" className="rounded-md border border-border bg-transparent px-3 py-2" />
        <textarea name="description" placeholder="Description" className="min-h-20 rounded-md border border-border bg-transparent px-3 py-2" required />
        <textarea name="skill_content" placeholder="Paste SKILL.md content" className="min-h-48 rounded-md border border-border bg-transparent px-3 py-2 font-mono text-sm" required />
        <button type="submit" className="rounded-md bg-accent px-4 py-2 font-medium text-white">
          Publish skill
        </button>
      </form>
      {message ? <p className="text-sm text-green-400">{message}</p> : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}

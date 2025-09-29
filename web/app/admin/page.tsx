"use client";

import { useEffect, useState } from "react";
import { projectService } from "@/lib/services";
import type { Project } from "@/lib/types";

export default function AdminPage() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const response = await projectService.getProjects();
        if (response.success) {
          setProjects(response.data?.data || []);
        } else {
          console.error('Failed to load projects:', response.error);
          setProjects([]);
        }
      } catch (error) {
        console.error('Error loading projects:', error);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="mx-auto max-w-xl px-4 py-10">Loading...</div>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold">Admin Panel</h1>
      <p className="mt-2 text-text-tertiary">Overview of projects (basic scaffold).</p>

      <div className="mt-6 overflow-hidden rounded-md border border-white/10">
        <table className="min-w-full divide-y divide-white/10">
          <thead className="bg-dark-surface/50/70">
            <tr>
              <th className="px-4 py-2 text-left text-sm font-medium text-text-tertiary">Project</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-text-tertiary">Owner</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-text-tertiary">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 bg-dark-surface/50/40">
            {projects && projects.length ? projects.map((project: Project) => (
              <tr key={project.id}>
                <td className="px-4 py-2">
                  <div className="font-medium text-white">{project.title}</div>
                  <div className="text-xs text-text-tertiary line-clamp-1">{project.description}</div>
                </td>
                <td className="px-4 py-2 text-sm text-text-tertiary">{project.ownerName || "-"}</td>
                <td className="px-4 py-2 text-sm">
                  <span className="rounded bg-brand-primary/20 px-2 py-0.5 text-brand-light border border-brand-primary/30">
                    {project.status || "-"}
                  </span>
                </td>
              </tr>
            )) : (
              <tr>
                <td className="px-4 py-6 text-center text-sm text-text-tertiary" colSpan={3}>No projects found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-8 text-sm text-text-tertiary">This admin view is a scaffold. Port advanced actions from client/src/pages/Admin.js as needed.</p>
    </div>
  );
}

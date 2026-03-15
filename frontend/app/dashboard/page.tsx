"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getProgress, type ProgressResponse } from "@/lib/api";

const USER_ID = "demo-user";

export default function DashboardPage() {
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    getProgress(USER_ID)
      .then(setProgress)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex gap-3">
          <Link
            href="/concepts"
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Explore Concepts
          </Link>
          <Link
            href="/exercise"
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Start Exercise
          </Link>
        </div>
      </div>

      {loading && <p className="text-gray-400 text-sm">Loading progress…</p>}

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-6 text-red-300 text-sm">
          Could not load progress data: {error}
        </div>
      )}

      {progress && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            <div className="bg-gray-800 rounded-xl p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Concepts Viewed</p>
              <p className="text-4xl font-bold text-indigo-400">{progress.summary.concepts_viewed}</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Exercises Completed</p>
              <p className="text-4xl font-bold text-green-400">{progress.summary.exercises_completed}</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Last Active</p>
              <p className="text-sm font-medium text-gray-300 mt-2">
                {progress.summary.last_active
                  ? new Date(progress.summary.last_active).toLocaleString()
                  : "—"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent concepts */}
            <section>
              <h2 className="text-lg font-semibold mb-3 text-gray-200">Recent Concepts</h2>
              {progress.recent_concepts.length === 0 ? (
                <p className="text-gray-500 text-sm">No concepts explored yet.</p>
              ) : (
                <ul className="space-y-2">
                  {progress.recent_concepts.map((c, i) => (
                    <li key={i} className="bg-gray-800 rounded-lg px-4 py-3 flex justify-between items-center">
                      <div>
                        <span className="font-medium text-sm capitalize">{c.concept}</span>
                        <span className="ml-2 text-xs text-gray-500 capitalize">{c.level}</span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(c.at).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Recent exercises */}
            <section>
              <h2 className="text-lg font-semibold mb-3 text-gray-200">Recent Exercises</h2>
              {progress.recent_exercises.length === 0 ? (
                <p className="text-gray-500 text-sm">No exercises completed yet.</p>
              ) : (
                <ul className="space-y-2">
                  {progress.recent_exercises.map((e, i) => (
                    <li key={i} className="bg-gray-800 rounded-lg px-4 py-3 flex justify-between items-center">
                      <div>
                        <span className="font-medium text-sm capitalize">{e.topic}</span>
                        <span className="ml-2 text-xs text-gray-500 capitalize">{e.level}</span>
                      </div>
                      <div className="text-right">
                        {e.score !== null && (
                          <span className="text-xs font-semibold text-indigo-400 mr-2">{e.score}pts</span>
                        )}
                        <span className="text-xs text-gray-400">
                          {new Date(e.at).toLocaleDateString()}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}

      {!loading && !error && !progress && (
        <div className="text-center py-24 text-gray-500">
          <p className="text-lg mb-4">No progress data yet.</p>
          <Link href="/exercise" className="text-indigo-400 hover:text-indigo-300">
            Start your first exercise →
          </Link>
        </div>
      )}
    </div>
  );
}

'use client';

import { type EnrichedTask } from '@insightboard/shared';
import { useEffect, useMemo, useState } from 'react';
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow';
import 'reactflow/dist/style.css';

import { createJob, getJob } from '../lib/api';
import { deriveStatus, toFlow } from '../lib/graph';

const DEMO_TRANSCRIPT = `Paste a transcript and submit, or use the script in README to preload sample input.`;

export function DependencyBoard() {
  const [transcript, setTranscript] = useState(DEMO_TRANSCRIPT);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'pending' | 'processing' | 'completed' | 'failed'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<EnrichedTask[]>([]);
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!jobId || (status !== 'pending' && status !== 'processing')) {
      return;
    }

    const timer = setInterval(async () => {
      try {
        const job = await getJob(jobId);
        setStatus(job.status);

        if (job.status === 'completed' && job.graph) {
          setTasks(job.graph.tasks);
          clearInterval(timer);
        }

        if (job.status === 'failed') {
          setError(job.error || 'Job failed');
          clearInterval(timer);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Polling failed');
        setStatus('failed');
        clearInterval(timer);
      }
    }, 1500);

    return () => clearInterval(timer);
  }, [jobId, status]);

  const { nodes, edges, errorTaskIds } = useMemo(() => {
    if (tasks.length === 0) {
      return { nodes: [], edges: [], errorTaskIds: new Set<string>() };
    }

    return toFlow(
      {
        tasks,
        metadata: {
          cycleDetected: tasks.some((task) => task.isInCycle),
          cycleTaskIds: tasks.filter((task) => task.isInCycle).map((task) => task.id),
          generatedAt: new Date().toISOString(),
          sourceModel: 'ui',
        },
      },
      completedTaskIds,
    );
  }, [tasks, completedTaskIds]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError(null);
    setStatus('pending');
    setCompletedTaskIds(new Set());
    setTasks([]);

    try {
      const created = await createJob(transcript);
      setJobId(created.jobId);

      if (created.status === 'completed' || created.status === 'failed') {
        const job = await getJob(created.jobId);
        setStatus(job.status);

        if (job.status === 'completed' && job.graph) {
          setTasks(job.graph.tasks);
        }

        if (job.status === 'failed') {
          setError(job.error || 'Job failed');
        }
        return;
      }

      setStatus(created.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit transcript');
      setStatus('failed');
    }
  };

  const completeTask = (task: EnrichedTask) => {
    const computed = deriveStatus(task, completedTaskIds, errorTaskIds);
    if (computed !== 'Ready') {
      return;
    }

    setCompletedTaskIds((prev) => {
      const next = new Set(prev);
      next.add(task.id);
      return next;
    });
  };

  return (
    <section className="grid grid-cols-1 gap-6 lg:grid-cols-[400px_1fr]">
      {/* Left Panel - Input */}
      <div className="surface rounded-2xl p-6 card-animate">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Transcript Input</h2>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-cyan-400"></div>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Live</span>
          </div>
        </div>
        
        <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
          Paste your meeting transcript to generate a dependency graph.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            className="input-field w-full h-48 rounded-xl p-4 text-sm resize-none"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Paste meeting transcript here..."
          />

          <button
            className="btn-primary w-full py-3 px-4 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
            disabled={!transcript.trim() || status === 'pending' || status === 'processing'}
            type="submit"
          >
            {(status === 'pending' || status === 'processing') ? (
              <>
                <svg className="h-4 w-4 spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" opacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" />
                </svg>
                Processing...
              </>
            ) : (
              'Generate Dependency Graph'
            )}
          </button>
        </form>

        {/* Status Panel */}
        <div className="mt-5 p-4 rounded-xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Status</span>
            <span className={`text-sm font-medium ${
              status === 'completed' ? 'text-emerald-400' :
              status === 'failed' ? 'text-rose-400' :
              status === 'processing' ? 'text-amber-400' :
              status === 'pending' ? 'text-blue-400' :
              'text-slate-500'
            }`}>
              {status === 'processing' ? 'Processing' : status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          </div>
          
          {jobId && (
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Job ID</span>
              <p className="text-xs font-mono mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>{jobId}</p>
            </div>
          )}
          
          {error && (
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
              <p className="text-xs text-rose-400">{error}</p>
            </div>
          )}
        </div>

        {/* Task List */}
        {tasks.length > 0 && (
          <div className="mt-5">
            <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
              Tasks ({tasks.length})
            </h3>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1 scroll-smooth">
              {tasks.map((task) => {
                const computed = deriveStatus(task, completedTaskIds, errorTaskIds);
                const statusClass = 
                  computed === 'Ready' ? 'status-ready' :
                  computed === 'Completed' ? 'status-completed' :
                  computed === 'Error' ? 'status-error' : 'status-blocked';
                
                return (
                  <div 
                    key={task.id} 
                    className="task-card rounded-xl p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-mono truncate" style={{ color: 'var(--text-muted)' }}>{task.id}</p>
                        <p className="text-sm font-medium mt-1 line-clamp-2" style={{ color: 'var(--text-primary)' }}>{task.description}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>P{task.priority}</span>
                          {task.dependencies.length > 0 && (
                            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                              → {task.dependencies.length} deps
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`status-badge flex-shrink-0 ${statusClass}`}>
                        {computed}
                      </span>
                    </div>
                    
                    {computed === 'Ready' && (
                      <button
                        className="btn-secondary w-full mt-3 py-2 rounded-lg text-xs font-medium"
                        onClick={() => completeTask(task)}
                        type="button"
                      >
                        Mark Complete
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Right Panel - Graph */}
      <div className="surface rounded-2xl p-4 card-animate">
        <div className="h-[700px] rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
            proOptions={{ hideAttribution: true }}
            onNodeClick={(_, node) => {
              const task = tasks.find((item) => item.id === node.id);
              if (task) {
                completeTask(task);
              }
            }}
          >
            <Background color="#1e3a5f" gap={25} size={1} />
            <MiniMap 
              pannable 
              zoomable 
              nodeColor={(node) => node.selected ? '#06b6d4' : '#1e3a5f'}
              maskColor="rgba(3, 7, 18, 0.8)"
            />
            <Controls />
          </ReactFlow>
        </div>
      </div>
    </section>
  );
}


"use client";

import { useEffect, useState } from "react";

interface BulkJob {
    id: string;
    createdAt: string;
    status: string;
    total: number;
    processed: number;
    failed: number;
}

export function BulkJobHistory({ refreshTrigger }: { refreshTrigger: number }) {
    const [jobs, setJobs] = useState<BulkJob[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchHistory = async () => {
        try {
            const res = await fetch("/api/bulk-invite/history?limit=5");
            if (res.ok) {
                const data = await res.json();
                setJobs(data.jobs);
            }
        } catch (error) {
            console.error("Failed to fetch job history", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();

        // Poll occasionally for updates if there are pending jobs
        const interval = setInterval(() => {
            fetchHistory();
        }, 5000);

        return () => clearInterval(interval);
    }, [refreshTrigger]);

    if (isLoading && jobs.length === 0) {
        return <div className="text-sm text-surface-500">Loading history...</div>;
    }

    if (jobs.length === 0) {
        return (
            <div className="card p-6 mt-6">
                <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">
                    Recent Bulk Jobs
                </h3>
                <p className="text-sm text-surface-500">No recent bulk jobs found.</p>
            </div>
        );
    }

    return (
        <div className="card p-6 mt-6">
            <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">
                Recent Bulk Jobs
            </h3>
            <div className="space-y-4">
                {jobs.map((job) => (
                    <div key={job.id} className="flex items-center justify-between p-3 bg-surface-50 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full ${job.status === 'COMPLETED' ? 'bg-emerald-500' :
                                    job.status === 'FAILED' ? 'bg-red-500' :
                                        'bg-blue-500 animate-pulse'
                                    }`} />
                                <span className="font-medium text-surface-900 dark:text-white text-sm">
                                    {new Date(job.createdAt).toLocaleString()}
                                </span>
                            </div>
                            <div className="text-xs text-surface-500 mt-1 ml-4.5">
                                {job.status === 'PENDING' ? 'Queued' :
                                    job.status === 'PROCESSING' ? `Sending... ${job.processed}/${job.total}` :
                                        job.status === 'COMPLETED' ? `Sent: ${job.processed - job.failed}, Failed: ${job.failed}` :
                                            'Failed'}
                            </div>
                        </div>
                        {job.status === 'PROCESSING' && (
                            <div className="w-24 h-1.5 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 transition-all duration-500"
                                    style={{ width: `${Math.round((job.processed / job.total) * 100)}%` }}
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

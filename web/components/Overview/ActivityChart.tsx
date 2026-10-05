'use client';
import React from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useTheme } from '@/context/ThemeContext';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);
export default function ActivityChart({ data }: { data: { hour: string; messages?: number; commands?: number; count?: number }[] }) {
  const { resolvedTheme } = useTheme();
  const text = resolvedTheme === 'dark' ? '#b0bdd1' : '#37445b';
  if (!data.length) return <p className="text-sm text-text-muted">Activity history is unavailable.</p>;
  const labels = data.map(point => /^\d{4}-/.test(point.hour) ? new Date(point.hour).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : point.hour);
  const counts = data.map(point => point.count ?? ((point.messages ?? 0) + (point.commands ?? 0)));
  return <div className="h-52"><table className="sr-only"><caption>Recorded server activity over the last 24 hours</caption><thead><tr><th>Hour</th><th>Events</th></tr></thead><tbody>{data.map((point, index) => <tr key={point.hour}><td>{labels[index]}</td><td>{counts[index]}</td></tr>)}</tbody></table><Line aria-label="Recorded server activity over the last 24 hours" role="img" data={{ labels, datasets: [{ label: 'Recorded activity', data: counts, borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,.12)', fill: true, pointRadius: 0, tension: .3 }] }} options={{ responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: text, maxTicksLimit: 8 }, grid: { display: false } }, y: { beginAtZero: true, ticks: { color: text, precision: 0 }, grid: { color: resolvedTheme === 'dark' ? '#2c3344' : '#d2d8e5' } } } }}/></div>;
}

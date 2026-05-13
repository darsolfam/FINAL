'use client';

import { useState } from 'react';
import { UserQuery, VehicleTier, TripDuration, ComfortLevel } from '@/types';
import { MapPin, Clock, Car, Tent, AlertTriangle, Calendar } from 'lucide-react';

interface Props {
  onSubmit: (query: UserQuery) => void;
  loading: boolean;
}

const VEHICLE_OPTIONS: { value: VehicleTier; label: string; description: string }[] = [
  { value: 'street', label: 'Street / Light Gravel', description: 'Camry, standard SUV — paved roads only' },
  { value: 'stock4wd', label: 'Stock 4WD/AWD', description: 'Stock 4Runner, Tacoma — maintained dirt roads' },
  { value: 'lifted', label: 'Lifted / All-Terrain', description: 'Lifted with AT tires — rocky terrain' },
  { value: 'overlander', label: 'Full Overlander', description: 'Built rig with lockers & armor — technical routes' },
];

const COMFORT_OPTIONS: { value: ComfortLevel; label: string; description: string }[] = [
  { value: 'light', label: 'Light', description: 'Toilets, water, designated sites' },
  { value: 'medium', label: 'Medium', description: 'Remote-ish, some cell coverage' },
  { value: 'hard', label: 'Hard', description: "You're on your own — fully off-grid" },
];

function deriveDuration(startDate: string, endDate: string): TripDuration {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'day';
  if (days <= 2) return 'weekend';
  return 'multiday';
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

export default function InputForm({ onSubmit, loading }: Props) {
  const [form, setForm] = useState<UserQuery>({
    startingLocation: '',
    duration: 'weekend',
    maxDriveHours: 3,
    vehicleTier: 'stock4wd',
    comfortLevel: 'medium',
    freeformConstraints: '',
    tripStartDate: daysFromNow(7),
    tripEndDate: daysFromNow(9),
  });

  function handleDateChange(field: 'tripStartDate' | 'tripEndDate', value: string) {
    const updated = { ...form, [field]: value };
    if (updated.tripStartDate && updated.tripEndDate) {
      updated.duration = deriveDuration(updated.tripStartDate, updated.tripEndDate);
    }
    // Keep end date after start date
    if (field === 'tripStartDate' && updated.tripEndDate && value > updated.tripEndDate) {
      updated.tripEndDate = value;
    }
    setForm(updated);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const durationLabel = form.duration === 'day' ? 'Day Trip' : form.duration === 'weekend' ? 'Weekend' : 'Multi-Day';

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Starting location */}
      <div>
        <label className="flex items-center gap-2 text-sm font-semibold text-stone-200 mb-1">
          <MapPin size={14} /> Starting Location
        </label>
        <input
          type="text"
          placeholder="e.g. Denver, CO"
          value={form.startingLocation}
          onChange={(e) => setForm({ ...form, startingLocation: e.target.value })}
          required
          className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 text-sm"
        />
      </div>

      {/* Trip dates */}
      <div>
        <label className="flex items-center gap-2 text-sm font-semibold text-stone-200 mb-2">
          <Calendar size={14} /> Trip Dates
          {form.tripStartDate && form.tripEndDate && (
            <span className="ml-auto text-xs font-normal text-amber-400">{durationLabel}</span>
          )}
        </label>
        <div className="flex gap-2">
          <div className="flex-1">
            <div className="text-xs text-stone-500 mb-1">Departure</div>
            <input
              type="date"
              value={form.tripStartDate ?? ''}
              min={today()}
              onChange={(e) => handleDateChange('tripStartDate', e.target.value)}
              className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-stone-100 focus:outline-none focus:border-amber-500 text-sm [color-scheme:dark]"
            />
          </div>
          <div className="flex-1">
            <div className="text-xs text-stone-500 mb-1">Return</div>
            <input
              type="date"
              value={form.tripEndDate ?? ''}
              min={form.tripStartDate ?? today()}
              onChange={(e) => handleDateChange('tripEndDate', e.target.value)}
              className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-stone-100 focus:outline-none focus:border-amber-500 text-sm [color-scheme:dark]"
            />
          </div>
        </div>
      </div>

      {/* Max drive time */}
      <div>
        <label className="flex items-center gap-2 text-sm font-semibold text-stone-200 mb-1">
          <Clock size={14} /> Max Drive Time: <span className="text-amber-400">{form.maxDriveHours}h</span>
        </label>
        <input
          type="range"
          min={1}
          max={10}
          step={0.5}
          value={form.maxDriveHours}
          onChange={(e) => setForm({ ...form, maxDriveHours: parseFloat(e.target.value) })}
          className="w-full accent-amber-500"
        />
        <div className="flex justify-between text-xs text-stone-500 mt-1">
          <span>1h</span><span>10h</span>
        </div>
      </div>

      {/* Vehicle tier */}
      <div>
        <label className="flex items-center gap-2 text-sm font-semibold text-stone-200 mb-2">
          <Car size={14} /> Vehicle Capability
        </label>
        <div className="space-y-2">
          {VEHICLE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setForm({ ...form, vehicleTier: opt.value })}
              className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                form.vehicleTier === opt.value
                  ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                  : 'border-stone-700 bg-stone-800 text-stone-400 hover:border-stone-500'
              }`}
            >
              <div className="text-xs font-semibold">{opt.label}</div>
              <div className="text-xs opacity-70">{opt.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Comfort level */}
      <div>
        <label className="flex items-center gap-2 text-sm font-semibold text-stone-200 mb-2">
          <Tent size={14} /> Comfort Level
        </label>
        <div className="space-y-2">
          {COMFORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setForm({ ...form, comfortLevel: opt.value })}
              className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                form.comfortLevel === opt.value
                  ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                  : 'border-stone-700 bg-stone-800 text-stone-400 hover:border-stone-500'
              }`}
            >
              <div className="text-xs font-semibold capitalize">{opt.label}</div>
              <div className="text-xs opacity-70">{opt.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Freeform constraints */}
      <div>
        <label className="flex items-center gap-2 text-sm font-semibold text-stone-200 mb-1">
          <AlertTriangle size={14} /> Special Requirements
        </label>
        <textarea
          rows={2}
          placeholder="e.g. avoid wildfires, need cell service, high-altitude preferred..."
          value={form.freeformConstraints}
          onChange={(e) => setForm({ ...form, freeformConstraints: e.target.value })}
          className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 text-sm resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={loading || !form.startingLocation}
        className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-stone-700 disabled:text-stone-500 text-stone-900 font-bold rounded-lg transition-colors text-sm"
      >
        {loading ? 'Planning your adventure...' : 'Find My Route'}
      </button>
    </form>
  );
}

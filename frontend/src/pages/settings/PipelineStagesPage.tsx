import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pipelineStagesApi, PipelineStage } from '@/api/pipeline-stages';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/useToast';
import {
  Plus, Trash2, GripVertical, Lock, Pencil, Check, X, ChevronUp, ChevronDown,
} from 'lucide-react';

const TYPE_OPTIONS = [
  { value: 'CUSTOM', label: 'Custom' },
  { value: 'TEST', label: 'Test Round' },
  { value: 'INTERVIEW', label: 'Interview Round' },
];

const typeColor: Record<string, string> = {
  FIXED: 'bg-slate-100 text-slate-600',
  TEST: 'bg-amber-100 text-amber-700',
  INTERVIEW: 'bg-blue-100 text-blue-700',
  CUSTOM: 'bg-purple-100 text-purple-700',
};

const cardClass = 'rounded-xl border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]';

interface EditState {
  key: string;
  label: string;
  color: string;
  type: string;
}

export default function PipelineStagesPage() {
  const queryClient = useQueryClient();
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ key: '', label: '', color: '#6b7280', type: 'CUSTOM' });
  const [showAdd, setShowAdd] = useState(false);
  const [newStage, setNewStage] = useState({ key: '', label: '', color: '#6b7280', type: 'CUSTOM' });

  const { data, isLoading } = useQuery({
    queryKey: ['pipeline-stages'],
    queryFn: () => pipelineStagesApi.getAll().then((r) => r.data.data),
  });

  const stages = data ?? [];

  const updateMutation = useMutation({
    mutationFn: ({ key, ...rest }: Partial<PipelineStage> & { key: string }) =>
      pipelineStagesApi.update(key, rest),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] });
      setEditKey(null);
      toast({ title: 'Stage updated' });
    },
    onError: (e: any) => toast({ title: e?.response?.data?.message ?? 'Update failed', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (key: string) => pipelineStagesApi.remove(key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] });
      toast({ title: 'Stage deleted' });
    },
    onError: (e: any) => toast({ title: e?.response?.data?.message ?? 'Delete failed', variant: 'destructive' }),
  });

  const createMutation = useMutation({
    mutationFn: (payload: typeof newStage & { stageOrder: number }) =>
      pipelineStagesApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] });
      setShowAdd(false);
      setNewStage({ key: '', label: '', color: '#6b7280', type: 'CUSTOM' });
      toast({ title: 'Stage created' });
    },
    onError: (e: any) => toast({ title: e?.response?.data?.message ?? 'Create failed', variant: 'destructive' }),
  });

  const reorderMutation = useMutation({
    mutationFn: (order: { key: string; stageOrder: number }[]) =>
      pipelineStagesApi.reorder(order),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] }),
    onError: () => toast({ title: 'Reorder failed', variant: 'destructive' }),
  });

  const toggleActive = (stage: PipelineStage) => {
    updateMutation.mutate({ key: stage.key, isActive: !stage.isActive });
  };

  const startEdit = (stage: PipelineStage) => {
    setEditKey(stage.key);
    setEditState({ key: stage.key, label: stage.label, color: stage.color, type: stage.type });
  };

  const saveEdit = () => {
    if (!editState.label.trim()) return;
    updateMutation.mutate({ key: editState.key, label: editState.label, color: editState.color, type: editState.type });
  };

  const moveStage = (key: string, direction: 'up' | 'down') => {
    const sorted = [...stages].sort((a, b) => a.stageOrder - b.stageOrder);
    const idx = sorted.findIndex((s) => s.key === key);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const updated = sorted.map((s) => ({ ...s }));
    const tmp = updated[idx]!.stageOrder;
    updated[idx]!.stageOrder = updated[swapIdx]!.stageOrder;
    updated[swapIdx]!.stageOrder = tmp;
    reorderMutation.mutate(updated.map((s) => ({ key: s.key, stageOrder: s.stageOrder })));
  };

  const handleCreate = () => {
    if (!newStage.label.trim()) return toast({ title: 'Label is required', variant: 'destructive' });
    const maxOrder = stages.length ? Math.max(...stages.map((s) => s.stageOrder)) : 0;
    createMutation.mutate({ ...newStage, stageOrder: maxOrder + 1 });
  };

  const sorted = [...stages].sort((a, b) => a.stageOrder - b.stageOrder);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827]">Pipeline Stages</h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Customize your hiring pipeline — add test rounds, interview rounds, or custom stages.
          </p>
        </div>
        <Button
          onClick={() => setShowAdd(true)}
          className="bg-[#FF6B00] hover:bg-[#EA580C] text-white"
          size="sm"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Add Stage
        </Button>
      </div>

      {/* Add Stage Form */}
      {showAdd && (
        <Card className={cardClass}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">New Stage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#64748B]">Label *</label>
                <Input
                  value={newStage.label}
                  onChange={(e) => setNewStage((p) => ({ ...p, label: e.target.value }))}
                  placeholder="e.g. Technical Test Round 1"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#64748B]">Key (auto-generated)</label>
                <Input
                  value={newStage.label.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '')}
                  readOnly
                  className="bg-gray-50 text-gray-500"
                  placeholder="AUTO_GENERATED"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#64748B]">Type</label>
                <select
                  className="w-full rounded-md border border-[#E2E8F0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  value={newStage.type}
                  onChange={(e) => setNewStage((p) => ({ ...p, type: e.target.value }))}
                >
                  {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#64748B]">Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newStage.color}
                    onChange={(e) => setNewStage((p) => ({ ...p, color: e.target.value }))}
                    className="h-9 w-16 cursor-pointer rounded border border-[#E2E8F0]"
                  />
                  <span className="text-sm text-[#64748B]">{newStage.color}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                className="bg-[#FF6B00] hover:bg-[#EA580C] text-white"
                onClick={handleCreate}
                disabled={createMutation.isPending}
              >
                <Check className="mr-1 h-3.5 w-3.5" /> Create Stage
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stages List */}
      <Card className={cardClass}>
        <CardContent className="divide-y divide-[#F1F5F9] p-0">
          {isLoading && (
            <div className="py-12 text-center text-sm text-[#64748B]">Loading stages…</div>
          )}
          {!isLoading && sorted.length === 0 && (
            <div className="py-12 text-center text-sm text-[#64748B]">No stages found.</div>
          )}
          {sorted.map((stage, idx) => {
            const isEditing = editKey === stage.key;
            return (
              <div
                key={stage.key}
                className={`flex items-center gap-3 px-4 py-3 ${!stage.isActive ? 'opacity-50' : ''}`}
              >
                {/* Reorder */}
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => moveStage(stage.key, 'up')}
                    disabled={idx === 0}
                    className="rounded p-0.5 text-[#94A3B8] hover:text-[#64748B] disabled:opacity-25"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => moveStage(stage.key, 'down')}
                    disabled={idx === sorted.length - 1}
                    className="rounded p-0.5 text-[#94A3B8] hover:text-[#64748B] disabled:opacity-25"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>

                <GripVertical className="h-4 w-4 text-[#CBD5E1] shrink-0" />

                {/* Color swatch */}
                {isEditing ? (
                  <input
                    type="color"
                    value={editState.color}
                    onChange={(e) => setEditState((p) => ({ ...p, color: e.target.value }))}
                    className="h-7 w-7 cursor-pointer rounded border border-[#E2E8F0]"
                  />
                ) : (
                  <div className="h-7 w-7 rounded shrink-0" style={{ backgroundColor: stage.color }} />
                )}

                {/* Label */}
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <Input
                      value={editState.label}
                      onChange={(e) => setEditState((p) => ({ ...p, label: e.target.value }))}
                      className="h-7 text-sm"
                    />
                  ) : (
                    <span className="text-sm font-medium text-[#111827]">{stage.label}</span>
                  )}
                  <div className="mt-0.5 flex items-center gap-2">
                    <code className="text-xs text-[#94A3B8]">{stage.key}</code>
                    {isEditing ? (
                      <select
                        className="rounded border border-[#E2E8F0] px-1.5 py-0.5 text-xs focus:outline-none"
                        value={editState.type}
                        disabled={stage.isFixed}
                        onChange={(e) => setEditState((p) => ({ ...p, type: e.target.value }))}
                      >
                        {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    ) : (
                      <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${typeColor[stage.type] ?? typeColor.CUSTOM}`}>
                        {stage.type === 'FIXED' ? 'Core' : stage.type === 'TEST' ? 'Test' : stage.type === 'INTERVIEW' ? 'Interview' : 'Custom'}
                      </span>
                    )}
                    {stage.isFixed && <Lock className="h-3 w-3 text-[#94A3B8]" />}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {isEditing ? (
                    <>
                      <button
                        onClick={saveEdit}
                        disabled={updateMutation.isPending}
                        className="rounded-full p-1.5 text-green-600 hover:bg-green-50"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setEditKey(null)}
                        className="rounded-full p-1.5 text-[#64748B] hover:bg-gray-100"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Active toggle */}
                      <button
                        title={stage.isActive ? 'Deactivate' : 'Activate'}
                        onClick={() => toggleActive(stage)}
                        className={`h-5 w-9 rounded-full transition-colors ${stage.isActive ? 'bg-[#FF6B00]' : 'bg-[#CBD5E1]'}`}
                      >
                        <span
                          className={`block h-4 w-4 translate-x-0.5 rounded-full bg-white shadow transition-transform ${stage.isActive ? 'translate-x-4' : ''}`}
                        />
                      </button>
                      <button
                        onClick={() => startEdit(stage)}
                        className="rounded-full p-1.5 text-[#64748B] hover:bg-gray-100"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {!stage.isFixed && (
                        <button
                          onClick={() => {
                            if (confirm(`Delete stage "${stage.label}"? This cannot be undone.`)) {
                              deleteMutation.mutate(stage.key);
                            }
                          }}
                          className="rounded-full p-1.5 text-rose-400 hover:bg-rose-50"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <p className="text-xs text-[#94A3B8]">
        <Lock className="mr-1 inline h-3 w-3" />
        Core stages (APPLIED, SELECTED, OFFER_SENT, OFFER_ACCEPTED, JOINED, REJECTED, WITHDRAWN, ON_HOLD) cannot be deleted.
        You can rename them or change their color.
      </p>
    </div>
  );
}

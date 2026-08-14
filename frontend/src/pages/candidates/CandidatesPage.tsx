import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { candidatesApi, type CandidateQueryParams } from '@/api/candidates';
import { designationService, skillService } from '@/services/master.service';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Eye, FileText, Briefcase, Clock, Mail, Filter, X, Users } from 'lucide-react';

type DraftFilters = {
  experienceRange: string;
  noticeRange: string;
  salaryMin: string;
  salaryMax: string;
  designation: string;
  applicationFrom: string;
  applicationTo: string;
  pastCompany: string;
  skillIds: string[];
  skillMatchMode: 'ALL' | 'ANY';
};

const EMPTY_DRAFT: DraftFilters = {
  experienceRange: '',
  noticeRange: '',
  salaryMin: '',
  salaryMax: '',
  designation: '',
  applicationFrom: '',
  applicationTo: '',
  pastCompany: '',
  skillIds: [],
  skillMatchMode: 'ALL',
};

const EXPERIENCE_OPTIONS = [
  { value: '0-1', label: '0-1 years', min: 0, max: 1 },
  { value: '1-3', label: '1-3 years', min: 1, max: 3 },
  { value: '3-5', label: '3-5 years', min: 3, max: 5 },
  { value: '5-8', label: '5-8 years', min: 5, max: 8 },
  { value: '8+', label: '8+ years', min: 8, max: undefined },
];

const NOTICE_OPTIONS = [
  { value: 'immediate', label: 'Immediate', min: 0, max: 0 },
  { value: '0-15', label: '0-15 days', min: 0, max: 15 },
  { value: '16-30', label: '16-30 days', min: 16, max: 30 },
  { value: '31-60', label: '31-60 days', min: 31, max: 60 },
  { value: '61-90', label: '61-90 days', min: 61, max: 90 },
  { value: '90+', label: '90+ days', min: 90, max: undefined },
  { value: 'lte30', label: '≤ 30 days', min: undefined, max: 30 },
  { value: 'lte60', label: '≤ 60 days', min: undefined, max: 60 },
];

function draftFromParams(params: URLSearchParams): DraftFilters {
  const expMin = params.get('experienceMin');
  const expMax = params.get('experienceMax');
  let experienceRange = '';
  if (expMin || expMax) {
    const match = EXPERIENCE_OPTIONS.find(
      (o) => String(o.min ?? '') === (expMin ?? '') && String(o.max ?? '') === (expMax ?? ''),
    );
    experienceRange = match?.value ?? '';
  }

  const noticeMin = params.get('noticeMin');
  const noticeMax = params.get('noticeMax');
  let noticeRange = '';
  if (noticeMin || noticeMax) {
    const match = NOTICE_OPTIONS.find(
      (o) => String(o.min ?? '') === (noticeMin ?? '') && String(o.max ?? '') === (noticeMax ?? ''),
    );
    noticeRange = match?.value ?? '';
  }

  return {
    experienceRange,
    noticeRange,
    salaryMin: params.get('salaryMin') ?? '',
    salaryMax: params.get('salaryMax') ?? '',
    designation: params.get('designation') ?? '',
    applicationFrom: params.get('applicationFrom') ?? '',
    applicationTo: params.get('applicationTo') ?? '',
    pastCompany: params.get('pastCompany') ?? '',
    skillIds: (params.get('skills') ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    skillMatchMode: params.get('skillMatchMode') === 'ANY' ? 'ANY' : 'ALL',
  };
}

function buildQueryFromDraft(draft: DraftFilters, search: string, page: number): CandidateQueryParams {
  const exp = EXPERIENCE_OPTIONS.find((o) => o.value === draft.experienceRange);
  const notice = NOTICE_OPTIONS.find((o) => o.value === draft.noticeRange);

  return {
    page,
    limit: 20,
    search: search || undefined,
    experienceMin: exp?.min,
    experienceMax: exp?.max,
    noticeMin: notice?.min,
    noticeMax: notice?.max,
    salaryMin: draft.salaryMin ? Number(draft.salaryMin) : undefined,
    salaryMax: draft.salaryMax ? Number(draft.salaryMax) : undefined,
    designation: draft.designation || undefined,
    applicationFrom: draft.applicationFrom || undefined,
    applicationTo: draft.applicationTo || undefined,
    pastCompany: draft.pastCompany || undefined,
    skills: draft.skillIds.length ? draft.skillIds.join(',') : undefined,
    skillMatchMode: draft.skillIds.length ? draft.skillMatchMode : undefined,
  };
}

function countActiveFilters(draft: DraftFilters): number {
  let n = 0;
  if (draft.experienceRange) n++;
  if (draft.noticeRange) n++;
  if (draft.salaryMin || draft.salaryMax) n++;
  if (draft.designation) n++;
  if (draft.applicationFrom || draft.applicationTo) n++;
  if (draft.pastCompany) n++;
  if (draft.skillIds.length) n++;
  return n;
}

export default function CandidatesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [page, setPage] = useState(Number(searchParams.get('page') ?? 1) || 1);
  const [draft, setDraft] = useState<DraftFilters>(() => draftFromParams(searchParams));
  const [applied, setApplied] = useState<DraftFilters>(() => draftFromParams(searchParams));

  const { data: designations = [] } = useQuery({
    queryKey: ['desig-active'],
    queryFn: () => designationService.getAllActive(),
  });

  const { data: skills = [] } = useQuery({
    queryKey: ['skill-active'],
    queryFn: () => skillService.getAllActive(),
  });

  const queryParams = useMemo(
    () => buildQueryFromDraft(applied, search, page),
    [applied, search, page],
  );

  const { data, isLoading } = useQuery({
    queryKey: ['candidates', queryParams],
    queryFn: () => candidatesApi.getAll(queryParams).then((r) => r.data),
  });

  const candidates = data?.data ?? [];
  const activeFilterCount = countActiveFilters(applied);
  const hasFilters = activeFilterCount > 0;

  useEffect(() => {
    const next = new URLSearchParams();
    if (search) next.set('search', search);
    if (page > 1) next.set('page', String(page));

    const q = buildQueryFromDraft(applied, '', 1);
    if (q.experienceMin != null) next.set('experienceMin', String(q.experienceMin));
    if (q.experienceMax != null) next.set('experienceMax', String(q.experienceMax));
    if (q.noticeMin != null) next.set('noticeMin', String(q.noticeMin));
    if (q.noticeMax != null) next.set('noticeMax', String(q.noticeMax));
    if (q.salaryMin != null) next.set('salaryMin', String(q.salaryMin));
    if (q.salaryMax != null) next.set('salaryMax', String(q.salaryMax));
    if (q.designation) next.set('designation', q.designation);
    if (q.applicationFrom) next.set('applicationFrom', q.applicationFrom);
    if (q.applicationTo) next.set('applicationTo', q.applicationTo);
    if (q.pastCompany) next.set('pastCompany', q.pastCompany);
    if (q.skills) next.set('skills', q.skills);
    if (q.skillMatchMode) next.set('skillMatchMode', q.skillMatchMode);

    setSearchParams(next, { replace: true });
  }, [applied, search, page, setSearchParams]);

  const updateDraft = <K extends keyof DraftFilters>(key: K, value: DraftFilters[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setApplied({ ...draft });
    setPage(1);
  };

  const clearFilters = () => {
    setDraft(EMPTY_DRAFT);
    setApplied(EMPTY_DRAFT);
    setPage(1);
  };

  const removeChip = (key: keyof DraftFilters | 'salary' | 'applicationDate' | 'skills') => {
    const next = { ...applied };
    if (key === 'salary') {
      next.salaryMin = '';
      next.salaryMax = '';
    } else if (key === 'applicationDate') {
      next.applicationFrom = '';
      next.applicationTo = '';
    } else if (key === 'skills') {
      next.skillIds = [];
    } else if (key === 'experienceRange' || key === 'noticeRange' || key === 'designation' || key === 'pastCompany') {
      next[key] = '' as never;
    }
    setApplied(next);
    setDraft(next);
    setPage(1);
  };

  const toggleSkill = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      skillIds: prev.skillIds.includes(id)
        ? prev.skillIds.filter((s) => s !== id)
        : [...prev.skillIds, id],
    }));
  };

  const selectClass = 'h-10 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm text-[#111827] focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/25';
  const labelClass = 'mb-1 block text-xs font-medium text-[#64748B]';
  const fieldClass = 'h-10 rounded-xl border-[#E2E8F0] bg-white text-[#111827] placeholder:text-[#94A3B8] focus-visible:border-[#FF6B00] focus-visible:ring-[#FF6B00]/25 focus-visible:ring-offset-0';
  const cardClass = 'rounded-xl border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]';

  const skillName = (id: string) => skills.find((s) => s.id === id)?.name ?? id;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#111827]">Candidates</h1>
        <p className="mt-1 text-sm text-[#64748B]">
          {hasFilters
            ? `${data?.total ?? 0} candidate${(data?.total ?? 0) === 1 ? '' : 's'} found`
            : `${data?.total ?? 0} total candidates`}
        </p>
      </div>

      <div className="relative max-w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
        <Input
          placeholder="Search by name, email, company..."
          className={`pl-9 ${fieldClass}`}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      <Card className={cardClass}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-[#111827]">
            <Filter className="h-4 w-4 text-[#FF6B00]" />
            Filters
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-[#FFF7ED] px-2 py-0.5 text-xs font-medium text-[#FF6B00]">{activeFilterCount}</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className={labelClass}>Experience</label>
              <select
                className={selectClass}
                value={draft.experienceRange}
                onChange={(e) => updateDraft('experienceRange', e.target.value)}
              >
                <option value="">Any experience</option>
                {EXPERIENCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Notice Period</label>
              <select
                className={selectClass}
                value={draft.noticeRange}
                onChange={(e) => updateDraft('noticeRange', e.target.value)}
              >
                <option value="">Any notice period</option>
                {NOTICE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Expected Salary Min (₹)</label>
              <Input
                type="number"
                min={0}
                placeholder="e.g. 500000"
                className={fieldClass}
                value={draft.salaryMin}
                onChange={(e) => updateDraft('salaryMin', e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass}>Expected Salary Max (₹)</label>
              <Input
                type="number"
                min={0}
                placeholder="e.g. 1000000"
                className={fieldClass}
                value={draft.salaryMax}
                onChange={(e) => updateDraft('salaryMax', e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass}>Designation</label>
              <select
                className={selectClass}
                value={draft.designation}
                onChange={(e) => updateDraft('designation', e.target.value)}
              >
                <option value="">All designations</option>
                {designations.map((d) => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Application From</label>
              <Input
                type="date"
                className={fieldClass}
                value={draft.applicationFrom}
                onChange={(e) => updateDraft('applicationFrom', e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass}>Application To</label>
              <Input
                type="date"
                className={fieldClass}
                value={draft.applicationTo}
                onChange={(e) => updateDraft('applicationTo', e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass}>Past Company</label>
              <Input
                placeholder="e.g. IBM"
                className={fieldClass}
                value={draft.pastCompany}
                onChange={(e) => updateDraft('pastCompany', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className={labelClass + ' mb-0'}>Skills</label>
              <div className="flex items-center gap-3 text-xs text-[#111827]">
                <label className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="radio"
                    name="skillMatchMode"
                    className="accent-[#FF6B00]"
                    checked={draft.skillMatchMode === 'ALL'}
                    onChange={() => updateDraft('skillMatchMode', 'ALL')}
                  />
                  Match ALL selected skills
                </label>
                <label className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="radio"
                    name="skillMatchMode"
                    className="accent-[#FF6B00]"
                    checked={draft.skillMatchMode === 'ANY'}
                    onChange={() => updateDraft('skillMatchMode', 'ANY')}
                  />
                  Match ANY selected skill
                </label>
              </div>
            </div>
            <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto rounded-xl border border-[#E2E8F0] p-2">
              {skills.length === 0 ? (
                <p className="px-1 py-1 text-xs text-[#64748B]">No skills available in master data.</p>
              ) : (
                skills.map((s) => {
                  const selected = draft.skillIds.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleSkill(s.id)}
                      className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                        selected
                          ? 'border-[#FF6B00] bg-[#FF6B00] text-white'
                          : 'border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#FF6B00] hover:bg-[#FFF7ED] hover:text-[#FF6B00]'
                      }`}
                    >
                      {s.name}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {hasFilters && (
            <div className="flex flex-wrap gap-2">
              {applied.experienceRange && (
                <Badge variant="secondary" className="gap-1 rounded-full bg-[#FFF7ED] text-[#FF6B00] hover:bg-[#FFF7ED]">
                  Experience: {EXPERIENCE_OPTIONS.find((o) => o.value === applied.experienceRange)?.label}
                  <button type="button" onClick={() => removeChip('experienceRange')} aria-label="Remove experience filter">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {applied.noticeRange && (
                <Badge variant="secondary" className="gap-1 rounded-full bg-[#FFF7ED] text-[#FF6B00] hover:bg-[#FFF7ED]">
                  Notice: {NOTICE_OPTIONS.find((o) => o.value === applied.noticeRange)?.label}
                  <button type="button" onClick={() => removeChip('noticeRange')} aria-label="Remove notice filter">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {(applied.salaryMin || applied.salaryMax) && (
                <Badge variant="secondary" className="gap-1 rounded-full bg-[#FFF7ED] text-[#FF6B00] hover:bg-[#FFF7ED]">
                  Salary: {applied.salaryMin ? `₹${Number(applied.salaryMin).toLocaleString('en-IN')}` : '—'}
                  {' – '}
                  {applied.salaryMax ? `₹${Number(applied.salaryMax).toLocaleString('en-IN')}` : '—'}
                  <button type="button" onClick={() => removeChip('salary')} aria-label="Remove salary filter">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {applied.designation && (
                <Badge variant="secondary" className="gap-1 rounded-full bg-[#FFF7ED] text-[#FF6B00] hover:bg-[#FFF7ED]">
                  Designation: {applied.designation}
                  <button type="button" onClick={() => removeChip('designation')} aria-label="Remove designation filter">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {(applied.applicationFrom || applied.applicationTo) && (
                <Badge variant="secondary" className="gap-1 rounded-full bg-[#FFF7ED] text-[#FF6B00] hover:bg-[#FFF7ED]">
                  Applied: {applied.applicationFrom || '…'} → {applied.applicationTo || '…'}
                  <button type="button" onClick={() => removeChip('applicationDate')} aria-label="Remove date filter">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {applied.pastCompany && (
                <Badge variant="secondary" className="gap-1 rounded-full bg-[#FFF7ED] text-[#FF6B00] hover:bg-[#FFF7ED]">
                  Past Company: {applied.pastCompany}
                  <button type="button" onClick={() => removeChip('pastCompany')} aria-label="Remove company filter">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {applied.skillIds.length > 0 && (
                <Badge variant="secondary" className="gap-1 rounded-full bg-[#FFF7ED] text-[#FF6B00] hover:bg-[#FFF7ED]">
                  Skills ({applied.skillMatchMode}): {applied.skillIds.map(skillName).join(', ')}
                  <button type="button" onClick={() => removeChip('skills')} aria-label="Remove skills filter">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="button" className="h-10 rounded-xl bg-[#FF6B00] text-white hover:bg-[#e86000]" onClick={applyFilters}>
              Apply Filters
            </Button>
            <Button type="button" variant="outline" className="h-10 rounded-xl border-[#E2E8F0]" onClick={clearFilters} disabled={!hasFilters && !draft.experienceRange && !draft.noticeRange && !draft.salaryMin && !draft.salaryMax && !draft.designation && !draft.applicationFrom && !draft.applicationTo && !draft.pastCompany && draft.skillIds.length === 0}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-[#64748B]">Loading...</div>
      ) : candidates.length === 0 ? (
        <Card className={cardClass}>
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF7ED]">
              <Users className="h-5 w-5 text-[#FF6B00]" />
            </div>
            <p className="font-semibold text-[#111827]">
              {hasFilters ? 'No candidates match the selected filters.' : 'No candidates found'}
            </p>
            <p className="mt-1 text-sm text-[#64748B]">
              {hasFilters
                ? 'Try adjusting or clearing filters to see more results.'
                : 'Candidates appear here when they apply through the career portal.'}
            </p>
            {hasFilters && (
              <Button type="button" variant="outline" className="mt-4 rounded-xl border-[#E2E8F0]" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {candidates.map((c) => (
              <Card key={c.id} className={`${cardClass} transition-shadow hover:shadow-md`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-[#111827]">{c.firstName} {c.lastName}</h3>
                        <span className="rounded-full border border-[#E2E8F0] bg-white px-2.5 py-0.5 text-xs text-[#64748B]">
                          {c._count.applications} application{c._count.applications !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#64748B]">
                        <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {c.email}</span>
                        {c.currentCompany && (
                          <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" /> {c.currentDesignation ? `${c.currentDesignation} @ ` : ''}{c.currentCompany}</span>
                        )}
                        {c.totalExperience != null && (
                          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {c.totalExperience}y exp</span>
                        )}
                        {c.noticePeriodDays != null && (
                          <span>{c.noticePeriodDays}d notice</span>
                        )}
                        {c.source && <span>via {c.source.name}</span>}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {c.resumeUrl && (
                        <Button variant="ghost" size="icon" title="View Resume" className="h-9 w-9 text-[#64748B] hover:bg-[#FFF7ED] hover:text-[#FF6B00]" asChild>
                          <a href={c.resumeUrl} target="_blank" rel="noreferrer">
                            <FileText className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" title="View" className="h-9 w-9 text-[#64748B] hover:bg-[#FFF7ED] hover:text-[#FF6B00]" asChild>
                        <Link to={`/candidates/${c.id}`}><Eye className="h-4 w-4" /></Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" className="rounded-xl border-[#E2E8F0]" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <span className="text-sm text-[#64748B]">Page {page} of {data.totalPages}</span>
              <Button variant="outline" size="sm" className="rounded-xl border-[#E2E8F0]" disabled={page === data.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

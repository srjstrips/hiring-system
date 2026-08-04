import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { candidatesApi } from '@/api/candidates';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Eye, FileText, Briefcase, Clock, Mail } from 'lucide-react';

export default function CandidatesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['candidates', search, page],
    queryFn: () => candidatesApi.getAll({ search: search || undefined, page, limit: 20 }).then((r) => r.data),
  });

  const candidates = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Candidates</h1>
        <p className="text-sm text-muted-foreground">{data?.total ?? 0} total candidates</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, company..."
          className="pl-9"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : candidates.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <p className="text-4xl mb-3">👤</p>
            <p className="font-medium">No candidates found</p>
            <p className="text-sm mt-1">Candidates appear here when they apply through the career portal.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {candidates.map((c) => (
              <Card key={c.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{c.firstName} {c.lastName}</h3>
                        <Badge variant="outline">{c._count.applications} application{c._count.applications !== 1 ? 's' : ''}</Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1.5 text-sm text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {c.email}</span>
                        {c.currentCompany && (
                          <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> {c.currentDesignation ? `${c.currentDesignation} @ ` : ''}{c.currentCompany}</span>
                        )}
                        {c.totalExperience != null && (
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {c.totalExperience}y exp</span>
                        )}
                        {c.noticePeriodDays != null && (
                          <span>{c.noticePeriodDays}d notice</span>
                        )}
                        {c.source && <span>via {c.source.name}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {c.resumeUrl && (
                        <Button variant="ghost" size="icon" title="View Resume" asChild>
                          <a href={`http://localhost:5000${c.resumeUrl}`} target="_blank" rel="noreferrer">
                            <FileText className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" asChild>
                        <Link to={`/candidates/${c.id}`}><Eye className="h-4 w-4" /></Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <span className="text-sm text-muted-foreground">Page {page} of {data.totalPages}</span>
              <Button variant="outline" size="sm" disabled={page === data.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

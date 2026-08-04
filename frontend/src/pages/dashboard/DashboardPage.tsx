import { Briefcase, Users, Calendar, Gift, UserPlus, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

const STAT_CARDS = [
  { label: 'Open Positions', value: '24', icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50', trend: '+3 this month' },
  { label: 'Total Applications', value: '186', icon: Users, color: 'text-violet-600', bg: 'bg-violet-50', trend: '+12 today' },
  { label: 'Interviews Scheduled', value: '18', icon: Calendar, color: 'text-orange-600', bg: 'bg-orange-50', trend: '5 this week' },
  { label: 'Offers Sent', value: '7', icon: Gift, color: 'text-green-600', bg: 'bg-green-50', trend: '2 pending acceptance' },
  { label: 'Pending Requisitions', value: '5', icon: UserPlus, color: 'text-rose-600', bg: 'bg-rose-50', trend: '3 awaiting approval' },
  { label: 'Avg. Time to Hire', value: '28d', icon: Clock, color: 'text-teal-600', bg: 'bg-teal-50', trend: '-2d vs last month' },
];

const PIPELINE = [
  { stage: 'Applied', count: 186, color: 'bg-slate-500' },
  { stage: 'Screening', count: 94, color: 'bg-blue-500' },
  { stage: 'Shortlisted', count: 52, color: 'bg-violet-500' },
  { stage: 'Interview R1', count: 34, color: 'bg-orange-500' },
  { stage: 'Interview R2', count: 18, color: 'bg-amber-500' },
  { stage: 'HR Round', count: 12, color: 'bg-teal-500' },
  { stage: 'Selected', count: 9, color: 'bg-green-500' },
  { stage: 'Offer Sent', count: 7, color: 'bg-emerald-500' },
  { stage: 'Joined', count: 4, color: 'bg-green-700' },
];

const UPCOMING_INTERVIEWS = [
  { candidate: 'Rahul Sharma', job: 'Senior Software Engineer', time: 'Today, 2:00 PM', type: 'Technical Round 1' },
  { candidate: 'Priya Patel', job: 'Product Manager', time: 'Today, 4:30 PM', type: 'HR Round' },
  { candidate: 'Arjun Singh', job: 'Data Scientist', time: 'Tomorrow, 11:00 AM', type: 'Technical Round 2' },
  { candidate: 'Ananya Rao', job: 'UX Designer', time: 'Tomorrow, 3:00 PM', type: 'Final Round' },
];

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Good {getTimeGreeting()}, {user?.firstName}!
        </h1>
        <p className="text-muted-foreground mt-1">
          Here's what's happening with your hiring pipeline today.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STAT_CARDS.map((card) => (
          <Card key={card.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                  <p className="text-3xl font-bold mt-1">{card.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{card.trend}</p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.bg}`}>
                  <card.icon className={`h-6 w-6 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Pipeline funnel */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Candidate Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {PIPELINE.map((stage) => {
                const pct = Math.round((stage.count / 186) * 100);
                return (
                  <div key={stage.stage} className="flex items-center gap-3">
                    <span className="w-24 text-sm text-muted-foreground shrink-0">{stage.stage}</span>
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${stage.color}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-sm font-medium">{stage.count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming interviews */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Upcoming Interviews</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {UPCOMING_INTERVIEWS.map((item, idx) => (
              <div key={idx} className="flex flex-col gap-1 pb-3 border-b last:border-0 last:pb-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium leading-none">{item.candidate}</p>
                  <Badge variant="secondary" className="text-xs shrink-0">{item.type}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{item.job}</p>
                <p className="text-xs text-blue-600 font-medium">{item.time}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

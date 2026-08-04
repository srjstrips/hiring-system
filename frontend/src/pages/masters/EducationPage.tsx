import { z } from 'zod';
import { MasterPage } from '@/components/common/MasterPage';
import { educationService } from '@/services/master.service';

const createSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  level: z.coerce.number().int().min(1).optional(),
  description: z.string().optional(),
});
const updateSchema = createSchema.partial();

export function EducationPage() {
  return (
    <MasterPage
      title="Education"
      description="Education qualifications — B.Tech, MBA, etc."
      queryKey="education"
      service={educationService as any}
      createSchema={createSchema}
      updateSchema={updateSchema}
      fields={[
        { name: 'name', label: 'Qualification', required: true, placeholder: 'e.g. B.Tech / BE' },
        { name: 'level', label: 'Level', type: 'number', placeholder: 'e.g. 3 (higher = more qualified)' },
        { name: 'description', label: 'Description', type: 'textarea', colSpan: true },
      ]}
      columns={[
        { key: 'name', label: 'Qualification' },
        { key: 'level', label: 'Level', render: (r) => r['level'] ? String(r['level']) : '—' },
      ]}
    />
  );
}

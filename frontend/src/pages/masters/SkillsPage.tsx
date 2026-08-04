import { z } from 'zod';
import { MasterPage } from '@/components/common/MasterPage';
import { skillService } from '@/services/master.service';

const createSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.string().optional(),
  description: z.string().optional(),
});
const updateSchema = createSchema.partial();

export function SkillsPage() {
  return (
    <MasterPage
      title="Skill"
      description="Manage skills used in job requirements and candidate profiles"
      queryKey="skills"
      service={skillService as any}
      createSchema={createSchema}
      updateSchema={updateSchema}
      fields={[
        { name: 'name', label: 'Skill Name', required: true, placeholder: 'e.g. React' },
        { name: 'category', label: 'Category', placeholder: 'e.g. Frontend, Backend, Soft Skills' },
        { name: 'description', label: 'Description', type: 'textarea', colSpan: true },
      ]}
      columns={[
        { key: 'name', label: 'Skill' },
        { key: 'category', label: 'Category', render: (r) => r['category'] as string || '—' },
      ]}
    />
  );
}

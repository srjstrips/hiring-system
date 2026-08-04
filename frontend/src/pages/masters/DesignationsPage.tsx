import { z } from 'zod';
import { MasterPage } from '@/components/common/MasterPage';
import { designationService } from '@/services/master.service';

const createSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required').max(10),
  level: z.coerce.number().int().min(1).max(20).optional(),
  description: z.string().optional(),
});
const updateSchema = createSchema.partial();

export function DesignationsPage() {
  return (
    <MasterPage
      title="Designation"
      description="Manage job designations and levels"
      queryKey="designations"
      service={designationService as any}
      createSchema={createSchema}
      updateSchema={updateSchema}
      fields={[
        { name: 'name', label: 'Designation Name', required: true, placeholder: 'e.g. Senior Engineer' },
        { name: 'code', label: 'Code', required: true, placeholder: 'e.g. SSE' },
        { name: 'level', label: 'Level (1–20)', type: 'number', placeholder: 'e.g. 4' },
        { name: 'description', label: 'Description', type: 'textarea', colSpan: true },
      ]}
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'code', label: 'Code' },
        { key: 'level', label: 'Level', render: (r) => r['level'] ? `L${r['level']}` : '—' },
      ]}
    />
  );
}
